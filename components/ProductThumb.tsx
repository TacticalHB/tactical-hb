import Image from "next/image";

/* ---------------------------------------------------------------------------
   The square product thumbnail, and the one thing it knows that next/image
   does not: a product may have no photograph yet.

   WHY THIS EXISTS. `Image` throws on an empty src — "Image is missing required
   src property" — and it throws once per line, so a bag holding one
   unphotographed product fills the console and renders a broken plate on the
   cart, the drawer, the checkout summary, the confirmation, favourites, search
   and the order detail. That is seven surfaces failing for one missing file.

   AND A MISSING PHOTOGRAPH IS A NORMAL STATE HERE, not an error to be fixed
   later: FEAR 9E418 and LID 9E418 went on sale before they were shot, and the
   catalogue has always allowed it — the PDP says "Photos coming soon" and the
   grid card falls back to the name. Those two already had their own branch.
   These surfaces did not, so the rule lived in two places and was absent from
   seven others. It lives here now.

   THE FALLBACK IS THE NAME ON THE PLATE, which is the grid card's treatment,
   so an unphotographed line looks the same wherever it appears. Deliberately
   NOT a placeholder image file: a grey square in /public is indistinguishable
   from a real photograph that failed to load, and the first person to see one
   would go looking for a broken path.

   The caller keeps its own wrapper — the plate, the size, the rounding — and
   passes only what changes. Every current caller wraps this in a `relative`
   box, which is what `fill` and the absolute fallback both need.
--------------------------------------------------------------------------- */

export default function ProductThumb({
  src,
  name,
  sizes,
  className = "object-contain p-1.5",
}: {
  /** May be empty: that is the case this component exists for. */
  src: string | null | undefined;
  /** Doubles as the alt text and as the fallback's label. */
  name: string;
  sizes: string;
  className?: string;
}) {
  if (!src) {
    return (
      <span
        className="absolute inset-0 grid place-items-center px-1 text-center leading-tight
                   text-[9px] tracking-[0.12em] uppercase"
        style={{ color: "#a8a8ab" }}
      >
        {name}
      </span>
    );
  }
  return <Image src={src} alt={name} fill sizes={sizes} className={className} />;
}
