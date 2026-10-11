"use client";

import { useState } from "react";
import CourseCard from "./CourseCard";
import { companions, themes } from "@/data/options";

export default function CourseExplorer({ courses }) {
  const [companion, setCompanion] = useState(null);
  const [theme, setTheme] = useState(null);

  const filtered = courses.filter(
    (course) =>
      (!companion || course.companions.includes(companion)) &&
      (!theme || course.themes.includes(theme)),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <FilterRow label="누구와" options={companions} value={companion} onChange={setCompanion} />
        <FilterRow label="테마" options={themes} value={theme} onChange={setTheme} />
      </div>

      <p className="text-sm text-muted">코스 {filtered.length}개</p>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          조건에 맞는 코스가 없습니다. 다른 필터를 선택해 보세요.
        </div>
      )}
    </div>
  );
}

function FilterRow({ label, options, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 shrink-0 text-sm font-semibold">{label}</span>
      <Chip active={value === null} onClick={() => onChange(null)}>
        전체
      </Chip>
      {options.map((option) => (
        <Chip key={option.id} active={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
        </Chip>
      ))}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-brand bg-brand text-white dark:text-slate-900"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
