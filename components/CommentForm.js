"use client";

import { useActionState } from "react";
import { COMMENT_LIMITS } from "@/lib/validation";

// action: addComment.bind(null, logId)
export default function CommentForm({ action }) {
  const [state, formAction, pending] = useActionState(action, { error: null, body: "" });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <label htmlFor="comment-body" className="sr-only">
        댓글 쓰기
      </label>
      <textarea
        // 저장에 성공하면 key가 바뀌어 입력란이 비워짐
        key={state.savedAt ?? "draft"}
        id="comment-body"
        name="body"
        defaultValue={state.body}
        maxLength={COMMENT_LIMITS.max}
        required
        placeholder="궁금한 점이나 감상을 남겨 보세요."
        className="min-h-20 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm focus:border-brand"
      />
      <div className="flex items-center justify-between gap-2">
        <span role="status" className="text-xs text-red-600 dark:text-red-400">
          {state.error}
        </span>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
        >
          {pending ? "등록 중..." : "댓글 등록"}
        </button>
      </div>
    </form>
  );
}
