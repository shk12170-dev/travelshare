"use client";

import { useState } from "react";
import Chip from "./Chip";
import MediaThumb from "./MediaThumb";
import { mediaTypes, labelOf } from "@/data/options";

const typeIcon = { photo: "🖼️", video: "🎬", shorts: "⚡" };

export default function MediaGallery({ items }) {
  const [type, setType] = useState(null);
  const filtered = type ? items.filter((item) => item.type === type) : items;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip active={type === null} onClick={() => setType(null)}>
          전체
        </Chip>
        {mediaTypes.map((option) => (
          <Chip key={option.id} active={type === option.id} onClick={() => setType(option.id)}>
            {option.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          아직 올라온 미디어가 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-slate-800 text-white"
            >
              <MediaThumb item={item} />
              <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-xs">
                {typeIcon[item.type]} {item.duration ?? labelOf(mediaTypes, item.type)}
              </span>
              <div className="pointer-events-none relative bg-linear-to-t from-black/60 to-transparent p-3 pt-8">
                <p className="text-sm font-semibold leading-snug">{item.caption}</p>
                <p className="mt-0.5 text-xs text-white/85">
                  {item.region} · {item.author} · ♥ {item.likes}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
