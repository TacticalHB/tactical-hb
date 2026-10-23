import type { Text } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   The online wholesale application (23 Oct 2026) — what it asks, in one pure
   module the form, the server and Admin › Partners all read.

   It replaced the two-page PDF that applicants kept missing. The registration
   form already collects company, contact name, phone, country, city and
   business type; this is everything else the PDF asked, cut to what the
   decision actually uses. REQUIRED: legal name, address, tax/registration
   number, at least one proof document (registration or tax), and the typed
   confirmation. Everything else is optional.
--------------------------------------------------------------------------- */

export const VOLUMES = ["under_10", "10_30", "30_100", "100_plus"] as const;
export type Volume = (typeof VOLUMES)[number];

export const VOLUME_TEXT: Record<Volume, Text> = {
  under_10: { en: "Under 10 units", uk: "До 10 одиниць", ja: "10個未満", ar: "أقل من 10 قطع" },
  "10_30": { en: "10–30 units", uk: "10–30 одиниць", ja: "10〜30個", ar: "10–30 قطعة" },
  "30_100": { en: "30–100 units", uk: "30–100 одиниць", ja: "30〜100個", ar: "30–100 قطعة" },
  "100_plus": { en: "100+ units", uk: "100+ одиниць", ja: "100個以上", ar: "أكثر من 100 قطعة" },
};

export const PRODUCT_INTERESTS = ["bowls", "hmd", "windcovers", "hookahs", "full_range"] as const;
export type ProductInterest = (typeof PRODUCT_INTERESTS)[number];

export const PRODUCT_INTEREST_TEXT: Record<ProductInterest, Text> = {
  bowls: { en: "Bowls", uk: "Чаші", ja: "ボウル", ar: "الرؤوس" },
  hmd: { en: "Heat management devices", uk: "Пристрої для керування жаром", ja: "ヒートマネジメントデバイス", ar: "أجهزة إدارة الحرارة" },
  windcovers: { en: "Wind covers", uk: "Ковпаки", ja: "ウィンドカバー", ar: "أغطية الرياح" },
  hookahs: { en: "Hookahs", uk: "Кальяни", ja: "シーシャ", ar: "الشيشة" },
  full_range: { en: "Full range", uk: "Увесь асортимент", ja: "全ラインナップ", ar: "التشكيلة الكاملة" },
};

export const YEARS = ["under_1", "1_3", "3_10", "10_plus"] as const;
export type Years = (typeof YEARS)[number];

export const YEARS_TEXT: Record<Years, Text> = {
  under_1: { en: "Less than a year", uk: "Менше року", ja: "1年未満", ar: "أقل من سنة" },
  "1_3": { en: "1–3 years", uk: "1–3 роки", ja: "1〜3年", ar: "1–3 سنوات" },
  "3_10": { en: "3–10 years", uk: "3–10 років", ja: "3〜10年", ar: "3–10 سنوات" },
  "10_plus": { en: "Over 10 years", uk: "Понад 10 років", ja: "10年以上", ar: "أكثر من 10 سنوات" },
};

export const DOC_KINDS = ["registration", "tax", "premises", "other"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const DOC_KIND_TEXT: Record<DocKind, Text> = {
  registration: { en: "Company registration", uk: "Реєстрація компанії / ФОП", ja: "会社登記書類", ar: "سجل الشركة" },
  tax: { en: "Tax certificate", uk: "Податкова довідка / витяг", ja: "納税証明書", ar: "الشهادة الضريبية" },
  premises: { en: "Photo of your premises", uk: "Фото закладу чи магазину", ja: "店舗・施設の写真", ar: "صورة للمكان" },
  other: { en: "Anything else", uk: "Інше", ja: "その他", ar: "مستند آخر" },
};

/** The kinds that prove the business exists — at least one is required. */
export const PROOF_KINDS: DocKind[] = ["registration", "tax"];

export const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"];
export const MAX_BYTES = 15 * 1024 * 1024;

export function isVolume(v: unknown): v is Volume {
  return typeof v === "string" && (VOLUMES as readonly string[]).includes(v);
}
export function isYears(v: unknown): v is Years {
  return typeof v === "string" && (YEARS as readonly string[]).includes(v);
}
export function isDocKind(v: unknown): v is DocKind {
  return typeof v === "string" && (DOC_KINDS as readonly string[]).includes(v);
}
export function isProductInterest(v: unknown): v is ProductInterest {
  return typeof v === "string" && (PRODUCT_INTERESTS as readonly string[]).includes(v);
}

/** What the applicant types — every field optional at this level; completeness is checked separately. */
export type ApplicationAnswers = {
  legalName: string;
  address: string;
  taxId: string;
  yearsInBusiness: Years | "";
  website: string;
  expectedVolume: Volume | "";
  productsInterest: ProductInterest[];
  referralSource: string;
  comments: string;
};

export const EMPTY_ANSWERS: ApplicationAnswers = {
  legalName: "",
  address: "",
  taxId: "",
  yearsInBusiness: "",
  website: "",
  expectedVolume: "",
  productsInterest: [],
  referralSource: "",
  comments: "",
};

export type ApplicationDocument = {
  id: string;
  kind: DocKind;
  filename: string;
  sizeBytes: number | null;
  uploadedAt: string;
};

export type Application = ApplicationAnswers & {
  confirmedName: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  documents: ApplicationDocument[];
};

/** Which required things are still missing — empty means it can be sent. */
export type Missing = "legalName" | "address" | "taxId" | "proof" | "confirmation";

export function missingFor(a: ApplicationAnswers, docs: Pick<ApplicationDocument, "kind">[], confirmedName: string): Missing[] {
  const out: Missing[] = [];
  if (!a.legalName.trim()) out.push("legalName");
  if (!a.address.trim()) out.push("address");
  if (!a.taxId.trim()) out.push("taxId");
  if (!docs.some((d) => PROOF_KINDS.includes(d.kind))) out.push("proof");
  if (!confirmedName.trim()) out.push("confirmation");
  return out;
}

/** Field limits, shared by the form and the server. */
export const LIMITS = {
  legalName: 200,
  address: 400,
  taxId: 80,
  website: 300,
  referralSource: 300,
  comments: 2000,
  confirmedName: 120,
  filename: 180,
} as const;
