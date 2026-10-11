"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { regions } from "@/data/options";
import { UPLOAD_LIMITS, allowedMimeTypes, validateMediaFile } from "@/lib/validation";

const accept = Object.keys(allowedMimeTypes).join(",");

export default function MediaUploader() {
  const router = useRouter();
  const [previews, setPreviews] = useState([]);
  const [errors, setErrors] = useState([]);
  const [caption, setCaption] = useState("");
  const [region, setRegion] = useState("");
  const [videoType, setVideoType] = useState("video");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState("");
  const inputRef = useRef(null);
  const previewsRef = useRef(previews);

  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);

  // 화면을 떠날 때 미리보기용 blob URL 해제
  useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const hasVideo = previews.some((p) => p.isVideo);

  function handleFiles(fileList) {
    const nextErrors = [];
    const accepted = [];
    for (const file of fileList) {
      const error = validateMediaFile(file);
      if (error) nextErrors.push(`${file.name}: ${error}`);
      else accepted.push(file);
    }
    const room = UPLOAD_LIMITS.maxFiles - previews.length;
    if (accepted.length > room) nextErrors.push(`한 번에 최대 ${UPLOAD_LIMITS.maxFiles}개까지 올릴 수 있습니다.`);

    const added = accepted.slice(0, Math.max(room, 0)).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      name: file.name,
      isVideo: file.type.startsWith("video/"),
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...added]);
    setErrors(nextErrors);
    setMessage("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id) {
    setPreviews((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = [];
    if (!caption.trim()) nextErrors.push("설명을 입력하세요.");
    if (!region) nextErrors.push("지역을 선택하세요.");
    if (nextErrors.length > 0) return setErrors(nextErrors);

    // 파일을 하나씩 순서대로 보냄 (서버가 디스크에 바로 저장)
    setUploading(true);
    setErrors([]);
    const query = new URLSearchParams({ caption, region, videoType });
    const failed = [];
    let done = 0;
    for (const [index, p] of previews.entries()) {
      setProgress(`${index + 1}/${previews.length}`);
      try {
        const res = await fetch(`/api/media?${query}`, {
          method: "POST",
          headers: { "Content-Type": p.file.type },
          body: p.file,
        });
        if (res.ok) {
          URL.revokeObjectURL(p.url);
          done += 1;
          continue;
        }
        const data = await res.json().catch(() => ({}));
        failed.push({ preview: p, error: data.errors?.[0] ?? "업로드에 실패했습니다." });
        // 횟수 제한에 걸리면 나머지도 실패하므로 중단
        if (res.status === 429) {
          failed.push(...previews.slice(index + 1).map((rest) => ({ preview: rest, error: null })));
          break;
        }
      } catch {
        failed.push({ preview: p, error: "네트워크 문제로 업로드하지 못했습니다." });
      }
    }

    // 실패한 파일만 남겨 다시 시도할 수 있게 함
    setPreviews(failed.map((f) => f.preview));
    setErrors(failed.filter((f) => f.error).map((f) => `${f.preview.name}: ${f.error}`));
    if (failed.length === 0) setCaption("");
    setMessage(done > 0 ? `${done}개를 게시했습니다.` : "");
    setProgress("");
    setUploading(false);
    if (done > 0) router.refresh();
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-brand";

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">내 미디어 올리기</h2>
          <p className="text-xs text-muted">
            사진 {UPLOAD_LIMITS.imageMB}MB, 영상 {UPLOAD_LIMITS.videoMB}MB 이하 · 최대 {UPLOAD_LIMITS.maxFiles}개
          </p>
        </div>
        <label className="cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-slate-900">
          파일 선택
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      </div>

      {message && <p className="rounded-lg bg-brand-soft p-3 text-sm text-brand">{message}</p>}

      {errors.length > 0 && (
        <ul role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}

      {previews.length > 0 && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

          <div className="grid gap-3 sm:grid-cols-[1fr_10rem_10rem]">
            <input
              aria-label="설명"
              className={inputClass}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={UPLOAD_LIMITS.captionMax}
              placeholder="어떤 순간인가요? 예) 성산일출봉 일출"
            />
            <select aria-label="지역" className={inputClass} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">지역 선택</option>
              {regions.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {hasVideo && (
              <select
                aria-label="영상 유형"
                className={inputClass}
                value={videoType}
                onChange={(e) => setVideoType(e.target.value)}
              >
                <option value="video">영상</option>
                <option value="shorts">숏츠</option>
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="self-start rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:text-slate-900"
          >
            {uploading ? `올리는 중... ${progress}` : `${previews.length}개 게시하기`}
          </button>
        </form>
      )}
    </section>
  );
}
