import Link from "next/link";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/interactions";
import { getNotifications } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "알림",
};

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
  if (notification.type === "follow") return `/log?author=${encodeURIComponent(notification.actorId)}`;
  if (notification.targetType === "media") return "/media";
  return "/log";
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const notifications = await getNotifications(user.id);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          <p className="mt-1 text-sm text-muted">나를 팔로우한 여행자를 확인하세요.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <button type="submit" className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted hover:text-foreground">
              모두 읽음
            </button>
          </form>
        )}
      </div>

      {notifications.length > 0 ? (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {notifications.map((notification) => (
            <li key={notification.id} className={`flex items-center gap-3 border-b border-border p-4 last:border-b-0 ${notification.read ? "" : "bg-brand-soft/40"}`}>
              <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg">👤</span>
              <Link href={notificationHref(notification)} className="min-w-0 flex-1 rounded-lg py-1 hover:text-brand">
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
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          아직 받은 알림이 없습니다. 여행 로그에서 다른 여행자를 만나 보세요.
          <Link href="/log" className="mt-3 block font-medium text-brand">
            여행 로그 보기
          </Link>
        </div>
      )}
    </div>
  );
}
