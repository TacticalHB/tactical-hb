import type { AppLocale } from "@/i18n/routing";
import type { AccountStatus } from "@/lib/wholesale-display";
import type { PartnerType } from "@/lib/wholesale-prices";
/* ---------------------------------------------------------------------------
   How a wholesale partner reads. Pure and I/O-free, like every *-display
   module: no Supabase client, no server-only. lib/partners-admin.ts does the
   reading; this half decides what the rows mean.
--------------------------------------------------------------------------- */

/** The pipeline, in the order a relationship moves through it (0017). */
export const PARTNER_STATUSES = [
  "lead",
  "contacted",
  "application_sent",
  "active",
  "dormant",
  "rejected",
] as const;

export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export function isPartnerStatus(v: string): v is PartnerStatus {
  return (PARTNER_STATUSES as readonly string[]).includes(v);
}

export function statusLabel(s: PartnerStatus, uk: boolean): string {
  const labels: Record<PartnerStatus, [en: string, uk: string]> = {
    lead: ["Lead", "Лід"],
    contacted: ["Contacted", "На зв'язку"],
    application_sent: ["Application in", "Заявка отримана"],
    active: ["Active", "Активний"],
    dormant: ["Dormant", "Затих"],
    rejected: ["Rejected", "Відхилено"],
  };
  return labels[s][uk ? 1 : 0];
}

/** Chip colours per status — muted, matching the admin palette. */
export function statusTone(s: PartnerStatus): { bg: string; fg: string } {
  switch (s) {
    case "active":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "dormant":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    case "rejected":
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
    default:
      // The three pre-order stages read as one family: work in progress.
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

export type Partner = {
  id: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  /* All four storefronts, not the two this register was born with.
     A partner who applied from /ja must not have their row rewritten to "en"
     the first time somebody edits their country — this column decides which
     language their portal emails go out in. */
  locale: AppLocale;
  status: PartnerStatus;
  /* ---- Portal account (0030) --------------------------------------------
     accountStatus is access control and is a DIFFERENT ladder from status
     above, which is CRM pipeline. See lib/wholesale-display. */
  accountStatus: AccountStatus;
  /** Whether a login is attached at all. A CRM-only row has none. */
  hasLogin: boolean;
  /** Free text the applicant wrote. Never mixed into the admin's `notes`. */
  applicationNote: string | null;
  city: string | null;
  /** As the applicant chose it, e.g. "Shop / Online Retailer". */
  businessType: string | null;
  /** Which price book they buy from — 0034. Null = no prices, cannot submit. */
  partnerType: PartnerType | null;
  /** Who last set the book, and when — 0035. */
  partnerTypeChangedAt: string | null;
  partnerTypeChangedBy: string | null;
  /** Who last moved account_status, and when — 0032. */
  statusChangedAt: string | null;
  statusChangedBy: string | null;
  nextFollowUp: string | null; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;

  /* Derived from linked orders — never stored (0017). */
  orderCount: number;
  lastOrderAt: string | null;
  revenueUah: number;
  /** Unlinked orders whose email matches this partner's. */
  matchingOrders: number;
};

/**
 * A follow-up is due when its date is today or past. `today` comes in as
 * YYYY-MM-DD so the comparison is a plain string compare — no timezone
 * arithmetic to get subtly wrong twice a year.
 */
export function followUpDue(p: Pick<Partner, "nextFollowUp">, today: string): boolean {
  return p.nextFollowUp !== null && p.nextFollowUp <= today;
}

/**
 * Sort for the list: due follow-ups first (oldest debt on top), then the
 * pipeline order, then company name. The page opens on what needs doing.
 */
export function byAttention(today: string) {
  return (a: Partner, b: Partner): number => {
    const dueA = followUpDue(a, today);
    const dueB = followUpDue(b, today);
    if (dueA !== dueB) return dueA ? -1 : 1;
    if (dueA && dueB && a.nextFollowUp !== b.nextFollowUp) {
      return a.nextFollowUp! < b.nextFollowUp! ? -1 : 1;
    }
    const order =
      PARTNER_STATUSES.indexOf(a.status) - PARTNER_STATUSES.indexOf(b.status);
    if (order !== 0) return order;
    return a.company.localeCompare(b.company);
  };
}
