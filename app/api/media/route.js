import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { matchesSignature, removeUpload, saveUpload } from "@/lib/storage";
import { UPLOAD_LIMITS, allowedMimeTypes, validateMediaFile } from "@/lib/validation";
import { regions } from "@/data/options";

// 미디어 업로드: multipart/form-data
//   files: 파일(여러 개), caption: 설명, region: 지역, videoType: video | shorts
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ errors: ["로그인이 필요합니다."] }, { status: 401 });

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((f) => typeof f === "object" && "arrayBuffer" in f);
  const caption = String(formData.get("caption") ?? "").trim();
  const region = String(formData.get("region") ?? "");
  const videoType = formData.get("videoType") === "shorts" ? "shorts" : "video";

  const errors = [];
  if (files.length === 0) errors.push("올릴 파일을 선택하세요.");
  if (files.length > UPLOAD_LIMITS.maxFiles) errors.push(`한 번에 최대 ${UPLOAD_LIMITS.maxFiles}개까지 올릴 수 있습니다.`);
  if (!caption) errors.push("설명을 입력하세요.");
  if (caption.length > UPLOAD_LIMITS.captionMax) errors.push(`설명은 ${UPLOAD_LIMITS.captionMax}자 이하로 입력하세요.`);
  if (!regions.includes(region)) errors.push("지역을 선택하세요.");
  for (const file of files) {
    const error = validateMediaFile(file);
    if (error) errors.push(`${file.name}: ${error}`);
  }
  if (errors.length > 0) return Response.json({ errors }, { status: 400 });

  // 모든 파일 내용을 먼저 확인한 뒤 저장
  const buffers = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesSignature(buffer, file.type)) {
      return Response.json({ errors: [`${file.name}: 파일 내용이 형식과 맞지 않습니다.`] }, { status: 400 });
    }
    buffers.push(buffer);
  }

  const saved = [];
  try {
    const created = [];
    for (const [index, file] of files.entries()) {
      const fileName = await saveUpload(buffers[index], allowedMimeTypes[file.type]);
      saved.push(fileName);
      created.push({
        type: file.type.startsWith("image/") ? "photo" : videoType,
        caption,
        region,
        fileName,
        mimeType: file.type,
        size: file.size,
        authorId: user.id,
      });
    }
    await prisma.mediaItem.createMany({ data: created });
  } catch (error) {
    console.error("미디어 저장 실패", error);
    await Promise.all(saved.map(removeUpload));
    return Response.json({ errors: ["저장 중 문제가 발생했습니다. 잠시 후 다시 시도하세요."] }, { status: 500 });
  }

  return Response.json({ count: saved.length }, { status: 201 });
}
