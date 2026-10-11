"use client";

import { useActionState } from "react";

// action: 삭제 서버 액션(인자 bind 완료). 실패하면 { errors: { form } }을 반환
export default function DeleteButton({ action, confirmMessage = "정말 삭제할까요? 되돌릴 수 없습니다." }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
      className="flex flex-col items-end gap-1"
    >
      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-red-300 px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
      >
        {pending ? "삭제 중..." : "삭제"}
      </button>
      {state?.errors?.form && <p className="text-xs text-red-600 dark:text-red-400">{state.errors.form}</p>}
    </form>
  );
}
