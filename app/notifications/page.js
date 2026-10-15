import Link from "next/link";
import { markAllNotificationsRead } from "@/app/actions/interactions";
import NotificationList from "@/components/NotificationList";
import { getNotifications } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "알림",
};

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
        <NotificationList notifications={notifications} />
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
