import Link from "next/link";
import { notFound } from "next/navigation";
import Tag from "@/components/Tag";
import { getCourse, getLog } from "@/lib/queries";
import { companions, labelOf } from "@/data/options";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: (await getLog(id))?.title };
}

export default async function LogDetailPage({ params }) {
  const { id } = await params;
  const log = await getLog(id);
  if (!log) notFound();

  const course = log.courseId ? await getCourse(log.courseId) : null;

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/log" className="text-sm text-muted hover:text-foreground">
        ← 로그 목록
      </Link>

      <div className={`h-48 rounded-3xl bg-linear-to-br md:h-64 ${log.cover}`} />

      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Tag>{labelOf(companions, log.companion)}</Tag>
          <span>{log.region}</span>
          <span>·</span>
          <span>{log.author}</span>
          <span>·</span>
          <time dateTime={log.date}>{log.date}</time>
        </div>
        <h1 className="mt-3 text-2xl font-bold leading-snug md:text-3xl">{log.title}</h1>
      </header>

      <div className="flex flex-col gap-4 leading-7">
        {log.body.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">💡 여행 팁</h2>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {log.tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      {course && (
        <Link
          href={`/course/${course.id}`}
          className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-lg"
        >
          <p className="text-xs text-muted">이 여행의 코스</p>
          <p className="mt-1 font-semibold text-brand">{course.title} →</p>
        </Link>
      )}
    </article>
  );
}
