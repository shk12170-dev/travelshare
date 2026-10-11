import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl">🧳</p>
      <h1 className="text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-muted">주소가 바뀌었거나 삭제된 페이지입니다.</p>
      <Link href="/" className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white dark:text-slate-900">
        홈으로
      </Link>
    </div>
  );
}
