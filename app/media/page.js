import Link from "next/link";
import MediaGallery from "@/components/MediaGallery";
import MediaUploader from "@/components/MediaUploader";
import Pagination from "@/components/Pagination";
import { mediaTypes } from "@/data/options";
import { getLikedIds, getMediaPage, getUser, pageNumber } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "미디어",
};

export default async function MediaPage({ searchParams }) {
  const params = await searchParams;
  const page = pageNumber(params.page);
  const type = mediaTypes.some((t) => t.id === params.type) ? params.type : undefined;
  const authorId = typeof params.author === "string" ? params.author : undefined;

  const [result, user, author] = await Promise.all([
    getMediaPage({ page, type, authorId }),
    getCurrentUser(),
    authorId ? getUser(authorId) : null,
  ]);
  const likedIds = await getLikedIds(user?.id, "media", result.items.map((item) => item.id));

  // 유형 필터 링크 (작성자 조건은 유지, 페이지는 처음으로)
  const filterHref = (id) => {
    const query = new URLSearchParams(Object.entries({ type: id, author: authorId }).filter(([, v]) => v));
    return query.size ? `/media?${query}` : "/media";
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{author ? `${author.nickname}님의 미디어` : "여행 미디어"}</h1>
        <p className="mt-1 text-sm text-muted">
          {author ? (
            <Link href="/media" className="text-brand">
              전체 미디어 보기
            </Link>
          ) : (
            "여행지에서 찍은 사진, 영상, 숏츠를 둘러보고 공유하세요."
          )}
        </p>
      </div>
      {!author &&
        (user ? (
          <MediaUploader />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-muted">로그인하면 내 사진과 영상을 올릴 수 있어요.</p>
            <Link
              href="/login?next=%2Fmedia"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900"
            >
              로그인
            </Link>
          </div>
        ))}

      <nav aria-label="미디어 유형" className="flex flex-wrap gap-2">
        {[{ id: undefined, label: "전체" }, ...mediaTypes].map((option) => {
          const active = option.id === type;
          return (
            <Link
              key={option.label}
              href={filterHref(option.id)}
              aria-current={active ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                active
                  ? "border-brand bg-brand text-white dark:text-slate-900"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      <MediaGallery items={result.items} currentUserId={user?.id} likedIds={[...likedIds]} />
      <Pagination
        basePath="/media"
        page={page}
        hasPrev={result.hasPrev}
        hasNext={result.hasNext}
        params={{ type, author: authorId }}
      />
    </div>
  );
}
