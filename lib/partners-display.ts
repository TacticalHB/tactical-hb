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
      return { bg: "#e9f2ec", fg: "#4a7c59" };
    case "dormant":
      return { bg: "#fdf3e7", fg: "#9a6b2f" };
    case "rejected":
      return { bg: "#f3f3f4", fg: "#8a8a8d" };
    default:
      // The three pre-order stages read as one family: work in progress.
      return { bg: "#f1efe8", fg: "#6f6d66" };
  }
}

export type Partner = {
  id: string;
  company: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  locale: "en" | "uk";
  status: PartnerStatus;
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
