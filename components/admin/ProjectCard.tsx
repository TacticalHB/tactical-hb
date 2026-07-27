"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addSavingsEntry, deleteProject, updateProject } from "@/app/actions/projects";
import {
  PROJECT_STATUSES,
  projectStatusLabel,
  projectStatusTone,
  verdictLabel,
  verdictTone,
  type Project,
  type ProjectAdvice,
  type ProjectStatus,
  type SavingsEntry,
} from "@/lib/projects-display";
import { formatUah } from "@/lib/stock-display";

/* ---------------------------------------------------------------------------
   One project: the reading row with the coach's verdict and a progress bar,
   and underneath it (opened on demand) the editing surface, the deposit
   form, and the recent ledger.

   The coach's advice arrives as a prop, computed server-side from the same
   `today` the whole page uses — this card only displays it. Recording a
   deposit is the founder writing down a transfer already made at the bank;
   the negative sign is allowed because raided funds deserve honest books.
--------------------------------------------------------------------------- */

export default function ProjectCard({
  project,
  advice,
  entries,
  today,
  uk,
}: {
  project: Project;
  advice: ProjectAdvice;
  entries: SavingsEntry[];
  today: string;
  uk: boolean;
}) {
  const router = useRouter();
  const p = project;

  const [open, setOpen] = useState(false);

  const [name, setName] = useState(p.name);
  const [status, setStatus] = useState<ProjectStatus>(p.status);
  const [targetBudgetUah, setTargetBudgetUah] = useState(
    p.targetBudgetUah === null ? "" : String(p.targetBudgetUah)
  );
  const [monthlySavingUah, setMonthlySavingUah] = useState(
    p.monthlySavingUah === null ? "" : String(p.monthlySavingUah)
  );
  const [deadline, setDeadline] = useState(p.deadline ?? "");
  const [notes, setNotes] = useState(p.notes ?? "");

  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState(today);
  const [depositNote, setDepositNote] = useState("");

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const tone = projectStatusTone(p.status);
  const vTone = verdictTone(advice.verdict);

  const L = {
    edit: uk ? "Редагувати" : "Edit",
    close: uk ? "Згорнути" : "Close",
    save: uk ? "Зберегти" : "Save",
    saved: uk ? "Збережено" : "Saved",
    name: uk ? "Назва" : "Name",
    target: uk ? "Ціль, ₴" : "Target, ₴",
    monthly: uk ? "Щомісяця, ₴" : "Monthly, ₴",
    deadline: uk ? "Дедлайн" : "Deadline",
    notes: uk ? "Нотатки" : "Notes",
    record: uk ? "Записати" : "Record",
    depositTitle: uk
      ? "Записати відкладене (від'ємне = зняття)"
      : "Record a set-aside (negative = withdrawal)",
    amount: "₴",
    note: uk ? "Нотатка" : "Note",
    ledger: uk ? "Останні записи" : "Recent entries",
    noLedger: uk ? "Ще нічого не відкладено." : "Nothing set aside yet.",
    remove: uk ? "Видалити проєкт" : "Delete project",
    confirmRemove: uk
      ? `Видалити «${p.name}» разом з журналом накопичень (${formatUah(p.savedUah)})? Це незворотно.`
      : `Delete “${p.name}” and its savings ledger (${formatUah(p.savedUah)})? There is no undo.`,
  };

  const errors: Record<string, string> = {
    no_name: uk ? "Вкажіть назву проєкту." : "Enter a name for the project.",
    bad_amount: uk ? "Перевірте суму." : "Check the amount.",
    bad_date: uk ? "Перевірте дату." : "Check the date.",
    not_found: uk ? "Проєкт не знайдено." : "Project not found.",
  };

  async function onSave() {
    setBusy("save");
    setError(null);
    setInfo(null);
    const res = await updateProject(p.id, {
      name,
      status,
      targetBudgetUah,
      monthlySavingUah,
      deadline,
      notes,
    });
    setBusy(null);
    if (res.ok) {
      setInfo(L.saved);
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  async function onDeposit() {
    setBusy("deposit");
    setError(null);
    setInfo(null);
    const res = await addSavingsEntry(p.id, {
      amountUah: depositAmount,
      savedOn: depositDate,
      note: depositNote,
    });
    setBusy(null);
    if (res.ok) {
      setDepositAmount("");
      setDepositNote("");
      router.refresh();
    } else {
      setError(errors[res.error] ?? res.error);
    }
  }

  async function onDelete() {
    if (!window.confirm(L.confirmRemove)) return;
    setBusy("delete");
    setError(null);
    setInfo(null);
    const res = await deleteProject(p.id);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(errors[res.error] ?? res.error);
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };
  const inputClass =
    "h-9 px-3 text-[13px] rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]";

  const adviceLine = (() => {
    switch (advice.verdict) {
      case "no_target":
        return uk
          ? "Задайте ціль, і коуч порахує решту."
          : "Set a target and the coach can do the rest.";
      case "funded":
        return uk ? "Ціль накопичено — можна починати." : "Target reached — ready to start.";
      case "overdue":
        return uk
          ? `Дедлайн минув, бракує ${formatUah(advice.remainingUah ?? 0)}.`
          : `The deadline has passed with ${formatUah(advice.remainingUah ?? 0)} still to find.`;
      case "no_deadline":
        return advice.monthsToFundAtChosen !== null
          ? uk
            ? `Без дедлайну: за ${formatUah(p.monthlySavingUah ?? 0)}/міс ціль — через ${advice.monthsToFundAtChosen} міс.`
            : `No deadline: at ${formatUah(p.monthlySavingUah ?? 0)}/mo the target is ${advice.monthsToFundAtChosen} months away.`
          : uk
            ? "Без дедлайну і місячної суми — темп не порахувати."
            : "No deadline and no monthly rate — nothing to pace against.";
      case "set_rate":
        return uk
          ? `Потрібно ≈ ${formatUah(advice.neededPerMonthUah ?? 0)}/міс (${advice.monthsLeft} міс до дедлайну).`
          : `Needs ≈ ${formatUah(advice.neededPerMonthUah ?? 0)}/mo (${advice.monthsLeft} months to the deadline).`;
      case "on_track":
        return uk
          ? `${formatUah(p.monthlySavingUah ?? 0)}/міс покриває потрібні ${formatUah(advice.neededPerMonthUah ?? 0)}/міс.`
          : `${formatUah(p.monthlySavingUah ?? 0)}/mo covers the needed ${formatUah(advice.neededPerMonthUah ?? 0)}/mo.`;
      case "behind":
        return uk
          ? `Потрібно ${formatUah(advice.neededPerMonthUah ?? 0)}/міс, задано лише ${formatUah(p.monthlySavingUah ?? 0)}.`
          : `Needs ${formatUah(advice.neededPerMonthUah ?? 0)}/mo, but the rate is ${formatUah(p.monthlySavingUah ?? 0)}.`;
    }
  })();

  return (
    <div style={{ borderTop: "1px solid var(--console-border)" }}>
      {/* Reading row ---------------------------------------------------- */}
      <div className="px-5 py-3">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13.5px]">
          <span className="font-medium" style={{ color: "var(--console-text)" }}>
            {p.name}
          </span>
          <span
            className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {projectStatusLabel(p.status, uk)}
          </span>
          <span
            className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
            style={{ background: vTone.bg, color: vTone.fg }}
          >
            {verdictLabel(advice.verdict, uk)}
          </span>
          <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
            {formatUah(p.savedUah)}
            {p.targetBudgetUah !== null && (
              <span style={{ color: "var(--console-faint)" }}> / {formatUah(p.targetBudgetUah)}</span>
            )}
          </span>
          {p.deadline && (
            <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
              {uk ? "до" : "by"} {p.deadline}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="ml-auto text-[12.5px] underline-offset-2 hover:underline"
            style={{ color: "var(--console-muted)" }}
          >
            {open ? L.close : L.edit}
          </button>
        </div>

        {advice.progressPct !== null && (
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--console-panel-2)" }}
            role="progressbar"
            aria-valuenow={advice.progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${advice.progressPct}%`,
                background: advice.verdict === "behind" || advice.verdict === "overdue" ? "var(--console-alert)" : "var(--console-ok)",
              }}
            />
          </div>
        )}

        <p className="mt-1.5 text-[12.5px]" style={{ color: "var(--console-muted)" }}>
          {adviceLine}
        </p>
      </div>

      {/* Editing surface ------------------------------------------------- */}
      {open && (
        <div className="px-5 pb-4">
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.name}
              autoComplete="off"
              aria-label={`${L.name} — ${p.name}`}
              className={`${inputClass} w-[220px] flex-1 min-w-[180px]`}
              style={inputStyle}
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              aria-label={`Status — ${p.name}`}
              className={inputClass}
              style={inputStyle}
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {projectStatusLabel(s, uk)}
                </option>
              ))}
            </select>
            <input
              value={targetBudgetUah}
              onChange={(e) => setTargetBudgetUah(e.target.value)}
              placeholder={L.target}
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${L.target} — ${p.name}`}
              className={`${inputClass} w-[110px] tabular-nums`}
              style={inputStyle}
            />
            <input
              value={monthlySavingUah}
              onChange={(e) => setMonthlySavingUah(e.target.value)}
              placeholder={L.monthly}
              inputMode="decimal"
              autoComplete="off"
              aria-label={`${L.monthly} — ${p.name}`}
              className={`${inputClass} w-[120px] tabular-nums`}
              style={inputStyle}
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              aria-label={`${L.deadline} — ${p.name}`}
              className={inputClass}
              style={inputStyle}
            />
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={L.notes}
              autoComplete="off"
              aria-label={`${L.notes} — ${p.name}`}
              className={`${inputClass} flex-1 min-w-[180px]`}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={onSave}
              disabled={busy !== null}
              className="h-9 px-4 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-default"
              style={{ background: "var(--console-accent)", color: "#14151a" }}
            >
              {busy === "save" ? "…" : L.save}
            </button>
          </div>

          {/* Deposit ------------------------------------------------------ */}
          <div className="mt-4">
            <div className="text-[12px] font-medium mb-1.5" style={{ color: "var(--console-muted)" }}>
              {L.depositTitle}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder={L.amount}
                inputMode="decimal"
                autoComplete="off"
                aria-label={`${L.depositTitle} — ${p.name}`}
                className={`${inputClass} w-[110px] tabular-nums`}
                style={inputStyle}
              />
              <input
                type="date"
                value={depositDate}
                max={today}
                onChange={(e) => setDepositDate(e.target.value)}
                aria-label={`${uk ? "Дата" : "Date"} — ${p.name}`}
                className={inputClass}
                style={inputStyle}
              />
              <input
                value={depositNote}
                onChange={(e) => setDepositNote(e.target.value)}
                placeholder={L.note}
                autoComplete="off"
                aria-label={`${L.note} — ${p.name}`}
                className={`${inputClass} w-[180px]`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={onDeposit}
                disabled={busy !== null || !depositAmount.trim()}
                className="h-9 px-3 text-[13px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ border: "1px solid var(--console-border)", color: "var(--console-text)", background: "transparent" }}
              >
                {busy === "deposit" ? "…" : L.record}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={busy !== null}
                className="ml-auto h-9 px-3 text-[12.5px] rounded transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ border: "1px solid rgba(196,92,92,0.4)", color: "var(--console-alert)", background: "transparent" }}
              >
                {busy === "delete" ? "…" : L.remove}
              </button>
            </div>
          </div>

          {(info || error) && (
            <p className="mt-2 text-[12px]" style={{ color: error ? "var(--console-alert)" : "var(--console-ok)" }}>
              {error ?? info}
            </p>
          )}

          {/* Ledger -------------------------------------------------------- */}
          <div className="mt-4">
            <div className="text-[12px] font-medium mb-1" style={{ color: "var(--console-muted)" }}>
              {L.ledger}
            </div>
            {entries.length === 0 && (
              <p className="text-[12.5px]" style={{ color: "var(--console-faint)" }}>
                {L.noLedger}
              </p>
            )}
            {entries.slice(0, 6).map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1 text-[12.5px]"
              >
                <span className="tabular-nums" style={{ color: "var(--console-muted)" }}>
                  {e.savedOn}
                </span>
                <span
                  className="tabular-nums font-medium"
                  style={{ color: e.amountUah < 0 ? "var(--console-alert)" : "var(--console-ok)" }}
                >
                  {e.amountUah < 0 ? "−" : "+"}
                  {formatUah(Math.abs(e.amountUah))}
                </span>
                {e.note && <span style={{ color: "var(--console-faint)" }}>{e.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
