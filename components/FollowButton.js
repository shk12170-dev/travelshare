"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/interactions";

// 사용자를 팔로우/취소하는 버튼. 본인에게는 보여 주지 않음(부모에서 처리)
export default function FollowButton({ targetUserId, nickname, initialFollowing, initialFollowers, loggedIn }) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function handleClick() {
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const prev = { following, followers };
    setFollowing(!following);
    setFollowers(followers + (following ? -1 : 1));
    setMessage("");
    startTransition(async () => {
      const result = await toggleFollow(targetUserId);
      if (result.error) {
        setFollowing(prev.following);
        setFollowers(prev.followers);
        setMessage(result.error);
      } else {
        setFollowing(result.following);
        setFollowers(result.followers);
      }
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-2">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          aria-pressed={following}
          aria-label={`${nickname} ${following ? "팔로잉 중, 팔로우 취소" : "팔로우"}`}
          className={`rounded-full border px-3.5 py-1 text-sm font-medium transition-colors ${
            following
              ? "border-brand bg-brand-soft text-brand"
              : "border-border text-foreground hover:bg-brand-soft"
          }`}
        >
          {following ? "팔로잉" : "+ 팔로우"}
        </button>
        <span className="text-xs text-muted">팔로워 {followers}</span>
      </span>
      {message && (
        <span role="status" className="text-xs text-red-600 dark:text-red-400">
          {message}
        </span>
      )}
    </span>
  );
}
