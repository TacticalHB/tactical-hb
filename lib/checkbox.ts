import "server-only";
import { createHash } from "node:crypto";
/* The sums live in their own module so they can be tested without this file's
   `server-only` import and credentials coming with them. Re-exported here so
   every existing caller keeps its import. */
import {
  buildGoods,
  assertBalanced,
  CheckboxBalanceError,
  type Json,
  type FiscalLine,
  type FiscalOrder,
} from "@/lib/checkbox-goods";

export { buildGoods, assertBalanced, CheckboxBalanceError };
export type { FiscalLine, FiscalOrder };

/* ---------------------------------------------------------------------------
   Checkbox PRRO — the fiscal receipt for a paid order.

   VERIFIED AGAINST THE LIVE API (openapi 2.103.0) ON 2 AUGUST 2026, not against
   prose docs, because every one of these details can void a fiscal document:

   • AUTH is signinPinCode, NOT signin. `POST /cashier/signin` takes a login and
     a PASSWORD and answers cashier.invalid_credentials for the cashier PIN;
     `POST /cashier/signinPinCode` takes {pin_code} plus the X-License-Key header
     and returns the bearer token. CHECKBOX_CASHIER_LOGIN is therefore unused by
     this integration — it is kept in env only because the cabinet shows it.

   • CLOUDFLARE fronts the API and answers 403 (error 1010) to requests without a
     browser-ish User-Agent. One is set explicitly below; without it every call
     fails in a way that looks like bad credentials and is not.

   • MONEY IS KOPIYKY, confirmed against Mario's own catalogue: Checkbox lists
     HMD A.Craft at 90000 and the shop sells it at ₴900.

   • QUANTITY IS MILLI-UNITS — 1 item is 1000. This is the one number the spec
     never states outright; the only evidence is a note on GoodDetailsPayload
     .original_price reading "Вартість в копійках за quantity = 1000". It could
     not be proven by experiment because POST /receipts/validate refuses without
     an open shift and then fails on offline codes. IT IS SAFE TO BE WRONG HERE
     AND ONLY HERE: a wrong convention makes the goods total differ from the
     payment by a factor of a thousand, which Checkbox rejects outright, so the
     failure is a refused receipt rather than a false one. assertBalanced() below
     also catches it before the request leaves us.

   • PAYMENT TYPE IS "CASHLESS". "CARD" exists but its schema is literally named
     ObsoleteCardPaymentPayload.

   • NO tax FIELD. The cabinet has exactly one tax (code 8, «Без ПДВ», rate 0)
     and every product in it carries tax: none, which matches the spec's rule
     that the field is omitted for goods that are not objects of taxation.

   • NO DELIVERY LINE, EVER. `delivery` on the sell payload is {email, phone} —
     it is how the electronic receipt reaches the customer, nothing to do with
     shipping. Shipping is absorbed into the goods prices (see buildGoods) per
     the FOP-2 model: the customer buys goods delivered to a destination, and a
     fiscal line named "Доставка" is exactly what that model forbids.
--------------------------------------------------------------------------- */

const BASE = "https://api.checkbox.ua/api/v1";

/** Cloudflare 403s the default fetch agent; this is not optional. */
const CLIENT = { name: "tactical-hb", version: "1.0.0" };

export class CheckboxError extends Error {}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new CheckboxError(`${name} is not set`);
  return v;
}



async function call<T>(
  method: "GET" | "POST",
  path: string,
  opts: { body?: Json; token?: string; licence?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": `${CLIENT.name}/${CLIENT.version}`,
    "X-Client-Name": CLIENT.name,
    "X-Client-Version": CLIENT.version,
  };
  if (opts.licence) headers["X-License-Key"] = env("CHECKBOX_LICENSE_KEY");
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    // Checkbox returns {code, message} in Ukrainian; keep both, they are what a
    // human in admin will actually act on.
    throw new CheckboxError(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/* ---- Session ------------------------------------------------------------- */

let cached: { token: string; expiresAt: number } | null = null;
/** Tokens last longer, but a short cache keeps a burst of orders to one signin. */
const TOKEN_TTL_MS = 20 * 60 * 1000;

async function token(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  const auth = await call<{ access_token?: string }>("POST", "/cashier/signinPinCode", {
    body: { pin_code: env("CHECKBOX_CASHIER_PIN") },
    licence: true,
  });
  if (!auth.access_token) throw new CheckboxError("signinPinCode returned no access_token");
  cached = { token: auth.access_token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return auth.access_token;
}

/* ---- Shift --------------------------------------------------------------- */

type Shift = { id?: string; status?: string };

/**
 * Make sure a shift is open, opening one if not.
 *
 * Auto-open IS supported: POST /shifts (bearer + X-License-Key) returns 202 with
 * status CREATED and the shift becomes OPENED a second or two later, so this
 * polls rather than assuming.
 *
 * IT NEVER CLOSES ONE. Ukrainian rules require a shift to be closed within 24
 * hours, and closing produces a Z-report — that is a decision for whoever runs
 * the till, not for a webhook handler that happens to be last through the door.
 * Checkbox's own auto_close_at handles the legal deadline.
 */
async function ensureShift(tok: string): Promise<void> {
  const current = await call<Shift | null>("GET", "/cashier/shift", { token: tok });
  if (current?.status === "OPENED") return;

  await call<Shift>("POST", "/shifts", { body: { id: crypto.randomUUID() }, token: tok, licence: true });

  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await call<Shift | null>("GET", "/cashier/shift", { token: tok });
    if (s?.status === "OPENED") return;
  }
  throw new CheckboxError("shift did not reach OPENED in time");
}

/* ---- Receipt ------------------------------------------------------------- */

/**
 * A receipt UUID that is a pure function of the order reference.
 *
 * This is the whole idempotency story: Monobank delivers webhooks at least once,
 * and Checkbox rejects a second receipt carrying an id it has already fiscalised.
 * So a retry cannot create a second fiscal document even if our own database
 * check somehow misses.
 */
export function receiptIdFor(reference: string): string {
  const h = createHash("sha256").update(`tactical-hb:receipt:${reference}`).digest("hex");
  // Shape the digest into a v4-looking UUID; only stability matters, not version.
  return [
    h.slice(0, 8),
    h.slice(8, 12),
    `4${h.slice(13, 16)}`,
    ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16) + h.slice(17, 20),
    h.slice(20, 32),
  ].join("-");
}

export type FiscalResult =
  | { ok: true; receiptId: string; alreadyExisted: boolean }
  | { ok: false; error: string };

/**
 * Create the fiscal receipt for a paid order.
 *
 * Never throws: fiscalisation must not be able to undo a payment or block
 * fulfilment (brief rule 10). Every failure comes back as { ok: false } with the
 * text a human needs, and the caller records it for the admin queue.
 */
export async function fiscaliseOrder(order: FiscalOrder): Promise<FiscalResult> {
  const receiptId = receiptIdFor(order.reference);
  try {
    if (order.lines.length === 0) throw new CheckboxError("no lines to fiscalise");

    const goods = buildGoods(order);
    assertBalanced(goods, order.amountKop);

    const tok = await token();
    await ensureShift(tok);

    const payload: Json = {
      id: receiptId,
      cashier_name: process.env.CHECKBOX_CASHIER_NAME || undefined,
      goods,
      payments: [{ type: "CASHLESS", value: order.amountKop, label: "Картка" }],
      order_id: order.reference,
      // The e-receipt. NOT shipping — see the header note.
      ...(order.email ? { delivery: { email: order.email } } : {}),
    };

    const receipt = await call<{ id?: string; total_sum?: number }>("POST", "/receipts/sell", {
      body: payload,
      token: tok,
    });

    // Belt and braces: Checkbox should have refused an unbalanced receipt, but
    // confirm the fiscal document really carries the amount the card was charged.
    if (typeof receipt.total_sum === "number" && receipt.total_sum !== order.amountKop) {
      return {
        ok: false,
        error: `fiscalised total ${receipt.total_sum} ≠ charged ${order.amountKop} — CHECK THE RECEIPT`,
      };
    }

    return { ok: true, receiptId: receipt.id ?? receiptId, alreadyExisted: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Checkbox answers a replayed id with a conflict. That is success: the
    // fiscal document already exists and must not be created twice.
    if (/already exist|already_exist|duplicate|409/i.test(msg)) {
      return { ok: true, receiptId, alreadyExisted: true };
    }
    return { ok: false, error: msg.slice(0, 500) };
  }
}
