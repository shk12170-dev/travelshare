import { prisma } from "@/lib/db";
import { hit, limitMessage } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/session";
import { UploadError, removeUpload, saveUploadStream } from "@/lib/storage";
import { UPLOAD_LIMITS, allowedMimeTypes, maxUploadBytes } from "@/lib/validation";
import { regions } from "@/data/options";

const uploadErrors = {
  TOO_LARGE: [413, "파일이 너무 큽니다."],
  BAD_SIGNATURE: [400, "파일 내용이 형식과 맞지 않습니다."],
  EMPTY: [400, "빈 파일입니다."],
};

function fail(status, message) {
  return Response.json({ errors: [message] }, { status });
}

// 미디어 업로드: 파일 1개를 요청 본문 그대로 보냄 (multipart 아님)
//   POST /api/media?caption=설명&region=지역&videoType=video|shorts
//   Content-Type: 파일 형식 (예: image/jpeg), 본문: 파일 내용
// 본문을 메모리에 모으지 않고 디스크에 바로 쓰므로 큰 영상도 메모리를 거의 쓰지 않음
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "로그인이 필요합니다.");

  const params = new URL(request.url).searchParams;
  const caption = String(params.get("caption") ?? "").trim();
  const region = String(params.get("region") ?? "");
  const videoType = params.get("videoType") === "shorts" ? "shorts" : "video";
  const mimeType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

  if (!caption) return fail(400, "설명을 입력하세요.");
  if (caption.length > UPLOAD_LIMITS.captionMax) return fail(400, `설명은 ${UPLOAD_LIMITS.captionMax}자 이하로 입력하세요.`);
  if (!regions.includes(region)) return fail(400, "지역을 선택하세요.");
  const extension = allowedMimeTypes[mimeType];
  if (!extension) return fail(415, "JPG, PNG, WEBP, GIF 사진 또는 MP4, WEBM, MOV 영상만 올릴 수 있습니다.");

  // 크기를 미리 알려 준 경우 받기 전에 거부 (알려 주지 않아도 받는 중에 한도를 넘으면 중단)
  const maxBytes = maxUploadBytes(mimeType);
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return fail(413, `${mimeType.startsWith("image/") ? "사진" : "영상"}은 ${maxBytes / 1024 / 1024}MB 이하만 가능합니다.`);
  if (!request.body) return fail(400, "파일이 없습니다.");

  const limit = hit("upload", user.id);
  if (!limit.ok) return fail(429, limitMessage(limit.retryAfterSec));

  let saved;
  try {
    saved = await saveUploadStream(request.body, { extension, mimeType, maxBytes });
  } catch (error) {
    if (error instanceof UploadError) return fail(...uploadErrors[error.code]);
    console.error("업로드 저장 실패", error);
    return fail(500, "업로드 중 문제가 발생했습니다. 다시 시도하세요.");
  }

  try {
    const item = await prisma.mediaItem.create({
      data: {
        type: mimeType.startsWith("image/") ? "photo" : videoType,
        caption,
        region,
        fileName: saved.fileName,
        mimeType,
        size: saved.size,
        authorId: user.id,
      },
      select: { id: true },
    });
    return Response.json({ id: item.id }, { status: 201 });
  } catch (error) {
    console.error("미디어 저장 실패", error);
    await removeUpload(saved.fileName);
    return fail(500, "저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.");
  }
}
