import Link from "next/link";
import { notFound } from "next/navigation";
import Tag from "@/components/Tag";
import LogCard from "@/components/LogCard";
import LikeButton from "@/components/LikeButton";
import CourseMap from "@/components/CourseMap";
import { getCurrentUser } from "@/lib/session";
import { getCourse, getLikedIds, getLogs } from "@/lib/queries";
import { companions, themes, labelOf } from "@/data/options";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  return { title: (await getCourse(id))?.title };
}

export default async function CourseDetailPage({ params }) {
  const { id } = await params;
  const course = await getCourse(id);
  if (!course) notFound();

  const [relatedLogs, user] = await Promise.all([getLogs({ courseId: course.id, take: 6 }), getCurrentUser()]);
  const liked = (await getLikedIds(user?.id, "course", [course.id])).has(course.id);

  return (
    <article className="flex flex-col gap-8">
      <Link href="/course" className="text-sm text-muted hover:text-foreground">
        ← 코스 목록
      </Link>

      {/* 밝은 배경색에서도 흰 글자가 잘 보이도록 어두운 막을 깖 */}
      <header
        className={`rounded-3xl bg-linear-to-br p-6 text-white shadow-[inset_0_0_0_100vmax_rgba(0,0,0,0.3)] md:p-10 ${course.cover}`}
      >
        <p className="text-sm text-white/85">
          {course.region} · {course.duration}
        </p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">{course.title}</h1>
        <p className="mt-3 max-w-xl text-sm text-white/90 md:text-base">{course.summary}</p>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <LikeButton
          targetType="course"
          targetId={course.id}
          initialLiked={liked}
          initialCount={course.likes}
          loggedIn={Boolean(user)}
        />
        {course.themes.map((t) => (
          <Tag key={t}>{labelOf(themes, t)}</Tag>
        ))}
        {course.companions.map((c) => (
          <Tag key={c}>{labelOf(companions, c)}</Tag>
        ))}
      </div>

      <CourseMap stops={course.stops} />

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
