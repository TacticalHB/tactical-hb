"use client";

import { useState } from "react";
import { statusLabel, statusTone } from "@/lib/partners-display";
import { followUpDraft, draftMailto, type FollowUpCandidate } from "@/lib/followup-display";

/* ---------------------------------------------------------------------------
   One quiet partner and the letter that might wake them.

   NOTHING HERE SENDS. The two exits are the clipboard and a mailto: link,
   and both end in the founder's own mail client, where the mail is read,
   edited, addressed and sent — or not — by a human. That is the whole
   approval gate, and it is airtight precisely because there is no code past
   it: this component has no action import at all.
--------------------------------------------------------------------------- */

export default function FollowUpCard({ candidate, uk }: { candidate: FollowUpCandidate; uk: boolean }) {
  const p = candidate.partner;
  // Draft language starts on the partner's own locale (0017) — what the
  // founder most likely sends — but both are always a click away.
  const [lang, setLang] = useState<"en" | "uk">(p.locale);
  const [copied, setCopied] = useState(false);

  const draft = followUpDraft(candidate, lang === "uk");
  const tone = statusTone(p.status);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${draft.subject}\n\n${draft.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-lg px-5 py-4" style={{ border: "1px solid var(--border)", background: "#fff" }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
        <span className="text-[15.5px] font-medium" style={{ color: "#111" }}>
          {p.company}
        </span>
        <span
          className="text-[11px] font-medium tracking-[0.08em] uppercase rounded px-2 py-0.5"
          style={{ background: tone.bg, color: tone.fg }}
        >
          {statusLabel(p.status, uk)}
        </span>
        <span className="text-[13px]" style={{ color: "#96322c" }}>
          {uk
            ? `тиша ${candidate.daysQuiet} дн`
            : `quiet ${candidate.daysQuiet} days`}
        </span>
        {candidate.alreadyScheduled && (
          <span className="text-[13px]" style={{ color: "#707072" }}>
            {uk ? "— вже заплановано у CRM" : "— already scheduled in the CRM"}
          </span>
        )}
      </div>

      <div className="text-[13px] mb-3" style={{ color: "#707072" }}>
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

      <div className="flex items-center gap-2 mb-2">
        {(["en", "uk"] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className="rounded px-2.5 py-1 text-[12px] font-medium uppercase tracking-[0.08em]"
            style={
              lang === l
                ? { background: "var(--ink)", color: "#fff" }
                : { background: "#f1f0ee", color: "#707072" }
            }
          >
            {l}
          </button>
        ))}
      </div>

      <div className="rounded px-4 py-3 mb-3" style={{ background: "#f7f6f4", border: "1px solid var(--border)" }}>
        <div className="text-[13.5px] font-medium mb-2" style={{ color: "#111" }}>
          {draft.subject}
        </div>
        <pre
          className="text-[13.5px] whitespace-pre-wrap font-[inherit] m-0"
          style={{ color: "#3a3a3c" }}
        >
          {draft.body}
        </pre>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={copy}
          className="rounded px-4 py-2 text-[13.5px] font-medium"
          style={{ background: "var(--ink)", color: "#fff" }}
        >
          {copied ? (uk ? "Скопійовано" : "Copied") : uk ? "Копіювати лист" : "Copy draft"}
        </button>
        {p.email && (
          <a
            href={draftMailto(p.email, draft)}
            className="rounded px-4 py-2 text-[13.5px] font-medium"
            style={{ border: "1px solid var(--border-strong)", color: "#111" }}
          >
            {uk ? "Відкрити у пошті" : "Open in mail app"}
          </a>
        )}
      </div>
    </div>
  );
}
