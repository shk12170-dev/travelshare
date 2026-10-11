"use client";

import { useState } from "react";
import Chip from "./Chip";
import { mediaTypes } from "@/data/media";

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

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
        {filtered.map((item) => (
          <li
            key={item.id}
            className={`relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-linear-to-br p-3 text-white ${item.cover}`}
          >
            <span className="absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-xs">
              {typeIcon[item.type]} {item.duration ?? mediaTypes.find((t) => t.id === item.type).label}
            </span>
            <p className="text-sm font-semibold leading-snug drop-shadow">{item.caption}</p>
            <p className="mt-0.5 text-xs text-white/85">
              {item.region} · {item.author} · ♥ {item.likes}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
