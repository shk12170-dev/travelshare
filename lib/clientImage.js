// 브라우저에서 큰 사진을 줄이기. 업로드 시간과 저장 공간을 아끼고, 사진에 들어 있는 위치(GPS) 정보도 사라짐
// - JPEG·PNG·WEBP만 대상 (GIF는 움직임이 사라지고, 영상은 건드리지 않음)
// - 긴 변이 MAX_SIDE를 넘거나 파일이 SIZE_THRESHOLD를 넘을 때만 변환
// - 변환 결과가 더 작을 때만 사용. 실패하면 원본 그대로 올림

export const MAX_SIDE = 2048;
export const SIZE_THRESHOLD = 2 * 1024 * 1024;
const CONVERTIBLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export function targetSize(width, height, maxSide = MAX_SIDE) {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height, resized: false };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale), resized: true };
}

export async function shrinkImage(file) {
  if (!CONVERTIBLE.has(file.type) || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height, resized } = targetSize(bitmap.width, bitmap.height);
    if (!resized && file.size <= SIZE_THRESHOLD) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // PNG는 투명도를 지키기 위해 PNG로, 나머지는 같은 형식으로 저장
    const quality = file.type === "image/png" ? undefined : 0.85;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, file.type, quality));
    if (!blob || blob.type !== file.type || blob.size >= file.size) return file;

    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file;
  }
}
