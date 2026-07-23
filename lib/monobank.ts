import "server-only";
import { createVerify } from "node:crypto";

/* ---------------------------------------------------------------------------
   Monobank Acquiring.

   The token lives in MONOBANK_X_TOKEN and is read here only. It is never
   returned to a caller, never logged, and never reaches the browser — every
   function in this file runs server-side.

   AMOUNTS ARE ALWAYS IN KOPIYKY. Monobank rejects decimals, so every amount
   crossing this boundary is an integer: 500 UAH → 50000. toKopiyky() is the
   only place that conversion happens.
--------------------------------------------------------------------------- */

const API = "https://api.monobank.ua/api/merchant";

/** UAH (ISO 4217). */
export const CCY_UAH = 980;

export class MonobankError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "MonobankError";
  }
}

function token(): string {
  const t = process.env.MONOBANK_X_TOKEN;
  if (!t) throw new MonobankError("MONOBANK_X_TOKEN is not set");
  return t;
}

/** Hryvnia → kopiyky. Rounds, because Monobank will not accept a fraction. */
export function toKopiyky(uah: number): number {
  const kop = Math.round(uah * 100);
  if (!Number.isFinite(kop) || kop <= 0) {
    throw new MonobankError(`Refusing to charge a non-positive amount (${uah} UAH)`);
  }
  return kop;
}

export type BasketItem = {
  name: string;
  qty: number;
  /** Line total in kopiyky. */
  sum: number;
  unit?: string;
  code?: string;
};

export type CreateInvoiceInput = {
  /** Total in kopiyky. Must equal the sum of the basket when one is sent. */
  amountKop: number;
  reference: string;
  destination: string;
  webHookUrl: string;
  basket?: BasketItem[];
  /** Seconds the invoice stays payable. */
  validitySeconds?: number;
  /**
   * Where Monobank returns the customer after payment. Confirmed by Monobank
   * support (not successUrl/failUrl — only this). Cosmetic: the webhook, not
   * this redirect, is the source of truth for fulfilment.
   */
  redirectUrl?: string;
};

export type CreatedInvoice = { invoiceId: string; pageUrl: string };

export async function createInvoice(input: CreateInvoiceInput): Promise<CreatedInvoice> {
  const body: Record<string, unknown> = {
    amount: input.amountKop,
    ccy: CCY_UAH,
    validity: input.validitySeconds ?? 3600,
    webHookUrl: input.webHookUrl,
    merchantPaymInfo: {
      reference: input.reference,
      destination: input.destination,
      // Sent only when it reconciles exactly with `amount` — see the caller.
      ...(input.basket?.length ? { basketOrder: input.basket } : {}),
    },
    // Return the customer to our own success page after payment.
    ...(input.redirectUrl ? { redirectUrl: input.redirectUrl } : {}),
  };

  const res = await fetch(`${API}/invoice/create`, {
    method: "POST",
    headers: { "X-Token": token(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    // Monobank's error text can contain the request echo; log it but never the token.
    throw new MonobankError(`invoice/create failed: ${text.slice(0, 300)}`, res.status);
  }

  const json = JSON.parse(text) as { invoiceId?: string; pageUrl?: string };
  if (!json.invoiceId || !json.pageUrl) {
    throw new MonobankError(`invoice/create returned no pageUrl: ${text.slice(0, 200)}`);
  }
  return { invoiceId: json.invoiceId, pageUrl: json.pageUrl };
}

export type InvoiceStatus = {
  invoiceId: string;
  status: string;
  amount?: number;
  ccy?: number;
  reference?: string;
  failureReason?: string;
};

/**
 * Ask Monobank directly what happened to an invoice.
 *
 * The webhook is verified by signature, but this is the authoritative answer:
 * we act on what Monobank tells us when WE ask, not on what arrived at our door.
 */
export async function getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus> {
  const res = await fetch(`${API}/invoice/status?invoiceId=${encodeURIComponent(invoiceId)}`, {
    headers: { "X-Token": token() },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new MonobankError(`invoice/status failed: ${text.slice(0, 200)}`, res.status);
  return JSON.parse(text) as InvoiceStatus;
}

/* ---- Webhook signature -----------------------------------------------------
   Monobank signs the raw request body with ECDSA/SHA256. We verify against the
   merchant public key from their API. The key is cached because it changes
   rarely; a verification failure refetches once, so a rotated key recovers by
   itself rather than rejecting every webhook until redeploy.
--------------------------------------------------------------------------- */

let cachedKeyPem: string | null = null;

async function fetchPublicKeyPem(): Promise<string> {
  const res = await fetch(`${API}/pubkey`, { headers: { "X-Token": token() }, cache: "no-store" });
  const text = await res.text();
  if (!res.ok) throw new MonobankError(`pubkey failed: ${text.slice(0, 200)}`, res.status);
  const { key } = JSON.parse(text) as { key?: string };
  if (!key) throw new MonobankError("pubkey response contained no key");
  // The API returns the PEM base64-encoded.
  return Buffer.from(key, "base64").toString("utf8");
}

function verifyWith(pem: string, rawBody: string, signatureBase64: string): boolean {
  try {
    return createVerify("SHA256").update(rawBody, "utf8").verify(pem, signatureBase64, "base64");
  } catch {
    // Malformed key or signature — treat as "not verified", never as an error
    // the caller might mistake for success.
    return false;
  }
}

/**
 * True only when `rawBody` genuinely came from Monobank.
 *
 * `rawBody` must be the untouched request text. Re-serialising the parsed JSON
 * changes key order and whitespace, and the signature will never match.
 */
export async function verifyWebhookSignature(rawBody: string, signatureBase64: string | null): Promise<boolean> {
  if (!signatureBase64) return false;

  if (!cachedKeyPem) cachedKeyPem = await fetchPublicKeyPem();
  if (verifyWith(cachedKeyPem, rawBody, signatureBase64)) return true;

  // Key may have rotated — refetch once and retry before giving up.
  cachedKeyPem = await fetchPublicKeyPem();
  return verifyWith(cachedKeyPem, rawBody, signatureBase64);
}

/** True when Monobank considers the money taken. */
export const isPaid = (status: string): boolean => status === "success";

/** True when the invoice can never be paid, so the payment row can be closed. */
export const isDead = (status: string): boolean =>
  status === "failure" || status === "expired" || status === "reversed";
