"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MediaThumb from "./MediaThumb";
import LikeButton from "./LikeButton";
import { mediaTypes, labelOf } from "@/data/options";

const typeIcon = { photo: "🖼️", video: "🎬", shorts: "⚡" };

export default function MediaGallery({ items, currentUserId, likedIds = [] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function handleDelete(item) {
    if (!window.confirm(`"${item.caption}"을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
    setDeletingId(item.id);
    setError("");
    try {
      const res = await fetch(`/api/media/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.errors?.[0] ?? "삭제하지 못했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 문제로 삭제하지 못했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          아직 올라온 미디어가 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-xl bg-slate-800 text-white"
            >
              <MediaThumb item={item} />
              <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-xs">
                {typeIcon[item.type]} {item.duration ?? labelOf(mediaTypes, item.type)}
              </span>
              {item.authorId === currentUserId && (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  disabled={deletingId === item.id}
                  aria-label={`${item.caption} 삭제`}
                  className="absolute right-2 top-2 z-10 h-7 w-7 rounded-full bg-black/50 text-xs text-white hover:bg-red-600 disabled:opacity-60"
                >
                  ✕
                </button>
              )}
              <div className="pointer-events-none relative bg-linear-to-t from-black/60 to-transparent p-3 pt-8">
                <p className="text-sm font-semibold leading-snug">{item.caption}</p>
                <p className="mt-0.5 pr-14 text-xs text-white/85">
                  {item.region} · {item.author}
                </p>
              </div>
              <div className="absolute bottom-2.5 right-2.5 z-10">
                <LikeButton
                  targetType="media"
                  targetId={item.id}
                  initialLiked={likedIds.includes(item.id)}
                  initialCount={item.likes}
                  loggedIn={Boolean(currentUserId)}
                  variant="overlay"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
