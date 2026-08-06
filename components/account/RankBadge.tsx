import type { Rank } from "@/lib/loyalty/ranks";

/* ---------------------------------------------------------------------------
   A rank insignia.

   The artwork is a dark plate with orange chevrons, drawn to sit on black —
   which is exactly where it goes, on the rewards card. It carries its own
   wordmark inside the disc; at 72px that reads as texture rather than text,
   which is why the rank is also named beside it rather than left to the badge.

   A plain <img>, not next/image: these are five fixed local SVGs at two known
   sizes, so the loader, the srcset and the layout machinery would all be work
   done for nothing. SVG scales itself.

   `dim` is for the ranks a customer has not reached yet — the same artwork at
   low opacity, so the ladder reads as one set of objects with some still
   switched off, rather than two different treatments.
--------------------------------------------------------------------------- */

export default function RankBadge({
  rank,
  size = 72,
  locale,
  dim = false,
  className = "",
}: {
  rank: Rank;
  size?: number;
  locale: string;
  dim?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={rank.badge}
      alt={locale === "uk" ? rank.uk : rank.en}
      width={size}
      height={size}
      className={`block shrink-0 ${className}`}
      style={{ width: size, height: size, opacity: dim ? 0.28 : 1 }}
      draggable={false}
    />
  );
}
