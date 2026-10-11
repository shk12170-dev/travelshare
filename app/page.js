import Link from "next/link";
import CourseCard from "@/components/CourseCard";
import LogCard from "@/components/LogCard";
import { getCourses, getLogs } from "@/lib/queries";

// DB 내용이 바뀌면 바로 반영되도록 요청마다 렌더링
export const dynamic = "force-dynamic";

export default async function Home() {
  const [courses, latestLogs] = await Promise.all([getCourses(), getLogs({ take: 4 })]);
  const popularCourses = courses.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-3xl bg-linear-to-br from-teal-700 to-sky-700 px-6 py-10 text-white md:px-10 md:py-14">
        <h1 className="text-2xl font-bold leading-snug md:text-4xl">
          누구와 떠나든,
          <br />
          딱 맞는 여행 코스를 찾아보세요
        </h1>
        <p className="mt-3 max-w-md text-sm text-white/85 md:text-base">
          혼자, 친구, 연인, 가족과 다녀온 사람들의 코스와 기록, 생생한 팁을 모았습니다.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/course"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-teal-800"
          >
            코스 찾아보기
          </Link>
          <Link
            href="/log"
            className="rounded-full border border-white/60 px-5 py-2.5 text-sm font-semibold"
          >
            여행 로그 보기
          </Link>
        </div>
      </section>

      <section>
        <SectionHeader title="인기 코스" href="/course" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popularCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="최신 여행 로그" href="/log" />
        <div className="grid gap-3 md:grid-cols-2">
          {latestLogs.map((log) => (
            <LogCard key={log.id} log={log} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, href }) {
  return (
    <div className="mb-4 flex items-baseline justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      <Link href={href} className="text-sm font-medium text-brand">
        더 보기 →
      </Link>
    </div>
  );
}
