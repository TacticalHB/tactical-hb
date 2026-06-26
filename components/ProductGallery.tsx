"use client";

import Image from "next/image";
import { useState } from "react";

export default function ProductGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Main image */}
      <div className="aspect-[4/5] relative overflow-hidden mb-4" style={{ background: "#ffffff", border: "1px solid var(--border)" }}>
        <Image
          src={photos[selected]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-contain p-4"
        />
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="grid grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <button
              key={photo}
              onClick={() => setSelected(i)}
              className="aspect-square relative overflow-hidden transition-colors"
              style={{
                background: "#ffffff",
                border: `1px solid ${i === selected ? "var(--gold)" : "var(--border)"}`,
              }}
              aria-label={`View image ${i + 1}`}
            >
              <Image src={photo} alt={`${name} ${i + 1}`} fill sizes="120px" className="object-contain p-1" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
