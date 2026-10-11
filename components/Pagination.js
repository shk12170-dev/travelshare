import Link from "next/link";

// 이전/다음 페이지 링크. params: 함께 유지할 다른 검색 조건 (예: { type: "photo" })
export default function Pagination({ basePath, page, hasPrev, hasNext, params = {} }) {
  if (!hasPrev && !hasNext) return null;

  const href = (target) => {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
    if (target > 1) query.set("page", String(target));
    const qs = query.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const linkClass = "rounded-full border border-border px-4 py-2 text-sm hover:bg-brand-soft";

  return (
    <nav aria-label="페이지" className="flex items-center justify-center gap-3">
      {hasPrev ? (
        <Link href={href(page - 1)} rel="prev" className={linkClass}>
          ← 이전
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm text-muted opacity-50">← 이전</span>
      )}
      <span className="text-sm text-muted" aria-current="page">
        {page}페이지
      </span>
      {hasNext ? (
        <Link href={href(page + 1)} rel="next" className={linkClass}>
          다음 →
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm text-muted opacity-50">다음 →</span>
      )}
    </nav>
  );
}
