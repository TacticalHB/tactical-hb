import Image from "next/image";
import { t } from "@/lib/i18n-text";

/* ---------------------------------------------------------------------------
   The hookah's materials, beside its exploded view.

   THE DRAWING CARRIES NO ARROWS AND NO PART NUMBERS, on purpose (Mario,
   3 Oct 2026): the part list on the engineering sheets is ours, not the
   customer's. The page says what the thing is made of and how each material
   is finished — five materials, one table — and lets the drawing show where.

   THE IMAGE is the middle exploded view from the BM4T1 drawing set, shaded
   matte black to match the set's own render, with the top and bottom groups
   pulled in toward the body. Transparent WEBP, so it sits on the page's paper.

   THE SWATCH beside each finish is a cue, not a colour claim: four blacks
   that differ only in sheen, so the eye reads "these are different surfaces"
   without the page pretending a screen can show PVD versus anodising.
--------------------------------------------------------------------------- */

type Row = {
  material: Record<"uk" | "en" | "ja" | "ar", string>;
  finish: Record<"uk" | "en" | "ja" | "ar", string>;
  swatch: string; // CSS background for the finish cue
};

const PVD = "radial-gradient(circle at 32% 28%, #6a6e75 0%, #2b2d31 42%, #111214 100%)";
const ANODISED = "radial-gradient(circle at 32% 28%, #3a3a3c 0%, #1b1b1d 55%, #0e0e0f 100%)";
const POM = "radial-gradient(circle at 32% 28%, #2e2e2e 0%, #1a1a1a 60%, #121212 100%)";
const SILICONE = "radial-gradient(circle at 32% 28%, #353535 0%, #1d1d1d 50%, #151515 100%)";

const ROWS: Row[] = [
  {
    material: { en: "304 stainless steel", uk: "Нержавіюча сталь 304", ja: "ステンレス鋼 304", ar: "فولاذ مقاوم للصدأ 304" },
    finish: { en: "Black PVD", uk: "Чорне PVD-покриття", ja: "ブラック PVD", ar: "طلاء PVD أسود" },
    swatch: PVD,
  },
  {
    material: { en: "430 stainless steel", uk: "Нержавіюча сталь 430", ja: "ステンレス鋼 430", ar: "فولاذ مقاوم للصدأ 430" },
    finish: { en: "Black PVD", uk: "Чорне PVD-покриття", ja: "ブラック PVD", ar: "طلاء PVD أسود" },
    swatch: PVD,
  },
  {
    material: { en: "Aluminium", uk: "Алюміній", ja: "アルミニウム", ar: "ألومنيوم" },
    finish: { en: "Black matte, hard anodised", uk: "Чорне матове тверде анодування", ja: "ブラックマット 硬質アルマイト", ar: "أنودة صلبة، أسود مطفأ" },
    swatch: ANODISED,
  },
  {
    material: { en: "POM-C", uk: "POM-C", ja: "POM-C", ar: "POM-C" },
    finish: { en: "Black matte", uk: "Чорна матова поверхня", ja: "ブラックマット", ar: "أسود مطفأ" },
    swatch: POM,
  },
  {
    material: { en: "Custom silicone rubber", uk: "Силікон власної розробки", ja: "特注シリコーンゴム", ar: "مطاط سيليكون مخصص" },
    finish: { en: "Matte finish", uk: "Матова поверхня", ja: "マット仕上げ", ar: "تشطيب مطفأ" },
    swatch: SILICONE,
  },
];

export default function MaterialsTable({ locale }: { locale: string }) {
  const L = {
    kicker: t(locale, { uk: "Матеріали та обробка", en: "Materials & finishes", ja: "素材と仕上げ", ar: "المواد والتشطيبات" }),
    title: t(locale, { uk: "З чого він зроблений", en: "What it's made of", ja: "その素材", ar: "مما صُنع" }),
    lede: t(locale, {
      uk: "П'ять матеріалів, кожен зі своєю обробкою. Нічого зайвого — лише те, що витримує жар, вагу та щоденне використання.",
      en: "Five materials, each with its own finish. Nothing for show — only what stands up to heat, weight and daily use.",
      ja: "5つの素材と、それぞれの仕上げ。見せるためのものはなく、熱と重さ、毎日の使用に耐えるものだけ。",
      ar: "خمس مواد، لكل منها تشطيبها الخاص. لا شيء للزينة — فقط ما يتحمّل الحرارة والوزن والاستخدام اليومي.",
    }),
    material: t(locale, { uk: "Матеріал", en: "Material", ja: "素材", ar: "المادة" }),
    finish: t(locale, { uk: "Обробка / покриття", en: "Treatment / finish", ja: "処理・仕上げ", ar: "المعالجة / التشطيب" }),
    alt: t(locale, {
      uk: "Project KI 06 у розібраному вигляді: тарілка, ручка, трубки, корпус і фітинги",
      en: "Project KI 06, exploded view: tray, handle, pipes, body and fittings",
      ja: "Project KI 06 の分解図：トレイ、ハンドル、パイプ、ボディ、継手",
      ar: "Project KI 06 في منظر مفكك: الصينية والمقبض والأنابيب والجسم والوصلات",
    }),
  };

  return (
    <section className="pt-4 pb-16 md:pb-24" style={{ background: "#ffffff" }} aria-labelledby="materials-title">
      {/* Same white and the same 1100px column as the product block above it. */}
      <div className="page-container"><div className="max-w-[1100px] mx-auto grid gap-10 md:gap-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center">
        <div className="relative mx-auto w-full max-w-[340px] md:max-w-[420px]">
          <Image
            src="/images/hookah/exploded.webp"
            alt={L.alt}
            width={1100}
            height={2678}
            sizes="(min-width: 768px) 420px, 340px"
            unoptimized
            className="w-full h-auto"
          />
        </div>

        <div>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="block h-[2px] w-8" style={{ background: "var(--accent)" }} />
            <span className="text-[11px] tracking-[0.28em] uppercase font-medium" style={{ color: "var(--accent-ink)" }}>
              {L.kicker}
            </span>
          </div>
          <h2 id="materials-title" className="font-display text-5xl md:text-6xl mt-3 leading-none" style={{ color: "var(--text)" }}>
            {L.title}
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {L.lede}
          </p>

          <table className="mt-8 w-full border-collapse text-left" style={{ borderTop: "2px solid var(--accent)" }}>
            <thead>
              <tr>
                <th scope="col" className="w-12 py-3" />
                <th scope="col" className="py-3 pr-4 text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
                  {L.material}
                </th>
                <th scope="col" className="py-3 text-[11px] tracking-[0.2em] uppercase font-medium" style={{ color: "var(--text-muted)" }}>
                  {L.finish}
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr key={i} className="align-top" style={{ borderTop: "1px solid var(--border)" }}>
                  <td className="py-4 tabular-nums text-[15px]" style={{ color: "var(--accent-ink)" }}>
                    {String(i + 1).padStart(2, "0")}
                  </td>
                  <th scope="row" className="py-4 pr-4 text-[16px] md:text-[17px] font-semibold" style={{ color: "var(--text)" }}>
                    {t(locale, r.material)}
                  </th>
                  <td className="py-4 text-[15px]" style={{ color: "var(--text)" }}>
                    <span className="inline-flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="inline-block h-4 w-4 shrink-0 rounded-full"
                        style={{ background: r.swatch, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 0 1px var(--border-strong)" }}
                      />
                      {t(locale, r.finish)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div aria-hidden="true" style={{ borderTop: "1px solid var(--border)" }} />
        </div>
      </div></div>
    </section>
  );
}
