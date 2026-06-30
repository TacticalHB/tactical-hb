"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Main image — white rounded tile, lifted on dark */}
      <div className="photo-tile-light aspect-square relative overflow-hidden mb-4 flex items-center justify-center">
        <Image
          src={photos[selected]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-contain p-6"
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button
              key={photo}
              onClick={() => setSelected(i)}
              className="photo-thumb-light aspect-square relative overflow-hidden transition-all"
              style={{
                outline: i === selected ? "2px solid var(--gold-bright)" : "2px solid transparent",
                outlineOffset: "2px",
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
