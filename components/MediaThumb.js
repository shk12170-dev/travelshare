import Image from "next/image";

// 미디어 한 칸의 배경: 업로드 파일이면 실제 사진·영상, 샘플이면 그라데이션
// sizes: 화면 폭에 따른 표시 크기. 브라우저가 알맞은 크기의 이미지를 고르는 데 사용
export default function MediaThumb({ item, sizes = "(min-width: 640px) 33vw, 50vw" }) {
  if (!item.src) {
    return <div aria-hidden className={`absolute inset-0 bg-linear-to-br ${item.cover}`} />;
  }
  if (item.mimeType?.startsWith("video/")) {
    return (
      <video
        src={item.src}
        aria-label={item.caption}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        controls
      />
    );
  }
  // GIF는 움직임이 사라지지 않도록 변환하지 않음
  return (
    <Image
      src={item.src}
      alt={item.caption}
      fill
      sizes={sizes}
      unoptimized={item.mimeType === "image/gif"}
      className="object-cover"
    />
  );
}
