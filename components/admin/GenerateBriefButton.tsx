"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateBrief } from "@/app/actions/agents";

/* ---------------------------------------------------------------------------
   The "write the brief now" button (§6.5: every Monday, or on demand).

   Generating reads and logs; it sends no email and changes no record beyond
   its own audit rows in agent_runs. The action re-checks admin rights —
   this button is a convenience, not the boundary.
--------------------------------------------------------------------------- */

export default function GenerateBriefButton({ uk }: { uk: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    const res = await generateBrief();
    setBusy(false);
    if (!res.ok) {
      setNote({ text: res.error, bad: true });
      return;
    }
    if (res.warning) setNote({ text: res.warning, bad: true });
    router.refresh();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded px-4 py-2 text-[13.5px] font-medium disabled:opacity-50"
        style={{ background: "var(--console-accent)", color: "#14151a" }}
      >
        {busy ? (uk ? "Готую…" : "Writing…") : uk ? "Сформувати бриф" : "Generate brief"}
      </button>
      {note && (
        <span className="text-[13px]" style={{ color: note.bad ? "var(--console-alert)" : "var(--console-ok)" }}>
          {note.text}
        </span>
      )}
    </div>
  );
}
