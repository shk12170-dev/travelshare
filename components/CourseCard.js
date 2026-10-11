import Link from "next/link";
import Tag from "./Tag";
import { companions, themes, labelOf } from "@/data/options";

export default function CourseCard({ course }) {
  return (
    <Link
      href={`/course/${course.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition-shadow hover:shadow-lg"
    >
      <div className={`flex h-32 items-end bg-linear-to-br p-4 ${course.cover}`}>
        <span className="rounded-full bg-black/30 px-2.5 py-0.5 text-xs font-medium text-white">
          {course.region} · {course.duration}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-semibold group-hover:text-brand">{course.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{course.summary}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {course.themes.map((id) => (
            <Tag key={id}>{labelOf(themes, id)}</Tag>
          ))}
          {course.companions.map((id) => (
            <Tag key={id}>{labelOf(companions, id)}</Tag>
          ))}
        </div>
      </div>
    </Link>
  );
}
