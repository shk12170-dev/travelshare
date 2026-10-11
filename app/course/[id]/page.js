import Link from "next/link";
import { notFound } from "next/navigation";
import Tag from "@/components/Tag";
import LogCard from "@/components/LogCard";
import { courses, getCourse } from "@/data/courses";
import { logs } from "@/data/logs";
import { companions, themes, labelOf } from "@/data/options";

export function generateStaticParams() {
  return courses.map((course) => ({ id: course.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: getCourse(id)?.title };
}

export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  const course = getCourse(id);
  if (!course) notFound();

  const relatedLogs = logs.filter((log) => log.courseId === course.id);

  return (
    <article className="flex flex-col gap-8">
      <Link href="/course" className="text-sm text-muted hover:text-foreground">
        ← 코스 목록
      </Link>

      <header className={`rounded-3xl bg-linear-to-br p-6 text-white md:p-10 ${course.cover}`}>
        <p className="text-sm text-white/85">
          {course.region} · {course.duration} · ♥ {course.likes}
        </p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{course.title}</h1>
        <p className="mt-3 max-w-xl text-sm text-white/90 md:text-base">{course.summary}</p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {course.themes.map((t) => (
          <Tag key={t}>{labelOf(themes, t)}</Tag>
        ))}
        {course.companions.map((c) => (
          <Tag key={c}>{labelOf(companions, c)}</Tag>
        ))}
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">코스 순서</h2>
        <ol className="flex flex-col gap-3">
          {course.stops.map((stop, index) => (
            <li
              key={stop.name}
              className="flex gap-4 rounded-2xl border border-border bg-surface p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white dark:text-slate-900">
                {index + 1}
              </span>
              <div>
                <h3 className="font-semibold">{stop.name}</h3>
                <p className="mt-0.5 text-sm text-muted">{stop.note}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {relatedLogs.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">이 코스를 다녀온 기록</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {relatedLogs.map((log) => (
              <LogCard key={log.id} log={log} />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
