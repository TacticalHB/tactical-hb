"use client";

import { useId, useState } from "react";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   What ships in the Project KI 06 case — Mario's list, 3 Oct 2026.

   A light grey card — the same #f5f5f5 as the photo panels (Mario found the
   first, black version "a bit too rough") — so the orange is the deep weight,
   the one for light surfaces; the bar keeps the bright fill. It
   sits under the description on the hookah page, where the description ends
   on "The personal standard travels in one case, and so does this:".
--------------------------------------------------------------------------- */

type L4 = Record<"uk" | "en" | "ja" | "ar", string>;

const ITEMS: L4[] = [
  { en: "Project KI 06 stem", uk: "Шахта Project KI 06", ja: "Project KI 06 ステム", ar: "جسم Project KI 06" },
  { en: "Tactical mouthpiece", uk: "Тактичний мундштук", ja: "タクティカル マウスピース", ar: "مبسم تكتيكي" },
  { en: "Head sphere", uk: "Верхня сфера", ja: "ヘッドスフィア", ar: "الكرة العلوية" },
  { en: "Mr HB tray", uk: "Тарілка Mr HB", ja: "Mr HB トレイ", ar: "صينية Mr HB" },
  {
    en: "Soft Touch silicone hose TCT branded, plastic spring",
    uk: "Силіконовий шланг Soft Touch з логотипом TCT, пластикова пружина",
    ja: "ソフトタッチ シリコンホース（TCT ロゴ入り）、樹脂スプリング",
    ar: "خرطوم سيليكون Soft Touch بشعار TCT، نابض بلاستيكي",
  },
  { en: "Magnetic connector ×2", uk: "Магнітний конектор ×2", ja: "マグネット コネクター ×2", ar: "موصل مغناطيسي ×2" },
  { en: "Removable diffuser", uk: "Знімний дифузор", ja: "取り外し可能なディフューザー", ar: "ناشر قابل للإزالة" },
  { en: "Safety silicone ring", uk: "Захисне силіконове кільце", ja: "セーフティ シリコンリング", ar: "حلقة سيليكون للأمان" },
  {
    en: "Silicone bowl grommet, base grommet",
    uk: "Силіконовий ущільнювач для чаші, ущільнювач колби",
    ja: "ボウル用 シリコングロメット、ベース グロメット",
    ar: "حشية سيليكون للرأس، حشية القاعدة",
  },
];

export default function CaseContents({ locale }: { locale: string }) {
  /* CLOSED UNTIL PRESSED (Mario, 4 Oct 2026): an orange button opens the
     list — the case is something you open. The list stays in the DOM (hidden)
     so it is still read by search engines and by "find in page". */
  const [open, setOpen] = useState(false);
  const listId = useId();
  const title = t(locale, { en: "In the case", uk: "У кейсі", ja: "ケースの中身", ar: "داخل الحقيبة" });
  return (
    <section aria-label={title} className="mt-8 mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={listId}
        className="w-full flex items-center gap-3 rounded-full px-6 h-14 text-[15px] font-medium transition-colors cursor-pointer"
        style={{ background: open ? "var(--accent-hover)" : "var(--accent)", color: "#111114" }}
      >
        <span className="uppercase tracking-[0.2em] text-[13px]">{title}</span>
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="ms-auto transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none", transitionDuration: "var(--motion-base)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        id={listId}
        hidden={!open}
        className="mt-3 rounded-[18px] px-6 py-4 md:px-7"
        style={{ background: "#f5f5f5", color: "#111" }}
      >
        <ol>
          {ITEMS.map((it, i) => (
            <li
              key={i}
              className="flex items-baseline gap-4 py-2.5"
              style={{ borderTop: i ? "1px solid #e5e5e5" : "none" }}
            >
              <span className="text-[15px] leading-snug tabular-nums w-7 shrink-0" style={{ color: "var(--accent-ink)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[15px] leading-snug">{t(locale, it)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
