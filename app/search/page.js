import CourseCard from "@/components/CourseCard";
import LogCard from "@/components/LogCard";
import MediaGallery from "@/components/MediaGallery";
import { getLikedIds, search } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata({ searchParams }) {
  const q = String((await searchParams).q ?? "").trim();
  return { title: q ? `"${q}" 검색` : "검색" };
}

export default async function SearchPage({ searchParams }) {
  const q = String((await searchParams).q ?? "").trim();
  const [results, user] = await Promise.all([search(q), getCurrentUser()]);
  const likedMedia = await getLikedIds(user?.id, "media", results.media.map((m) => m.id));
  const total = results.courses.length + results.logs.length + results.media.length;

  return (
    <div className="flex flex-col gap-8">
      <form role="search" action="/search" className="flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          검색어
        </label>
        <input
          id="search-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={50}
          placeholder="지역, 코스, 여행 이야기 검색 (예: 제주, 야시장)"
          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-sm focus:border-brand"
        />
        <button type="submit" className="shrink-0 rounded-full bg-brand px-5 text-sm font-semibold text-white dark:text-slate-900">
          검색
        </button>
      </form>

      {!q ? (
        <p className="text-sm text-muted">찾고 싶은 지역이나 키워드를 입력하세요.</p>
      ) : total === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted">
          &ldquo;{q}&rdquo;에 대한 결과가 없습니다. 다른 키워드로 찾아보세요.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            &ldquo;{q}&rdquo; 검색 결과 {total}건
          </p>
          {results.courses.length > 0 && (
            <ResultSection title="코스" count={results.courses.length}>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {results.courses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </ResultSection>
          )}
          {results.logs.length > 0 && (
            <ResultSection title="여행 로그" count={results.logs.length}>
              <div className="grid gap-3 md:grid-cols-2">
                {results.logs.map((log) => (
                  <LogCard key={log.id} log={log} />
                ))}
              </div>
            </ResultSection>
          )}
          {results.media.length > 0 && (
            <ResultSection title="미디어" count={results.media.length}>
              <MediaGallery items={results.media} currentUserId={user?.id} likedIds={[...likedMedia]} />
            </ResultSection>
          )}
        </>
      )}
    </div>
  );
}

function ResultSection({ title, count, children }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">
        {title} <span className="text-base font-normal text-muted">{count}</span>
      </h2>
      {children}
    </section>
  );
}
