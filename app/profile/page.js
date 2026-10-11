import Link from "next/link";
import Tag from "@/components/Tag";
import LogCard from "@/components/LogCard";
import MediaThumb from "@/components/MediaThumb";
import { getLogs, getMediaItems, getUser } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { themes, labelOf } from "@/data/options";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "프로필",
};

export default async function ProfilePage() {
  const { id } = await requireUser("/profile");
  const [user, myLogs, myMedia] = await Promise.all([
    getUser(id),
    getLogs({ authorId: id }),
    getMediaItems({ authorId: id }),
  ]);
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
        {myMedia.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2">
            {myMedia.map((item) => (
              <li
                key={item.id}
                className="relative flex aspect-square items-end overflow-hidden rounded-xl bg-slate-800 text-xs font-medium text-white"
              >
                <MediaThumb item={item} />
                <span className="pointer-events-none relative w-full bg-linear-to-t from-black/60 to-transparent p-2 pt-6">
                  {item.caption}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            아직 올린 미디어가 없습니다.
          </p>
        )}
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
