"use client";

import { useActionState, useState } from "react";
import FormField, { FormError, inputClass } from "./FormField";
import { companions, regions } from "@/data/options";
import { LOG_LIMITS, validateLog } from "@/lib/validation";

const emptyForm = { title: "", region: "", companion: "", body: "", tips: "" };

// action: createLog 또는 updateLog.bind(null, id) 같은 서버 액션
export default function LogForm({ action, initialValues = emptyForm, submitLabel = "작성 완료" }) {
  const [state, formAction, pending] = useActionState(action, { errors: {} });
  const [form, setForm] = useState(initialValues);
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

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormError message={errors.form} />

      <FormField label="제목" error={errors.title}>
        <input
          name="title"
          className={inputClass}
          value={form.title}
          onChange={update("title")}
          maxLength={LOG_LIMITS.titleMax}
          placeholder="예) 비 오는 날의 제주, 오히려 좋았던 이유"
        />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="지역" error={errors.region}>
          <select name="region" className={inputClass} value={form.region} onChange={update("region")}>
            <option value="">선택하세요</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </FormField>
        <FormField label="누구와" error={errors.companion}>
          <select name="companion" className={inputClass} value={form.companion} onChange={update("companion")}>
            <option value="">선택하세요</option>
            {companions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="본문" error={errors.body}>
        <textarea
          name="body"
          className={`${inputClass} min-h-48`}
          value={form.body}
          onChange={update("body")}
          maxLength={LOG_LIMITS.bodyMax}
          placeholder="여행에서 있었던 일을 자유롭게 기록하세요. 빈 줄로 문단을 나눌 수 있습니다."
        />
      </FormField>

      <FormField label="여행 팁 (한 줄에 하나씩, 선택)" error={errors.tips}>
        <textarea
          name="tips"
          className={`${inputClass} min-h-24`}
          value={form.tips}
          onChange={update("tips")}
          placeholder={"우도 배는 당일 아침 운항 공지를 확인\n비 오는 날은 비자림 추천"}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
      >
        {pending ? "저장 중..." : submitLabel}
      </button>
    </form>
  );
}
