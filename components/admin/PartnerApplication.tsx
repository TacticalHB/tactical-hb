"use client";

import { useState } from "react";
import { wholesaleDocumentLink } from "@/app/actions/wholesale-admin";
import {
  PRODUCT_INTEREST_TEXT,
  VOLUME_TEXT,
  YEARS_TEXT,
  missingFor,
  type Application,
} from "@/lib/wholesale-application-display";

/* ---------------------------------------------------------------------------
   The online wholesale application on a partner's card (23 Oct 2026): what
   they answered, the documents they uploaded, and whether it is complete.

   Documents open through a link the server signs for five minutes — the
   bucket is private, so there is no permanent URL to leak.
--------------------------------------------------------------------------- */

/** The small header tag: is there anything to review yet? */
export function ApplicationTag({ app, uk }: { app: Application; uk: boolean }) {
  const ready = !!app.completedAt;
  return (
    <span
      className="text-[11px] tracking-[0.1em] uppercase px-2 py-0.5 rounded"
      style={{
        background: ready ? "color-mix(in srgb, var(--console-ok) 16%, transparent)" : "color-mix(in srgb, var(--console-warn) 16%, transparent)",
        color: ready ? "var(--console-ok)" : "var(--console-warn)",
      }}
    >
      {ready ? (uk ? "Готово до розгляду" : "Ready to review") : uk ? "Чекаємо заявку" : "Waiting for application"}
    </span>
  );
}

/* Staff wording, not the applicant's ("Photo of your premises"). */
const ADMIN_DOC: Record<string, { en: string; uk: string }> = {
  registration: { en: "Registration", uk: "Реєстрація" },
  tax: { en: "Tax certificate", uk: "Податкова" },
  premises: { en: "Premises photo", uk: "Фото закладу" },
  other: { en: "Other", uk: "Інше" },
};

export default function PartnerApplication({ app, uk }: { app: Application; uk: boolean }) {
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lang = uk ? "uk" : "en";

  const rows: [string, string][] = (
    [
      [uk ? "Юридична назва" : "Legal name", app.legalName],
      [uk ? "Податковий / реєстр. №" : "Tax / reg. no.", app.taxId],
      [uk ? "Адреса" : "Address", app.address],
      [uk ? "Років на ринку" : "In business", app.yearsInBusiness ? YEARS_TEXT[app.yearsInBusiness][lang] : ""],
      [uk ? "Сайт" : "Website", app.website],
      [uk ? "Обсяг" : "Volume", app.expectedVolume ? VOLUME_TEXT[app.expectedVolume][lang] : ""],
      [uk ? "Цікавить" : "Interested in", app.productsInterest.map((k) => PRODUCT_INTEREST_TEXT[k][lang]).join(", ")],
      [uk ? "Звідки дізналися" : "Heard from", app.referralSource],
      [uk ? "Коментар" : "Comments", app.comments],
      [uk ? "Підтвердив(ла)" : "Confirmed by", app.confirmedName ? `${app.confirmedName} · ${(app.confirmedAt ?? "").slice(0, 10)}` : ""],
    ] as [string, string][]
  ).filter(([, v]) => v && v.trim());

  const missing = app.completedAt ? [] : missingFor(app, app.documents, app.confirmedName ?? "");
  const missingText: Record<string, string> = {
    legalName: uk ? "юридична назва" : "legal name",
    address: uk ? "адреса" : "address",
    taxId: uk ? "податковий номер" : "tax number",
    proof: uk ? "документ про реєстрацію або податковий" : "registration or tax document",
    confirmation: uk ? "підтвердження" : "confirmation",
  };

  async function open(id: string) {
    setError(null);
    setOpening(id);
    const res = await wholesaleDocumentLink(id);
    setOpening(null);
    if (res.ok) window.open(res.url, "_blank", "noopener");
    else setError(uk ? "Не вдалося відкрити документ." : "Couldn't open that document.");
  }

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--console-border)" }}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[11px] tracking-[0.1em] uppercase" style={{ color: "var(--console-faint)" }}>
          {uk ? "Онлайн-заявка" : "Online application"}
        </span>
        <ApplicationTag app={app} uk={uk} />
        {app.completedAt && (
          <span className="text-[12px]" style={{ color: "var(--console-faint)" }}>{app.completedAt.slice(0, 10)}</span>
        )}
      </div>

      {!app.completedAt && missing.length > 0 && (
        <p className="text-[12.5px] mb-2" style={{ color: "var(--console-warn)" }}>
          {uk ? "Ще не заповнено: " : "Still missing: "}
          {missing.map((m) => missingText[m]).join(", ")}
        </p>
      )}

      {rows.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px] mb-2">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt style={{ color: "var(--console-faint)" }}>{k}</dt>
              <dd className="whitespace-pre-wrap" style={{ color: "var(--console-text)" }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}

      {app.documents.length > 0 ? (
        <ul className="flex flex-col gap-1.5 mt-2">
          {app.documents.map((d) => (
            <li key={d.id} className="flex items-center gap-3 text-[13px] flex-wrap">
              <span style={{ color: "var(--console-muted)" }}>{ADMIN_DOC[d.kind][lang]}</span>
              <span className="truncate max-w-[260px]" style={{ color: "var(--console-text)" }}>{d.filename}</span>
              <button
                type="button"
                onClick={() => open(d.id)}
                disabled={opening === d.id}
                className="console-btn console-btn-secondary"
              >
                {opening === d.id ? "…" : uk ? "Відкрити" : "Open"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12.5px]" style={{ color: "var(--console-faint)" }}>
          {uk ? "Документів ще немає." : "No documents uploaded yet."}
        </p>
      )}
      {error && <p className="text-[12.5px] mt-1" style={{ color: "var(--console-alert)" }}>{error}</p>}
    </div>
  );
}
