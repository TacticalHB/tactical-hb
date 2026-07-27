"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateCampaignPlan } from "@/app/actions/agents";

/* ---------------------------------------------------------------------------
   The "draft next month's plan" button (§6.4).

   Generating reads and logs; it spends nothing and changes no record beyond
   its own audit row in agent_runs. The action re-checks admin rights —
   this button is a convenience, not the boundary.
--------------------------------------------------------------------------- */

export default function GeneratePlanButton({ uk }: { uk: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    const res = await generateCampaignPlan();
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
        {busy ? (uk ? "Планую…" : "Drafting…") : uk ? "Скласти план" : "Draft a plan"}
      </button>
      {note && (
        <span className="text-[13px]" style={{ color: note.bad ? "var(--console-alert)" : "var(--console-ok)" }}>
          {note.text}
        </span>
      )}
    </div>
  );
}
