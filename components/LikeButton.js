"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleLike } from "@/app/actions/interactions";

// variant: "pill"(상세 화면) | "overlay"(사진 위)
export default function LikeButton({ targetType, targetId, initialLiked, initialCount, loggedIn, variant = "pill" }) {
  const router = useRouter();
  const pathname = usePathname();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    // 화면을 먼저 바꾸고, 서버 결과로 맞춤
    const prev = { liked, count };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    setMessage("");
    startTransition(async () => {
      const result = await toggleLike(targetType, targetId);
      if (result.error) {
        setLiked(prev.liked);
        setCount(prev.count);
        setMessage(result.error);
      } else {
        setLiked(result.liked);
        setCount(result.likes);
      }
    });
  }

  const style =
    variant === "overlay"
      ? `rounded-full bg-black/45 px-3 py-1.5 text-xs text-white hover:bg-black/60 ${liked ? "text-rose-300" : ""}`
      : `rounded-full border px-4 py-1.5 text-sm transition-colors ${
          liked
            ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-300"
            : "border-border text-muted hover:text-foreground"
        }`;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={liked}
        aria-label={`좋아요 ${count}개${liked ? ", 좋아요 취소" : ""}`}
        className={style}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span> {count}
      </button>
      {message && (
        <span role="status" className="text-xs text-red-600 dark:text-red-400">
          {message}
        </span>
      )}
    </span>
  );
}
