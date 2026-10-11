import { driver } from "@/lib/mediaStorage";
import { getCurrentUser } from "@/lib/session";
import { UploadError, saveUploadStream } from "@/lib/storage";
import { verifyUploadToken } from "@/lib/uploadToken";
import { maxUploadBytes } from "@/lib/validation";

const uploadErrors = {
  TOO_LARGE: [413, "파일이 너무 큽니다."],
  BAD_SIGNATURE: [400, "파일 내용이 형식과 맞지 않습니다."],
  EMPTY: [400, "빈 파일입니다."],
};

function fail(status, message) {
  return Response.json({ errors: [message] }, { status });
}

// 2단계(로컬 방식 전용): 파일을 받아 디스크에 바로 저장
//   PUT /api/media/upload/<허가증>   Content-Type: 파일 형식, 본문: 파일 내용
// R2 방식에서는 브라우저가 R2에 직접 올리므로 이 주소를 쓰지 않습니다.
// 본문을 메모리에 모으지 않고 받는 즉시 디스크에 쓰며, 한도 초과·형식 위조는 받는 도중 중단합니다.
export async function PUT(request, { params }) {
  if (driver() !== "local") return fail(404, "사용하지 않는 주소입니다.");

  const user = await getCurrentUser();
  if (!user) return fail(401, "로그인이 필요합니다.");

  const { token } = await params;
  const payload = verifyUploadToken(decodeURIComponent(token));
  if (!payload || payload.uid !== user.id) return fail(403, "업로드 허가가 만료되었거나 올바르지 않습니다.");

  const mimeType = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (mimeType !== payload.mime) return fail(415, "허가받은 파일 형식과 다릅니다.");
  if (!request.body) return fail(400, "파일이 없습니다.");

  const maxBytes = maxUploadBytes(payload.mime);
  const declared = Number(request.headers.get("content-length"));
  if (declared > maxBytes) return fail(413, "파일이 너무 큽니다.");

  try {
    const extension = payload.key.split(".").pop();
    await saveUploadStream(request.body, { extension, mimeType, maxBytes, fileName: payload.key });
    return new Response(null, { status: 200 });
  } catch (error) {
    if (error instanceof UploadError) return fail(...uploadErrors[error.code]);
    // 같은 허가증으로 이미 올린 경우(파일이 이미 있음)
    if (error?.code === "EEXIST") return fail(409, "이미 올라간 파일입니다.");
    console.error("업로드 저장 실패", error);
    return fail(500, "업로드 중 문제가 발생했습니다. 다시 시도하세요.");
  }
}
