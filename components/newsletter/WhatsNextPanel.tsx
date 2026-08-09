import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

/* ---------------------------------------------------------------------------
   The kit-logic panel in the newsletter rail.

   IT REPLACED A PLACEHOLDER. The rail used to hold a dark plate carrying a
   faint TCT watermark and the words PREMIUM CRAFT — borrowed from the About
   page, by my own admission, so the column would not look empty. This says
   something instead.

   THE PICTURE IS WHAT THE LIST IS ABOUT. W1's own bullets promise the
   practical kit logic — bowl → heat device → wind cover — and W2 is entirely
   about it. A product hero would have been a photo they can see on any product
   page; this is the argument the list exists to make, and it points at /setup,
   which is a better next click than anything else in the rail.

   THE COPY HAS TO BE TRUE BEFORE AND AFTER SIGNING UP, which is why it does
   not say the first email has already landed. That is only true in the second
   after the form is submitted, and this panel is on the page the whole time.

   NO NEW ARTWORK. The three hairline ghosts are the setup builder's own, and
   they sit on #F5F5F5 — the catalogue's studio plate, baked into the PNGs
   themselves, and the same literal the products grid and the PDP gallery set
   behind a product photo. NOT var(--bg-card), which is the page's warm cream
   and would leave a visible seam around each tile.
--------------------------------------------------------------------------- */

const STEPS = [
  { key: "bowl", src: "/setup/ghost-bowl-hairline.png" },
  { key: "hmd", src: "/setup/ghost-hmd-hairline.png" },
  { key: "windcover", src: "/setup/ghost-windcover-hairline.png" },
] as const;

/** The catalogue's studio plate — the ghosts' own background colour. */
const PLATE = "#f5f5f5";

export default async function WhatsNextPanel({ locale }: { locale: string }) {
  const t = await getTranslations("newsletter");
  const c = await getTranslations("cart");
  const uk = locale === "uk";

  const label: Record<string, string> = {
    bowl: uk ? "Чаша" : "Bowl",
    hmd: uk ? "Пристрій нагріву" : "Heat device",
    windcover: uk ? "Вітрозахист" : "Wind cover",
  };

  return (
    <div
      className="w-full p-6"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      <div
        className="text-[10px] tracking-[0.24em] uppercase mb-5"
        style={{ color: "var(--text-faint)" }}
      >
        {t("kit_label")}
      </div>

      {/* The sequence. The arrows are decorative — the labels beneath already
          say what order these come in, and reading "arrow" three times adds
          nothing for a screen reader. */}
      <div className="flex items-start justify-between gap-1.5">
        {STEPS.map((step, i) => (
          <div key={step.key} className="contents">
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <div
                className="w-full aspect-square rounded-[10px] overflow-hidden"
                style={{ background: PLATE }}
              >
                <Image
                  src={step.src}
                  alt=""
                  width={484}
                  height={484}
                  sizes="88px"
                  className="block w-full h-auto"
                />
              </div>
              <span
                className="text-[10px] leading-tight text-center"
                style={{ color: "var(--text-muted)" }}
              >
                {label[step.key]}
              </span>
            </div>

            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className="shrink-0 text-[13px] leading-none"
                style={{ color: "var(--accent-ink)", marginTop: "1.9rem" }}
              >
                →
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="h-px w-10 my-5" style={{ background: "var(--accent)" }} />

      {/* What the list is for, in one line. */}
      <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: "var(--text)" }}>
        {t("kit_body")}
      </p>

      <Link
        href={`/${locale}/setup`}
        className="text-[13px] underline underline-offset-4"
        style={{ color: "var(--text-muted)" }}
      >
        {c("suggest_build")}
      </Link>
    </div>
  );
}
