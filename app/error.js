"use client";

import { useEffect } from "react";
import Link from "next/link";

// 페이지에서 예상치 못한 오류가 났을 때 보여 주는 화면
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>
        🌧️
      </p>
      <h1 className="text-xl font-bold">문제가 발생했습니다</h1>
      <p className="text-sm text-muted">잠시 후 다시 시도하세요. 문제가 계속되면 홈으로 이동해 주세요.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white dark:text-slate-900"
        >
          다시 시도
        </button>
        <Link href="/" className="rounded-full border border-border px-5 py-2 text-sm">
          홈으로
        </Link>
      </div>
    </div>
  );
}
