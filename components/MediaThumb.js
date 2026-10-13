// 미디어 한 칸의 배경: 업로드 파일이면 실제 사진·영상, 샘플이면 그라데이션
export default function MediaThumb({ item }) {
  if (!item.src) {
    // 실제 파일이 없는 샘플 항목: 사진이 깨진 것으로 오해하지 않도록 "샘플"임을 표시
    return (
      <div className={`absolute inset-0 bg-linear-to-br ${item.cover}`}>
        <span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-black/65 px-2.5 py-1 text-xs font-medium text-white">
          샘플 이미지
        </span>
      </div>
    );
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
  // next/image 대신 일반 img를 씀: 배포 환경(Vercel 무료 플랜)의 이미지 변환 월 한도를 쓰지 않고,
  // 사진은 업로드할 때 이미 브라우저에서 줄여서 올라옴. 주소는 R2로 이동(302)되어 R2에서 바로 전송됨
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.src}
      alt={item.caption}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
