// 입력값 검증 규칙. 브라우저(즉시 안내)와 서버(최종 검사)가 같은 규칙을 사용합니다.
import { companions, regions, themes } from "@/data/options";

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

// 댓글
export const COMMENT_LIMITS = { max: 500 };

export function validateComment(body) {
  const b = body.trim();
  if (!b) return "댓글 내용을 입력하세요.";
  if (b.length > COMMENT_LIMITS.max) return `댓글은 ${COMMENT_LIMITS.max}자 이하로 입력하세요.`;
  return null;
}

// 회원가입·로그인
export const PASSWORD_LIMITS = { min: 8, max: 72 };
export const NICKNAME_LIMITS = { min: 2, max: 20 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup({ nickname, email, password, passwordConfirm }) {
  const errors = {};
  const n = nickname.trim();
  if (n.length < NICKNAME_LIMITS.min || n.length > NICKNAME_LIMITS.max)
    errors.nickname = `닉네임은 ${NICKNAME_LIMITS.min}~${NICKNAME_LIMITS.max}자로 입력하세요.`;
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "올바른 이메일 주소를 입력하세요.";
  if (password.length < PASSWORD_LIMITS.min || password.length > PASSWORD_LIMITS.max)
    errors.password = `비밀번호는 ${PASSWORD_LIMITS.min}~${PASSWORD_LIMITS.max}자로 입력하세요.`;
  if (password !== passwordConfirm) errors.passwordConfirm = "비밀번호가 서로 다릅니다.";
  return errors;
}

export function validatePasswordChange({ currentPassword, newPassword, confirm }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "현재 비밀번호를 입력하세요.";
  if (newPassword.length < PASSWORD_LIMITS.min || newPassword.length > PASSWORD_LIMITS.max)
    errors.newPassword = `비밀번호는 ${PASSWORD_LIMITS.min}~${PASSWORD_LIMITS.max}자로 입력하세요.`;
  if (newPassword !== confirm) errors.confirm = "비밀번호가 서로 다릅니다.";
  return errors;
}

// 프로필
export const BIO_LIMITS = { max: 200 };

export const avatarChoices = [
  "from-sky-400 to-teal-500",
  "from-orange-300 to-rose-500",
  "from-violet-400 to-indigo-600",
  "from-emerald-300 to-teal-600",
  "from-amber-200 to-rose-400",
  "from-slate-400 to-slate-700",
];

export function validateProfile({ nickname, bio, avatar, favoriteThemes }) {
  const errors = {};
  const n = nickname.trim();
  if (n.length < NICKNAME_LIMITS.min || n.length > NICKNAME_LIMITS.max)
    errors.nickname = `닉네임은 ${NICKNAME_LIMITS.min}~${NICKNAME_LIMITS.max}자로 입력하세요.`;
  if (bio.trim().length > BIO_LIMITS.max) errors.bio = `소개는 ${BIO_LIMITS.max}자 이하로 입력하세요.`;
  if (!avatarChoices.includes(avatar)) errors.avatar = "프로필 색상을 선택하세요.";
  if (!favoriteThemes.every((t) => themes.some((theme) => theme.id === t))) errors.favoriteThemes = "테마를 다시 선택하세요.";
  return errors;
}

export function validateLogin({ email, password }) {
  const errors = {};
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = "올바른 이메일 주소를 입력하세요.";
  if (!password) errors.password = "비밀번호를 입력하세요.";
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
