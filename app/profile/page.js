import Link from "next/link";
import Tag from "@/components/Tag";
import LogCard from "@/components/LogCard";
import { currentUserId, getUser } from "@/data/users";
import { logs } from "@/data/logs";
import { mediaItems } from "@/data/media";
import { themes, labelOf } from "@/data/options";

export const metadata = {
  title: "프로필",
};

export default function ProfilePage() {
  // 로그인 기능 전까지는 샘플 사용자를 내 계정으로 표시
  const user = getUser(currentUserId);
  const myLogs = logs.filter((log) => log.author === user.nickname);
  const myMedia = mediaItems.filter((item) => item.author === user.nickname);
  const totalLikes = [...myLogs, ...myMedia].reduce((sum, item) => sum + item.likes, 0);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center sm:flex-row sm:text-left">
        <div className={`h-20 w-20 shrink-0 rounded-full bg-linear-to-br ${user.avatar}`} />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-xl font-bold">{user.nickname}</h1>
          <p className="text-sm text-muted">{user.bio}</p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {user.favoriteThemes.map((id) => (
              <Tag key={id}>{labelOf(themes, id)}</Tag>
            ))}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <Stat label="로그" value={myLogs.length} />
          <Stat label="미디어" value={myMedia.length} />
          <Stat label="좋아요" value={totalLikes} />
        </dl>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">내 여행 로그</h2>
          <Link href="/log/new" className="text-sm font-medium text-brand">
            + 새 로그
          </Link>
        </div>
        {myLogs.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {myLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            아직 작성한 로그가 없습니다.
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">내 미디어</h2>
        <ul className="grid grid-cols-3 gap-2">
          {myMedia.map((item) => (
            <li
              key={item.id}
              className={`flex aspect-square items-end rounded-xl bg-linear-to-br p-2 text-xs font-medium text-white ${item.cover}`}
            >
              {item.caption}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}
