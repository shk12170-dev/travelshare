import MediaGallery from "@/components/MediaGallery";
import MediaUploader from "@/components/MediaUploader";
import Link from "next/link";
import { getLikedIds, getMediaItems } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "미디어",
};

export default async function MediaPage() {
  const [mediaItems, user] = await Promise.all([getMediaItems(), getCurrentUser()]);
  const likedIds = await getLikedIds(user?.id, "media", mediaItems.map((item) => item.id));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">여행 미디어</h1>
        <p className="mt-1 text-sm text-muted">여행지에서 찍은 사진, 영상, 숏츠를 둘러보고 공유하세요.</p>
      </div>
      {user ? (
        <MediaUploader />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">로그인하면 내 사진과 영상을 올릴 수 있어요.</p>
          <Link
            href="/login?next=%2Fmedia"
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900"
          >
            로그인
          </Link>
        </div>
      )}
      <MediaGallery items={mediaItems} currentUserId={user?.id} likedIds={[...likedIds]} />
    </div>
  );
}
