/* ---------------------------------------------------------------------------
   The vocabulary of projects and exhibitions, and the Savings Coach's
   arithmetic (plan §6.6). Pure and I/O-free, like every *-display module:
   lib/projects-admin.ts gathers the rows; this half decides what they mean.

   THE COACH ONLY ADVISES. Every function here returns words and numbers for
   a page or a brief. Money is set aside (or not) by the founder, in a bank
   this codebase has never heard of; the ledger records those decisions
   after the fact. There is nothing here that could move a hryvnia, and
   nothing that should ever learn how.
--------------------------------------------------------------------------- */

export const PROJECT_STATUSES = [
  "idea",
  "saving",
  "in_progress",
  "done",
  "parked",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export function isProjectStatus(v: string): v is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(v);
}

export function projectStatusLabel(s: ProjectStatus, uk: boolean): string {
  const labels: Record<ProjectStatus, [en: string, uk: string]> = {
    idea: ["Idea", "Ідея"],
    saving: ["Saving", "Накопичення"],
    in_progress: ["In progress", "У роботі"],
    done: ["Done", "Готово"],
    parked: ["Parked", "Відкладено"],
  };
  return labels[s][uk ? 1 : 0];
}

export function projectStatusTone(s: ProjectStatus): { bg: string; fg: string } {
  switch (s) {
    case "saving":
      return { bg: "var(--console-info-soft)", fg: "var(--console-info)" };
    case "in_progress":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "done":
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
    case "parked":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

export const EXHIBITION_STATUSES = [
  "considering",
  "applied",
  "confirmed",
  "attended",
  "skipped",
] as const;

export type ExhibitionStatus = (typeof EXHIBITION_STATUSES)[number];

export function isExhibitionStatus(v: string): v is ExhibitionStatus {
  return (EXHIBITION_STATUSES as readonly string[]).includes(v);
}

export function exhibitionStatusLabel(s: ExhibitionStatus, uk: boolean): string {
  const labels: Record<ExhibitionStatus, [en: string, uk: string]> = {
    considering: ["Considering", "Розглядаємо"],
    applied: ["Applied", "Заявку подано"],
    confirmed: ["Confirmed", "Підтверджено"],
    attended: ["Attended", "Відвідано"],
    skipped: ["Skipped", "Пропущено"],
  };
  return labels[s][uk ? 1 : 0];
}

export function exhibitionStatusTone(s: ExhibitionStatus): { bg: string; fg: string } {
  switch (s) {
    case "confirmed":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "applied":
      return { bg: "var(--console-info-soft)", fg: "var(--console-info)" };
    case "attended":
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
    case "skipped":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  targetBudgetUah: number | null;
  /** The founder's chosen monthly set-aside. The coach compares; never writes. */
  monthlySavingUah: number | null;
  deadline: string | null;
  notes: string | null;
  /** Sum of the project_savings ledger — derived, never stored. */
  savedUah: number;
  createdAt: string;
};

export type SavingsEntry = {
  id: string;
  amountUah: number;
  savedOn: string;
  note: string | null;
};

export type Exhibition = {
  id: string;
  name: string;
  location: string | null;
  startsOn: string | null;
  endsOn: string | null;
  budgetUah: number | null;
  status: ExhibitionStatus;
  notes: string | null;
};

/* ---------------------------------------------------------------------------
   The coach's arithmetic.
--------------------------------------------------------------------------- */

/** Suggested set-asides are rounded UP to this — nobody budgets to ₴7. */
const RATE_STEP_UAH = 100;

export type CoachVerdict =
  | "no_target" // nothing to compute against
  | "funded" // saved ≥ target — done saving
  | "overdue" // deadline passed with money still to find
  | "no_deadline" // target but no date; paced by the chosen rate if any
  | "set_rate" // needs a monthly rate; suggests one
  | "on_track" // chosen rate reaches the target in time
  | "behind"; // chosen rate misses the deadline

export type ProjectAdvice = {
  savedUah: number;
  remainingUah: number | null;
  /** 0–100, capped. Null without a target. */
  progressPct: number | null;
  /** Whole months from `today` through the deadline month, ≥ 0. */
  monthsLeft: number | null;
  /** remaining / monthsLeft, rounded up to ₴100. */
  neededPerMonthUah: number | null;
  /** With no deadline: months to fund at the chosen rate. */
  monthsToFundAtChosen: number | null;
  verdict: CoachVerdict;
};

/** Months from today's month through the deadline's month, inclusive of the
    deadline month: a deadline inside the current month leaves 1 month, not
    0 — there are still days to use. Fully past months go to 0. */
export function monthsBetween(todayIso: string, deadlineIso: string): number {
  const [ty, tm] = [Number(todayIso.slice(0, 4)), Number(todayIso.slice(5, 7))];
  const [dy, dm] = [Number(deadlineIso.slice(0, 4)), Number(deadlineIso.slice(5, 7))];
  return Math.max(0, dy * 12 + dm - (ty * 12 + tm) + 1);
}

const ceilToStep = (n: number) => Math.ceil(n / RATE_STEP_UAH) * RATE_STEP_UAH;

/** One project, judged. `today` is YYYY-MM-DD, passed in so the page and the
    Monday brief give the same answer to the same facts. */
export function coachProject(p: Project, today: string): ProjectAdvice {
  const base: Omit<ProjectAdvice, "verdict"> = {
    savedUah: p.savedUah,
    remainingUah: null,
    progressPct: null,
    monthsLeft: null,
    neededPerMonthUah: null,
    monthsToFundAtChosen: null,
  };

  if (p.targetBudgetUah === null) return { ...base, verdict: "no_target" };

  const remaining = Math.max(0, p.targetBudgetUah - p.savedUah);
  const progressPct = Math.max(
    0,
    Math.min(100, Math.round((p.savedUah / p.targetBudgetUah) * 100))
  );
  const withTarget = { ...base, remainingUah: remaining, progressPct };

  if (remaining === 0) return { ...withTarget, verdict: "funded" };

  if (p.deadline === null) {
    return {
      ...withTarget,
      monthsToFundAtChosen:
        p.monthlySavingUah !== null ? Math.ceil(remaining / p.monthlySavingUah) : null,
      verdict: "no_deadline",
    };
  }

  const monthsLeft = monthsBetween(today, p.deadline);
  if (monthsLeft === 0) return { ...withTarget, monthsLeft, verdict: "overdue" };

  const needed = ceilToStep(remaining / monthsLeft);
  const judged = { ...withTarget, monthsLeft, neededPerMonthUah: needed };

  if (p.monthlySavingUah === null) return { ...judged, verdict: "set_rate" };
  return {
    ...judged,
    verdict: p.monthlySavingUah >= needed ? "on_track" : "behind",
  };
}

/** Projects the coach actively paces — the ones set-asides should exist for. */
export function coachedProjects(projects: Project[]): Project[] {
  return projects.filter(
    (p) => p.status === "idea" || p.status === "saving" || p.status === "in_progress"
  );
}

export type CoachSummary = {
  /** Sum of needed-per-month over paced projects that have a figure. */
  totalNeededPerMonthUah: number;
  projectsCounted: number;
  /** Average margin of the last full months, when finance could say. */
  avgMarginUah: number | null;
};

export function coachSummary(
  projects: Project[],
  today: string,
  avgMarginUah: number | null
): CoachSummary {
  let total = 0;
  let counted = 0;
  for (const p of coachedProjects(projects)) {
    const advice = coachProject(p, today);
    if (advice.neededPerMonthUah !== null) {
      total += advice.neededPerMonthUah;
      counted += 1;
    }
  }
  return { totalNeededPerMonthUah: total, projectsCounted: counted, avgMarginUah };
}

export function verdictLabel(v: CoachVerdict, uk: boolean): string {
  const labels: Record<CoachVerdict, [en: string, uk: string]> = {
    no_target: ["no target set", "ціль не задана"],
    funded: ["funded", "накопичено"],
    overdue: ["deadline passed", "дедлайн минув"],
    no_deadline: ["no deadline", "без дедлайну"],
    set_rate: ["needs a monthly rate", "потрібна місячна сума"],
    on_track: ["on track", "за планом"],
    behind: ["behind", "відстає"],
  };
  return labels[v][uk ? 1 : 0];
}

export function verdictTone(v: CoachVerdict): { bg: string; fg: string } {
  switch (v) {
    case "funded":
    case "on_track":
      return { bg: "var(--console-ok-soft)", fg: "var(--console-ok)" };
    case "behind":
    case "overdue":
      return { bg: "var(--console-alert-soft)", fg: "var(--console-alert)" };
    case "set_rate":
      return { bg: "var(--console-warn-soft)", fg: "var(--console-warn)" };
    default:
      return { bg: "var(--console-panel-2)", fg: "var(--console-muted)" };
  }
}

/** Working list order: what needs money first, the archive last. */
export function byProjectAttention(a: Project, b: Project): number {
  const rank: Record<ProjectStatus, number> = {
    saving: 0,
    in_progress: 1,
    idea: 2,
    parked: 3,
    done: 4,
  };
  const d = rank[a.status] - rank[b.status];
  if (d !== 0) return d;
  const da = a.deadline ?? "9999-12-31";
  const db = b.deadline ?? "9999-12-31";
  if (da !== db) return da.localeCompare(db);
  return a.name.localeCompare(b.name);
}

/** Calendar order: what's ahead first by date, the past at the bottom. */
export function byExhibitionOrder(a: Exhibition, b: Exhibition): number {
  const past = (e: Exhibition) => (e.status === "attended" || e.status === "skipped" ? 1 : 0);
  const d = past(a) - past(b);
  if (d !== 0) return d;
  const da = a.startsOn ?? "9999-12-31";
  const db = b.startsOn ?? "9999-12-31";
  if (past(a) === 1) return db.localeCompare(da);
  if (da !== db) return da.localeCompare(db);
  return a.name.localeCompare(b.name);
}
