"use client";

import { useActionState } from "react";
import FormField, { FormError, inputClass } from "./FormField";
import { deleteAccount } from "@/app/profile/actions";

// hasPassword: 비밀번호 계정이면 비밀번호, 소셜 로그인 계정이면 닉네임으로 확인
export default function DeleteAccountForm({ hasPassword, nickname, counts }) {
  const [state, formAction, pending] = useActionState(deleteAccount, { errors: {} });
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-2xl border border-red-300 p-5 dark:border-red-800">
      <div className="text-sm">
        <p className="font-semibold text-red-700 dark:text-red-300">계정을 삭제하면 아래 내용이 모두 사라지고 되돌릴 수 없습니다.</p>
        <ul className="mt-2 list-disc pl-5 text-muted">
          <li>내 계정 정보(이메일, 닉네임, 비밀번호)</li>
          <li>내가 쓴 여행 로그 {counts.logs}개와 거기 달린 댓글</li>
          <li>내가 올린 사진·영상 {counts.media}개</li>
          <li>내가 쓴 댓글과 누른 좋아요</li>
        </ul>
      </div>

      <FormError message={errors.form} />

      <FormField
        label={hasPassword ? "확인을 위해 현재 비밀번호를 입력하세요" : `확인을 위해 닉네임(${nickname})을 그대로 입력하세요`}
        error={errors.confirmValue}
      >
        <input
          name="confirmValue"
          type={hasPassword ? "password" : "text"}
          className={inputClass}
          autoComplete={hasPassword ? "current-password" : "off"}
          required
        />
      </FormField>

      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="understood" className="mt-1" />
          <span>삭제하면 되돌릴 수 없다는 것을 이해했습니다.</span>
        </label>
        {errors.understood && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.understood}</p>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "삭제 중..." : "계정 영구 삭제"}
      </button>
    </form>
  );
}
