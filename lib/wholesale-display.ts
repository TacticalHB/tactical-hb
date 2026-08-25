import type { Text } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   Wholesale accounts and requests — the shapes and the words for them.

   Client-safe on purpose: the portal, the admin inbox and the emails all need
   these labels, and only one of those three runs on a server. Nothing here
   reads the database or an environment variable.

   TWO STATUS LADDERS, NEVER MERGED. See 0030 for the full reasoning, but in
   short: `PartnerStatus` (0017) is where the relationship stands and a
   salesperson owns it; `AccountStatus` is whether this login works and it is
   an access decision. A partner can be commercially active and suspended on
   the site at the same time, and that has to be sayable.
--------------------------------------------------------------------------- */

/** Whether this partner's login may do anything. Default-deny: `pending`. */
export const ACCOUNT_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export function isAccountStatus(v: unknown): v is AccountStatus {
  return typeof v === "string" && (ACCOUNT_STATUSES as readonly string[]).includes(v);
}

/**
 * THE ONLY GATE, and it is one line so it can be audited as one line.
 *
 * Everything that shows dealer prices or accepts a request calls this. It is
 * deliberately not `!== "rejected"` or any other negative test — a status this
 * code has never heard of must fail closed, and only an exact match passes.
 */
export function canAccessPortal(status: string | null | undefined): status is "approved" {
  return status === "approved";
}

/** Where a submitted request has got to. Set by staff, never by a partner. */
export const REQUEST_STATUSES = [
  "submitted",
  "contacted",
  "payment_sent",
  "paid",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export function isRequestStatus(v: unknown): v is RequestStatus {
  return typeof v === "string" && (REQUEST_STATUSES as readonly string[]).includes(v);
}

/* The add-ons a line can carry, named exactly as retail names them: the same
   keys as the cart's line options, the same columns as order_items, and the
   same part__ skus in stock. `rubber` is the FEAR 9E418 ring — the product was
   renamed in 0029 and the key deliberately was not, because it is written into
   orders that already exist. */
export type LineAddons = { lid: boolean; rubber: boolean; timer: boolean };

export const NO_ADDONS: LineAddons = { lid: false, rubber: false, timer: false };

export type RequestItem = {
  productSlug: string;
  /** `<slug>` or `<slug>__<variant>` — the same key stock is counted by (0015). */
  sku: string | null;
  /** Colour as the catalogue names it, or null when the product has none. */
  variant: string | null;
  addons: LineAddons;
  /** How the add-ons read at submit time, or null when there are none. */
  optionsLabel: string | null;
  name: string;
  qty: number;
  unitPriceUah: number | null;
  unitPriceEur: number | null;
  lineTotalUah: number | null;
  lineTotalEur: number | null;
};

export type WholesaleRequest = {
  id: string;
  reference: string;
  partnerId: string;
  company: string;
  email: string | null;
  phone: string | null;
  locale: string;
  note: string | null;
  status: RequestStatus;
  subtotalUah: number | null;
  subtotalEur: number | null;
  itemCount: number;
  createdAt: string;
  items: RequestItem[];
};

/** What the portal needs to know about the person looking at it. */
export type PortalPartner = {
  id: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  locale: string;
  accountStatus: AccountStatus;
};

/* ---- Reference ------------------------------------------------------------
   WH-XXXX from a crypto-random alphabet, not a counter. A sequential
   reference tells anyone who receives two of them how much wholesale business
   exists, which is not a thing to put in an email footer. Ambiguous glyphs are
   out of the alphabet because these get read aloud down a phone.
--------------------------------------------------------------------------- */
const REF_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3456789";

export function makeReference(random: (max: number) => number): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[random(REF_ALPHABET.length)];
  return `WH-${out}`;
}

/* ---- Words ----------------------------------------------------------------
   Partner-facing labels carry all four storefronts. The admin console is
   English and Ukrainian only, which is the convention every other admin
   module already follows — see components/admin/ConsoleShell.
--------------------------------------------------------------------------- */

export const ACCOUNT_STATUS_TEXT: Record<AccountStatus, Text> = {
  pending: {
    en: "Under review",
    uk: "На розгляді",
    ja: "審査中",
    ar: "قيد المراجعة",
  },
  approved: {
    en: "Approved",
    uk: "Схвалено",
    ja: "承認済み",
    ar: "معتمَد",
  },
  rejected: {
    en: "Not approved",
    uk: "Не схвалено",
    ja: "承認されませんでした",
    ar: "غير معتمَد",
  },
  suspended: {
    en: "Suspended",
    uk: "Призупинено",
    ja: "一時停止中",
    ar: "موقوف مؤقتًا",
  },
};

export const REQUEST_STATUS_TEXT: Record<RequestStatus, Text> = {
  submitted: {
    en: "Submitted",
    uk: "Надіслано",
    ja: "送信済み",
    ar: "أُرسل",
  },
  contacted: {
    en: "In discussion",
    uk: "На обговоренні",
    ja: "ご相談中",
    ar: "قيد المناقشة",
  },
  payment_sent: {
    en: "Payment details sent",
    uk: "Реквізити надіслано",
    ja: "お支払い案内を送信済み",
    ar: "أُرسلت تفاصيل الدفع",
  },
  paid: {
    en: "Paid",
    uk: "Оплачено",
    ja: "支払い済み",
    ar: "مدفوع",
  },
  cancelled: {
    en: "Cancelled",
    uk: "Скасовано",
    ja: "キャンセル済み",
    ar: "مُلغى",
  },
};

/** Admin console labels — English and Ukrainian, like the rest of the console. */
export const ADMIN_ACCOUNT_STATUS: Record<AccountStatus, { en: string; uk: string }> = {
  pending: { en: "Pending", uk: "Очікує" },
  approved: { en: "Approved", uk: "Схвалено" },
  rejected: { en: "Rejected", uk: "Відхилено" },
  suspended: { en: "Suspended", uk: "Призупинено" },
};

export const ADMIN_REQUEST_STATUS: Record<RequestStatus, { en: string; uk: string }> = {
  submitted: { en: "Submitted", uk: "Надіслано" },
  contacted: { en: "Contacted", uk: "Зв'язалися" },
  payment_sent: { en: "Payment sent", uk: "Реквізити надіслано" },
  paid: { en: "Paid", uk: "Оплачено" },
  cancelled: { en: "Cancelled", uk: "Скасовано" },
};

/** Requests still needing someone to do something. Drives the admin badge. */
export function isOpenRequest(status: RequestStatus): boolean {
  return status === "submitted" || status === "contacted";
}
