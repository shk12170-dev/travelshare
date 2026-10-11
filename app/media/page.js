import MediaGallery from "@/components/MediaGallery";
import MediaUploader from "@/components/MediaUploader";
import { getMediaItems } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "미디어",
};

export default async function MediaPage() {
  const mediaItems = await getMediaItems();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">여행 미디어</h1>
        <p className="mt-1 text-sm text-muted">여행지에서 찍은 사진, 영상, 숏츠를 둘러보고 공유하세요.</p>
      </div>
      <MediaUploader />
      <MediaGallery items={mediaItems} />
    </div>
  );
}
