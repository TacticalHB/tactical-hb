"use client";

import { useState } from "react";
import { useFavourites } from "@/hooks/useFavourites";

/**
 * Reusable heart toggle. Fill is driven by the shared favourites state, so it
 * updates optimistically the instant it's clicked (and reverts if the save fails).
 *
 *   <HeartButton productId={product.slug} />
 */
export default function HeartButton({
  productId,
  size = 20,
  className = "",
  label = "Favourite",
  onDark = false,
}: {
  productId: string;
  size?: number;
  className?: string;
  label?: string;
  onDark?: boolean;
}) {
  const { isFavourited, toggleFavourite } = useFavourites();
  const [pending, setPending] = useState(false);
  const filled = isFavourited(productId);

  const onClick = async (e: React.MouseEvent) => {
    // Hearts often sit inside a product-card <Link>; don't navigate.
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await toggleFavourite(productId);
    } finally {
      setPending(false);
    }
  };

  const stroke = onDark ? "#fff" : "#111";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={filled}
      disabled={pending}
      className={`inline-flex items-center justify-center transition-transform active:scale-90 disabled:opacity-60 ${className}`}
      style={{ lineHeight: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? (onDark ? "var(--accent)" : "#111") : "none"}
        stroke={filled && !onDark ? "#111" : stroke}
        strokeWidth="1.6"
        className="transition-colors"
      >
        <path d="M12 20s-7-4.5-9-9c-1.2-2.8.4-6 3.5-6C8.5 5 10 6.5 12 9c2-2.5 3.5-4 5.5-4 3.1 0 4.7 3.2 3.5 6-2 4.5-9 9-9 9Z" />
      </svg>
    </button>
  );
}
