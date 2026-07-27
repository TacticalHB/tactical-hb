"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateMarginReport } from "@/app/actions/agents";

/* ---------------------------------------------------------------------------
   The "check the margins" button (§6.2).

   Running reads the finance views and logs one audit row. It changes no price,
   enters no cost and sends nothing — the action re-checks admin rights, and
   this button is a convenience, not the boundary.
--------------------------------------------------------------------------- */

export default function GenerateMarginButton({ uk }: { uk: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const run = async () => {
    setBusy(true);
    setNote(null);
    const res = await generateMarginReport();
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
      <button onClick={run} disabled={busy} className="console-btn console-btn-primary">
        {busy ? (uk ? "Рахую…" : "Checking…") : uk ? "Перевірити маржу" : "Check margins"}
      </button>
      {note && (
        <span
          className="text-[13px]"
          style={{ color: note.bad ? "var(--console-alert)" : "var(--console-ok)" }}
        >
          {note.text}
        </span>
      )}
    </div>
  );
}
