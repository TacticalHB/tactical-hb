"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export default function WholesaleForm() {
  const t = useTranslations("wholesale");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center h-64 border border-[#c9a84c]/20 bg-[#0d0d0d]">
        <p className="text-[#c9a84c] tracking-wider text-sm">{t("form_success")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {[
        { name: "name", label: t("form_name"), type: "text" },
        { name: "company", label: t("form_company"), type: "text" },
        { name: "email", label: t("form_email"), type: "email" },
        { name: "country", label: t("form_country"), type: "text" },
      ].map((field) => (
        <div key={field.name}>
          <label className="block text-xs tracking-wider text-[#555] uppercase mb-2">
            {field.label}
          </label>
          <input
            type={field.type}
            name={field.name}
            required
            className="w-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#f5f5f5] px-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c] transition-colors"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs tracking-wider text-[#555] uppercase mb-2">
          {t("form_message")}
        </label>
        <textarea
          name="message"
          rows={5}
          required
          className="w-full bg-[#0d0d0d] border border-[#1a1a1a] text-[#f5f5f5] px-4 py-3 text-sm focus:outline-none focus:border-[#c9a84c] transition-colors resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#c9a84c] text-black font-semibold px-8 py-4 text-sm tracking-widest uppercase hover:bg-[#e8c97a] transition-colors disabled:opacity-50"
      >
        {loading ? "..." : t("form_submit")}
      </button>
    </form>
  );
}
