// 입력값 검증 규칙. 브라우저(즉시 안내)와 서버(최종 검사)가 같은 규칙을 사용합니다.
import { companions, regions } from "@/data/options";

export const LOG_LIMITS = { titleMin: 2, titleMax: 60, bodyMin: 10, bodyMax: 5000, tipMax: 100, tipsMax: 10 };

export function splitTips(tips) {
  return tips
    .split("\n")
    .map((tip) => tip.trim())
    .filter(Boolean);
}

export function validateLog({ title, region, companion, body, tips }) {
  const errors = {};
  const t = title.trim();
  if (t.length < LOG_LIMITS.titleMin) errors.title = `제목을 ${LOG_LIMITS.titleMin}자 이상 입력하세요.`;
  else if (t.length > LOG_LIMITS.titleMax) errors.title = `제목은 ${LOG_LIMITS.titleMax}자 이하로 입력하세요.`;
  if (!regions.includes(region)) errors.region = "지역을 선택하세요.";
  if (!companions.some((c) => c.id === companion)) errors.companion = "동행 유형을 선택하세요.";
  const b = body.trim();
  if (b.length < LOG_LIMITS.bodyMin) errors.body = `본문을 ${LOG_LIMITS.bodyMin}자 이상 입력하세요.`;
  else if (b.length > LOG_LIMITS.bodyMax) errors.body = `본문은 ${LOG_LIMITS.bodyMax}자 이하로 입력하세요.`;
  const tipList = splitTips(tips);
  if (tipList.length > LOG_LIMITS.tipsMax) errors.tips = `팁은 ${LOG_LIMITS.tipsMax}개까지 입력할 수 있습니다.`;
  else if (tipList.some((tip) => tip.length > LOG_LIMITS.tipMax))
    errors.tips = `팁 한 줄은 ${LOG_LIMITS.tipMax}자 이하로 입력하세요.`;
  return errors;
}

// 업로드 허용 형식. 서버는 파일 앞부분(시그니처)도 함께 확인합니다.
export const UPLOAD_LIMITS = { imageMB: 10, videoMB: 100, maxFiles: 10, captionMax: 100 };

export const allowedMimeTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export function validateMediaFile(file) {
  if (!allowedMimeTypes[file.type]) return "JPG, PNG, WEBP, GIF 사진 또는 MP4, WEBM, MOV 영상만 올릴 수 있습니다.";
  const isImage = file.type.startsWith("image/");
  const limit = isImage ? UPLOAD_LIMITS.imageMB : UPLOAD_LIMITS.videoMB;
  if (file.size > limit * 1024 * 1024) return `${isImage ? "사진" : "영상"}은 ${limit}MB 이하만 가능합니다.`;
  if (file.size === 0) return "빈 파일입니다.";
  return null;
}
