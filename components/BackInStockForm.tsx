"use client";

import { useState } from "react";
import { askBackInStock } from "@/app/actions/back-in-stock";
import { useAuth } from "@/components/AuthContext";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   "Tell me when it's back" — under the out-of-stock note on a product page
   (Mario, 15 Oct 2026). Leaves an email; lib/back-in-stock mails it once,
   the morning after the product is on sale again. A signed-in visitor's
   address is filled in for them.
--------------------------------------------------------------------------- */

type State = "idle" | "sending" | "ok" | "already" | "invalid" | "error";

export default function BackInStockForm({ slug, locale }: { slug: string; locale: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const value = email || user?.email || "";

  const L = {
    label: t(locale, { uk: "Повідомити, коли з'явиться", en: "Tell me when it's back", ja: "再入荷をお知らせ", ar: "أعلمني عند توفّره" }),
    placeholder: t(locale, { uk: "Електронна пошта", en: "Your email", ja: "メールアドレス", ar: "بريدك الإلكتروني" }),
    send: t(locale, { uk: "Повідомити", en: "Notify me", ja: "通知を受け取る", ar: "أعلمني" }),
    ok: t(locale, { uk: "Готово — напишемо, щойно товар повернеться.", en: "Done — we'll email you as soon as it's back.", ja: "登録しました。再入荷しだいメールでお知らせします。", ar: "تم — سنراسلك فور عودته." }),
    already: t(locale, { uk: "Ця адреса вже в списку — напишемо, щойно товар повернеться.", en: "That address is already on the list — we'll email you when it's back.", ja: "このアドレスはすでに登録済みです。再入荷しだいお知らせします。", ar: "هذا العنوان مسجّل بالفعل — سنراسلك عند عودته." }),
    invalid: t(locale, { uk: "Перевірте адресу електронної пошти.", en: "Please check the email address.", ja: "メールアドレスをご確認ください。", ar: "يرجى التحقق من البريد الإلكتروني." }),
    error: t(locale, { uk: "Не вдалося зберегти. Спробуйте ще раз пізніше.", en: "Couldn't save that. Please try again later.", ja: "保存できませんでした。後ほどもう一度お試しください。", ar: "تعذّر الحفظ. يرجى المحاولة لاحقًا." }),
    privacy: t(locale, { uk: "Лише один лист про цей товар. Нічого більше.", en: "One email about this product. Nothing else.", ja: "この商品についてのメールを1通だけお送りします。", ar: "رسالة واحدة عن هذا المنتج فقط." }),
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const website = String(new FormData(e.currentTarget).get("website") ?? "");
    setState("sending");
    const res = await askBackInStock(value, slug, locale, website);
    setState(res === "ok" ? "ok" : res === "already" ? "already" : res === "invalid" ? "invalid" : "error");
  };

  if (state === "ok" || state === "already") {
    return (
      <p className="mt-4 text-[14px] leading-relaxed" role="status" style={{ color: "#2e7d32" }}>
        ✓ {state === "ok" ? L.ok : L.already}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4" noValidate>
      <label htmlFor={`bis-${slug}`} className="block text-[13px] font-medium mb-2" style={{ color: "#111" }}>
        {L.label}
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          id={`bis-${slug}`}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={value}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "invalid" || state === "error") setState("idle");
          }}
          placeholder={L.placeholder}
          className="w-full sm:flex-1 min-w-0 h-12 shrink-0 px-4 rounded-full text-[15px] outline-none bg-white"
          style={{ border: `1px solid ${state === "invalid" ? "#b42318" : "#cacacc"}`, color: "#111" }}
        />
        {/* Honeypot: invisible to people, irresistible to form-filling bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <button
          type="submit"
          disabled={state === "sending" || !value}
          className="h-12 px-6 shrink-0 whitespace-nowrap rounded-full text-[15px] font-medium transition-opacity hover:opacity-85 disabled:opacity-40"
          style={{ background: "#111111", color: "#ffffff" }}
        >
          {state === "sending" ? "…" : L.send}
        </button>
      </div>
      <p className="mt-2 text-[12px]" style={{ color: state === "invalid" || state === "error" ? "#b42318" : "#8a8a8e" }}>
        {state === "invalid" ? L.invalid : state === "error" ? L.error : L.privacy}
      </p>
    </form>
  );
}
