"use client";

import { useRef, useState } from "react";
import { UploadFailure, uploadFile } from "@/lib/uploadClient";
import { MAX_LOG_PHOTOS } from "@/lib/logPhotoLimits";
import { allowedMimeTypes } from "@/lib/validation";

const imageTypes = Object.keys(allowedMimeTypes)
  .filter((t) => t.startsWith("image/"))
  .join(",");

// 로그에 사진을 첨부하는 입력. 올린 사진 ID는 숨은 입력(mediaIds)으로 로그와 함께 제출됩니다.
// initialPhotos: 수정 화면에서 이미 첨부된 사진 [{ id, src, name }]
// onBusyChange: 올리는 동안 부모가 저장 버튼을 막을 수 있게 알려 줌
export default function LogPhotoPicker({ initialPhotos = [], onBusyChange }) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);
  // 이번 작성 중에 새로 올린 임시 사진 (빼면 바로 서버에서 지움)
  const draftIds = useRef(new Set());

  function setBusyState(value) {
    setBusy(value);
    onBusyChange?.(value);
  }

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (inputRef.current) inputRef.current.value = "";
    if (files.length === 0) return;

    const room = MAX_LOG_PHOTOS - photos.length;
    const nextErrors = [];
    if (files.length > room) nextErrors.push(`사진은 최대 ${MAX_LOG_PHOTOS}장까지 첨부할 수 있습니다.`);

    setBusyState(true);
    for (const file of files.slice(0, Math.max(room, 0))) {
      if (!file.type.startsWith("image/")) {
        nextErrors.push(`${file.name}: 사진 파일만 첨부할 수 있습니다.`);
        continue;
      }
      try {
        const { id } = await uploadFile(file, { draft: true });
        draftIds.current.add(id);
        setPhotos((prev) => [...prev, { id, src: `/api/media/${id}/file`, name: file.name }]);
      } catch (error) {
        nextErrors.push(`${file.name}: ${error instanceof UploadFailure ? error.message : "올리지 못했습니다."}`);
        if (error?.status === 429) break;
      }
    }
    setErrors(nextErrors);
    setBusyState(false);
  }

  async function remove(photo) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    // 이번에 올린 임시 사진은 바로 지우고, 이미 로그에 붙어 있던 사진은 저장할 때 지워짐
    if (draftIds.current.has(photo.id)) {
      draftIds.current.delete(photo.id);
      await fetch(`/api/media/${photo.id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  const full = photos.length >= MAX_LOG_PHOTOS;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-semibold">
        사진 첨부 <span className="font-normal text-muted">(선택, 최대 {MAX_LOG_PHOTOS}장)</span>
      </legend>

      <input type="hidden" name="mediaIds" value={JSON.stringify(photos.map((p) => p.id))} />

      {photos.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo) => (
            <li key={photo.id} className="relative aspect-square overflow-hidden rounded-lg bg-slate-800">
              {/* 사용자가 올린 사진 주소(저장소로 이동)라 일반 img 사용 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.name ?? "첨부한 사진"} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(photo)}
                aria-label={`${photo.name ?? "사진"} 빼기`}
                className="absolute right-1 top-1 h-6 w-6 rounded-full bg-black/60 text-xs text-white"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium ${
            busy || full ? "pointer-events-none opacity-50" : "hover:bg-brand-soft"
          }`}
        >
          {busy ? "올리는 중..." : "사진 추가"}
          <input
            ref={inputRef}
            type="file"
            accept={imageTypes}
            multiple
            className="sr-only"
            disabled={busy || full}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
        <span className="text-xs text-muted">
          {photos.length}/{MAX_LOG_PHOTOS}
        </span>
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </fieldset>
  );
}
