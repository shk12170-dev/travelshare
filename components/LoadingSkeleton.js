// 페이지 데이터를 불러오는 동안 보여 주는 화면
// 주의: 상세 화면(없는 글이면 404를 보내야 하는 곳)에는 쓰지 마세요.
// 로딩 화면이 먼저 전송되면 상태 코드가 200으로 고정되어 404를 보낼 수 없습니다.
export default function LoadingSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-6">
      <span className="sr-only">불러오는 중...</span>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-border" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
            <div className="h-28 animate-pulse rounded-xl bg-border" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
