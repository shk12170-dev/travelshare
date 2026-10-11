import Link from "next/link";
import LogCard from "@/components/LogCard";
import Pagination from "@/components/Pagination";
import { getLogPage, getUser, pageNumber } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "여행 로그",
};

export default async function LogPage({ searchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const authorId = typeof params.author === "string" ? params.author : undefined;
  const [result, author] = await Promise.all([
    getLogPage({ page, authorId }),
    authorId ? getUser(authorId) : null,
  ]);

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
          {page > 1 ? "이 페이지에는 로그가 없습니다." : "아직 작성된 로그가 없습니다."}
        </p>
      )}

      <Pagination basePath="/log" page={page} hasPrev={result.hasPrev} hasNext={result.hasNext} params={{ author: authorId }} />
    </div>
  );
}
