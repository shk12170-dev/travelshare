import Link from "next/link";
import LogCard from "@/components/LogCard";
import { logs } from "@/data/logs";

export const metadata = {
  title: "여행 로그",
};

export default function LogPage() {
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">여행 로그</h1>
          <p className="mt-1 text-sm text-muted">
            다녀온 사람들의 생생한 기록과 노하우를 확인하세요.
          </p>
        </div>
        <Link
          href="/log/new"
          className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900"
        >
          + 로그 쓰기
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((log) => (
          <LogCard key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
