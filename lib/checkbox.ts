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

type Shift = { id?: string; status?: string; opened_at?: string };

/* ---------------------------------------------------------------------------
   SHIFTS ARE CLOSED BY US, AND THIS IS WHY (19 Oct 2026).

   The first version never closed a shift, leaving the 24-hour legal deadline
   to Checkbox's auto_close_at. That setting is not on in the cabinet: shift
   #2 opened with the first live order (10 Oct) and stayed open nine days, and
   order TCT-BCWJ4J (18 Oct) was refused with `shift.opened_too_long` — no
   receipt. Ukrainian rules require the shift (and its Z-report) to be closed
   within 24 hours, so closing it IS the compliant act, not a liberty.

   Three layers, any one of which is enough:
   1. Both daily crons call closeStaleShift(): a shift with sales gets its
      Z-report the same day.
   2. ensureShift() closes a shift older than SHIFT_MAX_AGE before selling.
   3. A sale refused with shift.opened_too_long closes, reopens and retries once.
--------------------------------------------------------------------------- */

/** Older than this, a shift is closed before the next sale. Under 24 h on purpose. */
const SHIFT_MAX_AGE_MS = 20 * 60 * 60 * 1000;

const ageMs = (s: Shift | null) => (s?.opened_at ? Date.now() - new Date(s.opened_at).getTime() : 0);

/** Close the current shift (writes the Z-report) and wait until it is CLOSED. */
async function closeShift(tok: string): Promise<void> {
  const closing = await call<Shift>("POST", "/shifts/close", { body: {}, token: tok });
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = closing.id
      ? await call<Shift>("GET", `/shifts/${closing.id}`, { token: tok })
      : await call<Shift | null>("GET", "/cashier/shift", { token: tok });
    if (!s?.status || s.status === "CLOSED") return;
  }
  throw new CheckboxError("shift did not reach CLOSED in time");
}

async function openShift(tok: string): Promise<void> {
  await call<Shift>("POST", "/shifts", { body: { id: crypto.randomUUID() }, token: tok, licence: true });
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const s = await call<Shift | null>("GET", "/cashier/shift", { token: tok });
    if (s?.status === "OPENED") return;
  }
  throw new CheckboxError("shift did not reach OPENED in time");
}

/**
 * Make sure a fresh shift is open: open one if there is none, and close and
 * replace one that has been open too long (see the note above).
 */
async function ensureShift(tok: string, forceNew = false): Promise<void> {
  const current = await call<Shift | null>("GET", "/cashier/shift", { token: tok });
  if (current?.status === "OPENED" && !forceNew && ageMs(current) < SHIFT_MAX_AGE_MS) return;
  if (current?.status === "OPENED") await closeShift(tok);
  await openShift(tok);
}

/**
 * For the daily crons: close the open shift so its Z-report is written within
 * the day. A shift opened in the last few minutes is left alone, so a sale in
 * flight is never cut off mid-receipt. Never throws.
 */
export async function closeStaleShift(): Promise<{ closed: boolean; detail: string }> {
  try {
    if (!process.env.CHECKBOX_LICENSE_KEY || !process.env.CHECKBOX_CASHIER_PIN) {
      return { closed: false, detail: "Checkbox not configured" };
    }
    const tok = await token();
    const current = await call<Shift | null>("GET", "/cashier/shift", { token: tok });
    if (current?.status !== "OPENED") return { closed: false, detail: "no open shift" };
    if (ageMs(current) < 10 * 60 * 1000) return { closed: false, detail: "shift opened under 10 minutes ago" };
    await closeShift(tok);
    return { closed: true, detail: `closed shift opened ${current.opened_at}` };
  } catch (e) {
    return { closed: false, detail: e instanceof Error ? e.message : String(e) };
  }
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
      /* NO order_id. Checkbox's order_id must be a UUID of an order in
         Checkbox's own order module; ours is "TCT-XXXXXX", and sending it made
         the very first live receipt fail with 422 "Невірне значення uuid"
         (TCT-LAS6TL, 10 Oct 2026). The receipt's own id (receiptIdFor, a UUID
         derived from the reference) already ties it to the order. */
      // The e-receipt. NOT shipping — see the header note.
      ...(order.email ? { delivery: { email: order.email } } : {}),
    };

    const sell = () =>
      call<{ id?: string; total_sum?: number }>("POST", "/receipts/sell", { body: payload, token: tok });
    let receipt: { id?: string; total_sum?: number };
    try {
      receipt = await sell();
    } catch (e) {
      // Layer 3: a shift Checkbox calls too old — close it, open a new one, retry once.
      if (!(e instanceof Error) || !/shift\.opened_too_long/.test(e.message)) throw e;
      await ensureShift(tok, true);
      receipt = await sell();
    }

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
