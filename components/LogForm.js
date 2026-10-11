"use client";

import { useState } from "react";
import Tag from "./Tag";
import { companions, labelOf } from "@/data/options";

const regions = ["서울", "부산", "제주", "강원", "경북", "전북", "기타"];

const emptyForm = { title: "", region: "", companion: "", body: "", tips: "" };

// 입력값 검증. 서버 API(5단계)에서도 같은 규칙을 다시 검사해야 함
function validate(form) {
  const errors = {};
  if (form.title.trim().length < 2) errors.title = "제목을 2자 이상 입력하세요.";
  if (form.title.length > 60) errors.title = "제목은 60자 이하로 입력하세요.";
  if (!form.region) errors.region = "지역을 선택하세요.";
  if (!form.companion) errors.companion = "동행 유형을 선택하세요.";
  if (form.body.trim().length < 10) errors.body = "본문을 10자 이상 입력하세요.";
  return errors;
}

function splitTips(tips) {
  return tips
    .split("\n")
    .map((tip) => tip.trim())
    .filter(Boolean);
}

export default function LogForm() {
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(null);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSubmitted(form);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-brand-soft p-4 text-sm text-brand">
          작성 내용을 확인했습니다. 서버 저장은 다음 단계(DB 연결)에서 지원되며, 지금은 미리보기만 제공합니다.
        </div>
        <LogPreview form={submitted} />
        <button
          type="button"
          onClick={() => setSubmitted(null)}
          className="self-start rounded-full border border-border px-5 py-2 text-sm font-medium"
        >
          다시 수정하기
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <Field label="제목" error={errors.title}>
        <input
          className={inputClass}
          value={form.title}
          onChange={update("title")}
          maxLength={60}
          placeholder="예) 비 오는 날의 제주, 오히려 좋았던 이유"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="지역" error={errors.region}>
          <select className={inputClass} value={form.region} onChange={update("region")}>
            <option value="">선택하세요</option>
            {regions.map((region) => (
              <option key={region}>{region}</option>
            ))}
          </select>
        </Field>
        <Field label="누구와" error={errors.companion}>
          <select className={inputClass} value={form.companion} onChange={update("companion")}>
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
          className={`${inputClass} min-h-48`}
          value={form.body}
          onChange={update("body")}
          placeholder="여행에서 있었던 일을 자유롭게 기록하세요. 빈 줄로 문단을 나눌 수 있습니다."
        />
      </Field>

      <Field label="여행 팁 (한 줄에 하나씩, 선택)">
        <textarea
          className={`${inputClass} min-h-24`}
          value={form.tips}
          onChange={update("tips")}
          placeholder={"우도 배는 당일 아침 운항 공지를 확인\n비 오는 날은 비자림 추천"}
        />
      </Field>

      <button
        type="submit"
        className="self-start rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white dark:text-slate-900"
      >
        작성 완료
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

function LogPreview({ form }) {
  const paragraphs = form.body.split(/\n\s*\n/).filter((p) => p.trim());
  const tips = splitTips(form.tips);

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Tag>{labelOf(companions, form.companion)}</Tag>
        <span>{form.region}</span>
      </div>
      <h2 className="text-xl font-bold">{form.title}</h2>
      {paragraphs.map((p, i) => (
        <p key={i} className="whitespace-pre-line leading-7">
          {p}
        </p>
      ))}
      {tips.length > 0 && (
        <ul className="list-disc pl-5 text-sm">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      )}
    </article>
  );
}
