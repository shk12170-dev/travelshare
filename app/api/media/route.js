import { prisma } from "@/lib/db";
import { MediaError, createUpload, driver, finalizeUpload } from "@/lib/mediaStorage";
import { hit, limitMessage } from "@/lib/rateLimit";
import { getCurrentUser } from "@/lib/session";
import { uploadAvailable } from "@/lib/features";
import { createUploadToken, verifyUploadToken } from "@/lib/uploadToken";
import { UPLOAD_LIMITS } from "@/lib/validation";
import { regions } from "@/data/options";

function fail(status, message) {
  return Response.json({ errors: [message] }, { status });
}

async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

// 1단계: 업로드 허가 받기
//   POST /api/media   { caption, region, videoType, contentType, size }
//   → { token, upload: { method, url, headers } }
// 파일 자체는 이 서버로 보내지 않습니다. R2 방식에서는 응답의 주소로 브라우저가 R2에 직접 올립니다.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "로그인이 필요합니다.");
  if (!uploadAvailable()) return fail(503, "사진·영상 올리기는 저장소 연결을 준비 중입니다.");

  const body = await readJson(request);
  const caption = String(body.caption ?? "").trim();
  const region = String(body.region ?? "");
  const videoType = body.videoType === "shorts" ? "shorts" : "video";
  const mimeType = String(body.contentType ?? "").toLowerCase();
  const size = Number(body.size);
  // 로그 작성 화면에서 올리는 임시 사진: 설명·지역은 로그를 저장할 때 로그의 값으로 채워짐 (사진만 허용)
  const draft = body.draft === true;

  if (draft) {
    if (!mimeType.startsWith("image/")) return fail(400, "로그에는 사진만 첨부할 수 있습니다.");
  } else {
    if (!caption) return fail(400, "설명을 입력하세요.");
    if (caption.length > UPLOAD_LIMITS.captionMax) return fail(400, `설명은 ${UPLOAD_LIMITS.captionMax}자 이하로 입력하세요.`);
    if (!regions.includes(region)) return fail(400, "지역을 선택하세요.");
  }

  const limit = await hit("upload", user.id);
  if (!limit.ok) return fail(429, limitMessage(limit.retryAfterSec));

  try {
    const { fileName, upload } = await createUpload({ mimeType, size });
    const token = createUploadToken({
      key: fileName,
      uid: user.id,
      mime: mimeType,
      type: mimeType.startsWith("image/") ? "photo" : videoType,
      caption: draft ? "여행 사진" : caption,
      region: draft ? "기타" : region,
      draft,
    });
    // 로컬 방식은 우리 서버의 업로드 주소를 사용
    if (!upload.url) upload.url = `/api/media/upload/${encodeURIComponent(token)}`;
    return Response.json({ token, upload });
  } catch (error) {
    if (error instanceof MediaError) return fail(error.status, error.message);
    console.error("업로드 허가 실패", error);
    return fail(500, "업로드를 시작하지 못했습니다. 잠시 후 다시 시도하세요.");
  }
}

// 3단계: 올린 파일 확인하고 게시하기
//   PUT /api/media   { token }  → { id }
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return fail(401, "로그인이 필요합니다.");

  const { token } = await readJson(request);
  const payload = verifyUploadToken(token);
  if (!payload || payload.uid !== user.id) return fail(403, "업로드 허가가 만료되었거나 올바르지 않습니다. 다시 올려 주세요.");

  // 같은 허가증으로 두 번 게시되지 않도록 확인
  const existing = await prisma.mediaItem.findFirst({ where: { fileName: payload.key }, select: { id: true } });
  if (existing) return Response.json({ id: existing.id }, { status: 200 });

  try {
    const { size } = await finalizeUpload({ fileName: payload.key, mimeType: payload.mime });
    const item = await prisma.mediaItem.create({
      data: {
        type: payload.type,
        caption: payload.caption,
        region: payload.region,
        fileName: payload.key,
        mimeType: payload.mime,
        size,
        authorId: user.id,
        draft: payload.draft === true,
      },
      select: { id: true },
    });
    return Response.json({ id: item.id, driver: driver() }, { status: 201 });
  } catch (error) {
    if (error instanceof MediaError) return fail(error.status, error.message);
    console.error("미디어 등록 실패", error);
    return fail(500, "저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요.");
  }
}
