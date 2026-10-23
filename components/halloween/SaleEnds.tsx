"use client";

import { t } from "@/lib/i18n-text";
import { halloweenEligible } from "@/lib/halloween";
import { useHalloween } from "@/components/halloween/useHalloween";

/* "Today only · ends 23:59 Kyiv time" under a sale price (31 Oct 2026). On the
   hookah page, the one line that says it is not part of it. Delete with
   lib/halloween. */
export default function SaleEnds({ category, locale }: { category: string; locale: string }) {
  const on = useHalloween();
  if (!on) return null;
  const text = halloweenEligible(category)
    ? t(locale, {
        en: "Halloween −20% · today only, until 23:59 Kyiv time",
        uk: "Halloween −20% · лише сьогодні, до 23:59 за Києвом",
        ja: "ハロウィン −20% · 本日のみ、キエフ時間23:59まで",
        ar: "الهالوين −20% · اليوم فقط، حتى 23:59 بتوقيت كييف",
      })
    : t(locale, {
        en: "Not part of the Halloween sale",
        uk: "Не бере участі в розпродажі Halloween",
        ja: "ハロウィンセールの対象外です",
        ar: "غير مشمول في تخفيضات الهالوين",
      });
  return <p className="text-[13px] mt-1" style={{ color: "#707072" }}>{text}</p>;
}
