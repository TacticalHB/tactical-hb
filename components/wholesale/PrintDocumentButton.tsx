"use client";

/* "Save as PDF" — the browser's own print-to-PDF, in every modern browser
   including Safari. Hidden from the printout itself. */
export default function PrintDocumentButton({ label, back, backHref }: { label: string; back: string; backHref: string }) {
  return (
    <div className="print:hidden flex flex-wrap items-center gap-3 mb-8">
      <button
        type="button"
        onClick={() => window.print()}
        className="h-11 px-6 rounded-full text-[14px] font-medium transition-opacity hover:opacity-85"
        style={{ background: "var(--accent)", color: "#111114" }}
      >
        {label}
      </button>
      <a href={backHref} className="text-[13px] underline underline-offset-4" style={{ color: "#707072" }}>
        {back}
      </a>
    </div>
  );
}
