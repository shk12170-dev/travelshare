import Link from "next/link";
import { notFound } from "next/navigation";
import Tag from "@/components/Tag";
import DeleteButton from "@/components/DeleteButton";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";
import FollowButton from "@/components/FollowButton";
import { deleteLog } from "@/app/log/actions";
import { getCurrentUser } from "@/lib/session";
import { getCourse, getFollowCounts, getLikedIds, getLog, isFollowing } from "@/lib/queries";
import { companions, labelOf } from "@/data/options";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: (await getLog(id))?.title };
}

export default async function LogDetailPage({ params }) {
  const { id } = await params;
  const log = await getLog(id);
  if (!log) notFound();

  const [course, user] = await Promise.all([
    log.courseId ? getCourse(log.courseId) : null,
    getCurrentUser(),
  ]);
  const isOwner = user?.id === log.authorId;
  const liked = (await getLikedIds(user?.id, "log", [log.id])).has(log.id);
  const [following, followCounts] = await Promise.all([
    isFollowing(user?.id, log.authorId),
    getFollowCounts(log.authorId),
  ]);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/log" className="text-sm text-muted hover:text-foreground">
        ← 로그 목록
      </Link>

      {log.photos.length > 0 ? (
        <section aria-label="첨부한 사진" className="flex flex-col gap-2">
          {/* 사용자가 올린 사진 주소(저장소로 이동)라 일반 img 사용 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={log.photos[0].src} alt={`${log.title} 사진 1`} className="max-h-96 w-full rounded-3xl object-cover" />
          {log.photos.length > 1 && (
            <ul className="grid grid-cols-4 gap-2">
              {log.photos.slice(1).map((photo, index) => (
                <li key={photo.id} className="aspect-square overflow-hidden rounded-xl bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.src}
                    alt={`${log.title} 사진 ${index + 2}`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className={`h-48 rounded-3xl bg-linear-to-br md:h-64 ${log.cover}`} />
      )}

      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Tag>{labelOf(companions, log.companion)}</Tag>
          <span>{log.region}</span>
          <span>·</span>
          <Link href={`/log?author=${log.authorId}`} className="font-medium text-foreground hover:text-brand">
            {log.author}
          </Link>
          <span>·</span>
          <time dateTime={log.date}>{log.date}</time>
        </div>
        {!isOwner && (
          <div className="mt-3">
            <FollowButton
              targetUserId={log.authorId}
              nickname={log.author}
              initialFollowing={following}
              initialFollowers={followCounts.followers}
              loggedIn={Boolean(user)}
            />
          </div>
        )}
        <h1 className="mt-3 text-2xl font-bold leading-snug md:text-3xl">{log.title}</h1>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-2">
          <LikeButton
            targetType="log"
            targetId={log.id}
            initialLiked={liked}
            initialCount={log.likes}
            loggedIn={Boolean(user)}
          />
          {isOwner && (
          <div className="flex items-start gap-2">
            <Link
              href={`/log/${log.id}/edit`}
              className="rounded-full border border-border px-4 py-1.5 text-sm text-muted hover:text-foreground"
            >
              수정
            </Link>
            <DeleteButton action={deleteLog.bind(null, log.id)} confirmMessage="이 로그를 삭제할까요? 되돌릴 수 없습니다." />
          </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 leading-7">
        {log.body.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </div>

      {log.tips.length > 0 && (
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-bold">💡 여행 팁</h2>
          <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {log.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </section>
      )}

      {course && (
        <Link
          href={`/course/${course.id}`}
          className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg"
        >
          <p className="text-xs text-muted">이 여행의 코스</p>
          <p className="mt-1 font-semibold text-brand">{course.title} →</p>
        </Link>
      )}

      <CommentSection logId={log.id} logAuthorId={log.authorId} user={user} />
    </article>
  );
}
