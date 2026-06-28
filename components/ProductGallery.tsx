"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Main image — Sea Salt White tile, lifted */}
      <div className="product-tile aspect-[4/5] relative overflow-hidden mb-4 flex flex-col items-center justify-center">
        <div className="relative w-full flex-1">
          <Image
            src={photos[selected]}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            className="object-contain p-8"
          />
        </div>
        <span className="tile-brand text-xs pb-5 select-none">TCT</span>
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button
              key={photo}
              onClick={() => setSelected(i)}
              className="aspect-square relative overflow-hidden transition-all"
              style={{
                background: "var(--sea-salt)",
                outline: i === selected ? "2px solid var(--gold)" : "2px solid transparent",
                outlineOffset: "-2px",
              }}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={photo} alt={`${name} ${i + 1}`} fill sizes="120px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
