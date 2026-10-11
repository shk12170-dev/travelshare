"use client";

import { useEffect, useRef, useState } from "react";

// 업로드 전 검증 기준. 서버 저장(5단계)에서도 같은 기준을 다시 검사해야 함
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 100;
const MAX_FILES = 10;

function validate(file) {
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return "사진 또는 영상 파일만 올릴 수 있습니다.";
  const limit = isImage ? MAX_IMAGE_MB : MAX_VIDEO_MB;
  if (file.size > limit * 1024 * 1024) return `${isImage ? "사진" : "영상"}은 ${limit}MB 이하만 가능합니다.`;
  return null;
}

export default function MediaUploader() {
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  // 화면을 떠날 때 미리보기용 blob URL 해제
  useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function handleFiles(fileList) {
    const nextErrors = [];
    const accepted = [];
    for (const file of fileList) {
      const error = validate(file);
      if (error) nextErrors.push(`${file.name}: ${error}`);
      else accepted.push(file);
    }
    const room = MAX_FILES - previews.length;
    if (accepted.length > room) nextErrors.push(`한 번에 최대 ${MAX_FILES}개까지 올릴 수 있습니다.`);

    const added = accepted.slice(0, Math.max(room, 0)).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      name: file.name,
      isVideo: file.type.startsWith("video/"),
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...added]);
    setErrors(nextErrors);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">내 미디어 올리기</h2>
          <p className="text-xs text-muted">
            사진 {MAX_IMAGE_MB}MB, 영상 {MAX_VIDEO_MB}MB 이하 · 최대 {MAX_FILES}개
          </p>
        </div>
        <label className="cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900">
          파일 선택
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {previews.length > 0 && (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {previews.map((p) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-lg bg-black">
                {p.isVideo ? (
                  <video src={p.url} className="h-full w-full object-cover" muted playsInline controls />
                ) : (
                  // blob URL 미리보기는 next/image 최적화 대상이 아니므로 img 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label={`${p.name} 삭제`}
                  className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted">
            지금은 내 브라우저에서만 미리보기됩니다. 게시(서버 저장)는 다음 단계에서 연결됩니다.
          </p>
        </>
      )}
    </section>
  );
}
