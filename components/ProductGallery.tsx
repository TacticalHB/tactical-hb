"use client";

import Image from "next/image";
import { useState } from "react";
import Embers from "./Embers";

export default function ProductGallery({ photos, name }: { photos: string[]; name: string }) {
  const [selected, setSelected] = useState(0);

  return (
    <div>
      {/* Main image — charcoal with spotlight */}
      <div className="smoke-bg aspect-[4/5] relative overflow-hidden mb-4 flex items-center justify-center">
        <Embers density={0.7} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(212,177,94,0.12) 0%, transparent 65%)" }} />
        <Image
          src={photos[selected]}
          alt={name}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-contain p-8"
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
                background: "var(--ink)",
                border: `1px solid ${i === selected ? "var(--gold)" : "var(--border)"}`,
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
