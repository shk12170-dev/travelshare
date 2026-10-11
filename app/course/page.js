import CourseExplorer from "@/components/CourseExplorer";
import { getCourses } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "여행 코스 추천",
};

export default async function CoursePage() {
  const courses = await getCourses();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">여행 코스 추천</h1>
        <p className="mt-1 text-sm text-muted">
          동행 유형과 테마를 골라 나에게 맞는 코스를 찾아보세요.
        </p>
      </div>
      <CourseExplorer courses={courses} />
    </div>
  );
}
