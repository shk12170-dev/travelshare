import Link from "next/link";
import Tag from "@/components/Tag";
import LogCard from "@/components/LogCard";
import CourseCard from "@/components/CourseCard";
import MediaThumb from "@/components/MediaThumb";
import { getFollowCounts, getLikedCourses, getLogs, getMediaItems, getUser, getUserStats } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { themes, labelOf } from "@/data/options";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "프로필",
};

export default async function ProfilePage({ searchParams }) {
  const { id } = await requireUser("/profile");
  const { updated } = await searchParams;
  const [user, myLogs, myMedia, likedCourses, stats, followCounts] = await Promise.all([
    getUser(id),
    getLogs({ authorId: id, take: 6 }),
    getMediaItems({ authorId: id, take: 12 }),
    getLikedCourses(id),
    getUserStats(id),
    getFollowCounts(id),
  ]);
  const favoriteThemes = Array.isArray(user.favoriteThemes) ? user.favoriteThemes : [];

  return (
    <div className="flex flex-col gap-8">
      {updated && (
        <p role="status" className="rounded-lg bg-brand-soft p-3 text-sm text-brand">
          프로필을 저장했습니다.
        </p>
      )}
      <section className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-surface p-6 text-center sm:flex-row sm:text-left">
        <div className={`h-20 w-20 shrink-0 rounded-full bg-linear-to-br ${user.avatar}`} />
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-xl font-bold">{user.nickname}</h1>
          <p className="text-sm text-muted">{user.bio || "아직 소개가 없습니다."}</p>
          <p className="text-xs text-muted">
            팔로워 {followCounts.followers} · 팔로잉 {followCounts.following}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
            {favoriteThemes.map((id) => (
              <Tag key={id}>{labelOf(themes, id)}</Tag>
            ))}
          </div>
          <Link href="/profile/edit" className="mt-1 self-center text-sm font-medium text-brand sm:self-start">
            프로필 수정
          </Link>
        </div>
        <dl className="grid grid-cols-3 gap-4 text-center">
          <Stat label="로그" value={stats.logs} />
          <Stat label="미디어" value={stats.media} />
          <Stat label="받은 좋아요" value={stats.likes} />
        </dl>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">내 여행 로그</h2>
          <div className="flex gap-3 text-sm font-medium">
            {stats.logs > myLogs.length && (
              <Link href={`/log?author=${id}`} className="text-brand">
                전체 {stats.logs}개 보기
              </Link>
            )}
            <Link href="/log/new" className="text-brand">
              + 새 로그
            </Link>
          </div>
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
        <h2 className="mb-4 text-xl font-bold">찜한 코스</h2>
        {likedCourses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {likedCourses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted">
            코스 상세 화면에서 ♡를 누르면 여기에 모입니다.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-xl font-bold">내 미디어</h2>
          {stats.media > myMedia.length && (
            <Link href={`/media?author=${id}`} className="text-sm font-medium text-brand">
              전체 {stats.media}개 보기
            </Link>
          )}
        </div>
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
