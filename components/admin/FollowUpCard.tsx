"use client";

import { useState } from "react";
import { statusLabel, statusTone } from "@/lib/partners-display";
import {
  SEND_COOLDOWN_DAYS,
  draftMailto,
  followUpDraft,
  sendBlock,
  sendErrors,
  type FollowUpCandidate,
  type PartnerMessage,
} from "@/lib/followup-display";
import { sendFollowUpEmail } from "@/app/actions/followups";

/* ---------------------------------------------------------------------------
   One quiet partner, the letter that might wake them, and the gate in front
   of the send button.

   THE GATE HAS THREE STEPS AND ALL THREE ARE THE FOUNDER'S:

   1. Read. The draft is shown in full — it is not summarised, and there is no
      "send suggested letter" shortcut that skips this.
   2. Edit. Subject and body are editable text, and what is edited is what is
      sent; the template is a starting point, not a script (§6.3).
   3. Confirm. Pressing Send does not send. It reveals the exact address the
      letter will go to and asks again. Only the second press calls the action.

   The clipboard and mailto: exits stay exactly as they were. They are not
   legacy — they are the escape hatch when the cooldown is shut, and the only
   route for a partner with no email on file.
--------------------------------------------------------------------------- */

export default function FollowUpCard({
  candidate,
  messages,
  uk,
}: {
  candidate: FollowUpCandidate;
  /** This partner's send history (0023), newest first. Null when the history
      could not be read — which disables sending, because an unknown cooldown
      is not permission. */
  messages: PartnerMessage[] | null;
  uk: boolean;
}) {
  const p = candidate.partner;
  // Draft language starts on the partner's own locale (0017) — what the
  // founder most likely sends — but both are always a click away.
  const [lang, setLang] = useState<"en" | "uk">(p.locale);
  const [copied, setCopied] = useState(false);

  const template = followUpDraft(candidate, lang === "uk");

  // Only the EDITS are state; the untouched letter is derived from the
  // template. So switching language rewrites a draft nobody has touched and
  // leaves an edited one alone, with no effect to synchronise the two — and
  // losing five minutes of someone's writing to a stray click becomes
  // impossible rather than merely unlikely.
  const [override, setOverride] = useState<{ subject: string; body: string } | null>(null);
  const subject = override?.subject ?? template.subject;
  const body = override?.body ?? template.body;
  const edited = override !== null;

  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const tone = statusTone(p.status);
  const errors = sendErrors(uk);
  const history = messages ?? [];
  const historyUnavailable = messages === null;
  const block = sendBlock(history, new Date().toISOString());
  const lastSent = history.find((m) => m.status === "sent") ?? null;
  const canSend = Boolean(p.email) && !block.blocked && !historyUnavailable;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const send = async () => {
    setBusy(true);
    setNote(null);
    const res = await sendFollowUpEmail({
      partnerId: p.id,
      locale: lang,
      subject,
      body,
    });
    setBusy(false);
    setConfirming(false);
    if (res.ok) {
      setNote({
        text: uk ? `Надіслано на ${p.email}` : `Sent to ${p.email}`,
        bad: false,
      });
    } else {
      setNote({ text: errors[res.error] ?? res.error, bad: true });
    }
  };

  const fieldStyle: React.CSSProperties = {
    border: "1px solid var(--console-border)",
    color: "var(--console-text)",
    background: "var(--console-panel-2)",
  };

  return (
    <div
      className="rounded-lg px-5 py-4"
      style={{ border: "1px solid var(--console-border)", background: "var(--console-panel)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
        <span className="text-[15.5px] font-medium" style={{ color: "var(--console-text)" }}>
          {p.company}
        </span>
        <span
          className="text-[11px] font-medium tracking-[0.08em] uppercase rounded px-2 py-0.5"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {statusLabel(p.status, uk)}
        </span>
        <span className="text-[13px]" style={{ color: "var(--console-alert)" }}>
          {uk ? `тиша ${candidate.daysQuiet} дн` : `quiet ${candidate.daysQuiet} days`}
        </span>
        {candidate.alreadyScheduled && (
          <span className="text-[13px]" style={{ color: "var(--console-muted)" }}>
            {uk ? "— вже заплановано у CRM" : "— already scheduled in the CRM"}
          </span>
        )}
      </div>

      <div className="text-[13px] mb-3" style={{ color: "var(--console-muted)" }}>
        {[
          p.contactName,
          p.email ?? (uk ? "без email" : "no email"),
          p.lastOrderAt
            ? `${uk ? "останнє замовлення" : "last order"} ${p.lastOrderAt.slice(0, 10)}`
            : uk
              ? "замовлень не звʼязано"
              : "no orders linked",
        ]
          .filter(Boolean)
          .join(" · ")}
      </div>

      {/* What has already gone to them ---------------------------------- */}
      {lastSent && (
        <div className="text-[13px] mb-3" style={{ color: "var(--console-muted)" }}>
          {uk ? "Останній лист" : "Last letter"}{" "}
          {new Date(lastSent.createdAt).toLocaleDateString(uk ? "uk-UA" : "en-GB", {
            timeZone: "Europe/Kyiv",
            day: "numeric",
            month: "short",
            year: "numeric",
          })}{" "}
          · {lastSent.sentBy}
          {history.length > 1 && (
            <>
              {" "}
              · {history.length} {uk ? "усього" : "in total"}
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mb-2">
        {(["en", "uk"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="rounded px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.08em]"
            style={
              lang === l
                ? { background: "var(--console-accent)", color: "#14151a" }
                : { background: "var(--console-panel-2)", color: "var(--console-muted)" }
            }
          >
            {l}
          </button>
        ))}
        {edited && (
          <button
            onClick={() => {
              setOverride(null);
              setConfirming(false);
            }}
            className="text-[12px] underline underline-offset-2"
            style={{ color: "var(--console-faint)" }}
          >
            {uk ? "Повернути чернетку" : "Reset draft"}
          </button>
        )}
      </div>

      {/* The letter, editable ------------------------------------------- */}
      <div
        className="rounded px-4 py-3 mb-3"
        style={{ background: "var(--console-bg-2)", border: "1px solid var(--console-border)" }}
      >
        <input
          value={subject}
          onChange={(e) => {
            setOverride({ subject: e.target.value, body });
            setConfirming(false);
          }}
          aria-label={uk ? "Тема" : "Subject"}
          className="w-full h-9 px-3 mb-2 text-[13.5px] font-medium rounded outline-none transition-colors focus:border-[color:var(--console-accent-line)]"
          style={fieldStyle}
        />
        <textarea
          value={body}
          onChange={(e) => {
            setOverride({ subject, body: e.target.value });
            setConfirming(false);
          }}
          rows={10}
          aria-label={uk ? "Текст листа" : "Letter"}
          className="w-full px-3 py-2 text-[13.5px] leading-relaxed rounded outline-none resize-y transition-colors focus:border-[color:var(--console-accent-line)]"
          style={fieldStyle}
        />
      </div>

      {/* Exits ----------------------------------------------------------- */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={copy}
          className="rounded px-4 py-2 text-[13.5px] font-medium"
          style={{ border: "1px solid var(--console-border)", color: "var(--console-text)" }}
        >
          {copied ? (uk ? "Скопійовано" : "Copied") : uk ? "Копіювати лист" : "Copy draft"}
        </button>
        {p.email && (
          <a
            href={draftMailto(p.email, { subject, body })}
            className="rounded px-4 py-2 text-[13.5px] font-medium"
            style={{ border: "1px solid var(--console-border)", color: "var(--console-text)" }}
          >
            {uk ? "Відкрити у пошті" : "Open in mail app"}
          </a>
        )}

        {canSend && !confirming && (
          <button
            onClick={() => setConfirming(true)}
            disabled={busy || !subject.trim() || !body.trim()}
            className="rounded px-4 py-2 text-[13.5px] font-medium disabled:opacity-40"
            style={{ background: "var(--console-accent)", color: "#14151a" }}
          >
            {uk ? "Надіслати з системи" : "Send from the system"}
          </button>
        )}
      </div>

      {/* The confirm — the address is shown, not implied ------------------ */}
      {confirming && (
        <div
          className="mt-3 rounded px-4 py-3"
          style={{
            border: "1px solid rgba(212,160,23,0.35)",
            background: "var(--console-warn-soft)",
          }}
        >
          <p className="text-[13.5px] mb-3" style={{ color: "var(--console-warn)" }}>
            {uk ? "Надіслати цей лист на " : "Send this letter to "}
            <strong style={{ color: "var(--console-text)" }}>{p.email}</strong>
            {uk
              ? " зараз? Відповіді прийдуть на Sales-скриньку."
              : " now? Replies come back to the sales inbox."}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={send}
              disabled={busy}
              className="rounded px-4 py-2 text-[13.5px] font-medium disabled:opacity-40"
              style={{ background: "var(--console-accent)", color: "#14151a" }}
            >
              {busy ? (uk ? "Надсилаю…" : "Sending…") : uk ? "Так, надіслати" : "Yes, send it"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded px-4 py-2 text-[13.5px] font-medium"
              style={{ border: "1px solid var(--console-border)", color: "var(--console-text)" }}
            >
              {uk ? "Скасувати" : "Cancel"}
            </button>
          </div>
        </div>
      )}

      {block.blocked && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--console-muted)" }}>
          {uk
            ? `Писали ${block.daysAgo} дн тому — кнопка відкриється через ${SEND_COOLDOWN_DAYS - block.daysAgo} дн. Копія листа працює завжди.`
            : `Written to ${block.daysAgo} days ago — the button reopens in ${SEND_COOLDOWN_DAYS - block.daysAgo} days. Copying the draft always works.`}
        </p>
      )}

      {!p.email && (
        <p className="mt-3 text-[13px]" style={{ color: "var(--console-muted)" }}>
          {uk
            ? "Немає email — надіслати з системи неможливо."
            : "No email on file — the system can't send to this partner."}
        </p>
      )}

      {note && (
        <p
          className="mt-3 text-[13px]"
          style={{ color: note.bad ? "var(--console-alert)" : "var(--console-ok)" }}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
