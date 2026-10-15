"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationRead } from "@/app/actions/interactions";

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function notificationText(notification) {
  if (notification.type === "follow") return "님이 회원님을 팔로우했습니다.";
  if (notification.type === "comment") return "님이 회원님의 여행 로그에 댓글을 남겼습니다.";
  if (notification.type === "like") {
    return notification.targetType === "media" ? "님이 회원님의 미디어를 좋아합니다." : "님이 회원님의 여행 로그를 좋아합니다.";
  }
  return "님이 새 여행 로그를 작성했습니다.";
}

function notificationHref(notification) {
  if (notification.targetType === "log" && notification.targetId) return `/log/${notification.targetId}`;
  if ((notification.type === "follow" || notification.type === "log") && notification.actorId) {
    return `/log?author=${encodeURIComponent(notification.actorId)}`;
  }
  if (notification.targetType === "media") return "/media";
  return "/log";
}

export default function NotificationList({ notifications }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function openNotification(event, notification) {
    if (notification.read) return;
    event.preventDefault();
    startTransition(async () => {
      await markNotificationRead(notification.id);
      router.push(notificationHref(notification));
    });
  }

  return (
    <ul className="overflow-hidden rounded-2xl border border-border bg-surface" aria-busy={pending}>
      {notifications.map((notification) => (
        <li key={notification.id} className={`flex items-center gap-3 border-b border-border p-4 last:border-b-0 ${notification.read ? "" : "bg-brand-soft/40"}`}>
          <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg">👤</span>
          <Link
            href={notificationHref(notification)}
            onClick={(event) => openNotification(event, notification)}
            className="min-w-0 flex-1 rounded-lg py-1 hover:text-brand"
          >
            <p className="text-sm"><strong>{notification.actor}</strong>{notificationText(notification)}</p>
            <time dateTime={notification.createdAt.toISOString()} className="mt-1 block text-xs text-muted">
              {timeFormatter.format(notification.createdAt)}
            </time>
          </Link>
          {!notification.read && (
            <form action={markNotificationRead.bind(null, notification.id)}>
              <button type="submit" className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-foreground">
                읽음
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
