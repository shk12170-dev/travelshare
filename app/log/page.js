import Link from "next/link";
import LogCard from "@/components/LogCard";
import Pagination from "@/components/Pagination";
import FollowButton from "@/components/FollowButton";
import { getCurrentUser } from "@/lib/session";
import { getFollowCounts, getFollowingIds, getLogPage, getUser, isFollowing, pageNumber } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "여행 로그",
};

export default async function LogPage({ searchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const authorId = typeof params.author === "string" ? params.author : undefined;
  const user = await getCurrentUser();
  // 팔로우한 사람의 로그만 보기 (로그인한 경우에만)
  const followingFeed = params.feed === "following" && !authorId;
  const followingIds = followingFeed && user ? await getFollowingIds(user.id) : null;
  const [result, author] = await Promise.all([
    getLogPage({ page, authorId, authorIds: followingFeed ? (followingIds ?? []) : undefined }),
    authorId ? getUser(authorId) : null,
  ]);
  const [authorFollowing, authorCounts] = author
    ? await Promise.all([isFollowing(user?.id, author.id), getFollowCounts(author.id)])
    : [false, null];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{author ? `${author.nickname}님의 여행 로그` : "여행 로그"}</h1>
          <p className="mt-1 text-sm text-muted">
            {author ? (
              <Link href="/log" className="text-brand">
                전체 로그 보기
              </Link>
            ) : (
              "다녀온 사람들의 생생한 기록과 노하우를 확인하세요."
            )}
          </p>
          {author && user?.id !== author.id && (
            <div className="mt-2">
              <FollowButton
                targetUserId={author.id}
                nickname={author.nickname}
                initialFollowing={authorFollowing}
                initialFollowers={authorCounts.followers}
                loggedIn={Boolean(user)}
              />
            </div>
          )}
          {!author && (
            <nav aria-label="로그 보기 방식" className="mt-3 flex gap-2 text-sm">
              <Link
                href="/log"
                aria-current={followingFeed ? undefined : "page"}
                className={`rounded-full border px-4 py-1.5 ${followingFeed ? "border-border text-muted" : "border-brand bg-brand-soft text-brand"}`}
              >
                전체
              </Link>
              <Link
                href="/log?feed=following"
                aria-current={followingFeed ? "page" : undefined}
                className={`rounded-full border px-4 py-1.5 ${followingFeed ? "border-brand bg-brand-soft text-brand" : "border-border text-muted"}`}
              >
                팔로잉
              </Link>
            </nav>
          )}
        </div>
        <Link
          href="/log/new"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900"
        >
          + 로그 쓰기
        </Link>
      </div>

      {result.items.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {result.items.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          {followingFeed && !user
            ? "로그인하면 팔로우한 사람들의 로그를 모아 볼 수 있습니다."
            : followingFeed
              ? "아직 팔로우한 사람의 로그가 없습니다. 로그 상세에서 작성자를 팔로우해 보세요."
              : page > 1
                ? "이 페이지에는 로그가 없습니다."
                : "아직 작성된 로그가 없습니다."}
        </p>
      )}

      <Pagination basePath="/log" page={page} hasPrev={result.hasPrev} hasNext={result.hasNext} params={{ author: authorId, feed: followingFeed ? "following" : undefined }} />
    </div>
  );
}
