// 미디어 한 칸의 배경: 업로드 파일이면 실제 사진·영상, 샘플이면 그라데이션
export default function MediaThumb({ item }) {
  if (!item.src) {
    return <div aria-hidden className={`absolute inset-0 bg-linear-to-br ${item.cover}`} />;
  }
  if (item.mimeType?.startsWith("video/")) {
    return (
      <video
        src={item.src}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="metadata"
        controls
      />
    );
  }
  return (
    // API 경로의 사용자 업로드 이미지라 next/image 최적화 대신 img 사용
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.src} alt={item.caption} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
  );
}
