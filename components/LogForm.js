"use client";

import { useActionState, useState } from "react";
import { createLog } from "@/app/log/actions";
import { companions, regions } from "@/data/options";
import { LOG_LIMITS, validateLog } from "@/lib/validation";

const emptyForm = { title: "", region: "", companion: "", body: "", tips: "" };

export default function LogForm() {
  const [state, formAction, pending] = useActionState(createLog, { errors: {} });
  const [form, setForm] = useState(emptyForm);
  const [clientErrors, setClientErrors] = useState(null);

  // 브라우저 검사 결과가 있으면 우선 표시하고, 없으면 서버 검사 결과를 표시
  const errors = clientErrors ?? state.errors;

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    const nextErrors = validateLog(form);
    if (Object.keys(nextErrors).length > 0) {
      e.preventDefault();
      setClientErrors(nextErrors);
      return;
    }
    setClientErrors(null);
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {errors.form && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errors.form}
        </p>
      )}

      <Field label="제목" error={errors.title}>
        <input
          name="title"
          className={inputClass}
          value={form.title}
          onChange={update("title")}
          maxLength={LOG_LIMITS.titleMax}
          placeholder="예) 비 오는 날의 제주, 오히려 좋았던 이유"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="지역" error={errors.region}>
          <select name="region" className={inputClass} value={form.region} onChange={update("region")}>
            <option value="">선택하세요</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </Field>
        <Field label="누구와" error={errors.companion}>
          <select name="companion" className={inputClass} value={form.companion} onChange={update("companion")}>
            <option value="">선택하세요</option>
            {companions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="본문" error={errors.body}>
        <textarea
          name="body"
          className={`${inputClass} min-h-48`}
          value={form.body}
          onChange={update("body")}
          maxLength={LOG_LIMITS.bodyMax}
          placeholder="여행에서 있었던 일을 자유롭게 기록하세요. 빈 줄로 문단을 나눌 수 있습니다."
        />
      </Field>

      <Field label="여행 팁 (한 줄에 하나씩, 선택)" error={errors.tips}>
        <textarea
          name="tips"
          className={`${inputClass} min-h-24`}
          value={form.tips}
          onChange={update("tips")}
          placeholder={"우도 배는 당일 아침 운항 공지를 확인\n비 오는 날은 비자림 추천"}
        />
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "저장 중..." : "작성 완료"}
      </button>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
