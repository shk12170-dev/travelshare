// 브라우저에서 파일 하나를 올리는 공통 절차: 허가 받기 → 저장소에 직접 올리기 → 게시 확인
// 사진 올리기 화면과 로그 작성 화면이 함께 사용합니다. 실패하면 사용자에게 보여 줄 문장을 담은 Error를 던집니다.
import { shrinkImage } from "./clientImage";

export class UploadFailure extends Error {
  constructor(message, status = 0) {
    super(message);
    this.status = status;
  }
}

async function sendFile(upload, file) {
  if (upload.method === "blob") {
    // Vercel Blob: 일회용 토큰으로 Blob 저장소에 직접 업로드 (우리 서버를 거치지 않음)
    try {
      const { put } = await import("@vercel/blob/client");
      await put(upload.pathname, file, { access: "public", token: upload.token, contentType: upload.contentType });
      return null;
    } catch (error) {
      console.error("Blob 업로드 실패", error);
      return "파일을 올리지 못했습니다.";
    }
  }
  const sent = await fetch(upload.url, { method: upload.method, headers: upload.headers, body: file });
  if (sent.ok) return null;
  const data = await sent.json().catch(() => ({}));
  return data.errors?.[0] ?? "파일을 올리지 못했습니다.";
}

// meta: 일반 게시는 { caption, region, videoType }, 로그 첨부용 임시 사진은 { draft: true }
// 결과: { id }
export async function uploadFile(original, meta) {
  const file = await shrinkImage(original);

  const permit = await fetch("/api/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...meta, contentType: file.type, size: file.size }),
  });
  const permitData = await permit.json().catch(() => ({}));
  if (!permit.ok) throw new UploadFailure(permitData.errors?.[0] ?? "업로드를 시작하지 못했습니다.", permit.status);

  const sentError = await sendFile(permitData.upload, file);
  if (sentError) throw new UploadFailure(sentError);

  const published = await fetch("/api/media", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: permitData.token }),
  });
  const data = await published.json().catch(() => ({}));
  if (!published.ok) throw new UploadFailure(data.errors?.[0] ?? "게시하지 못했습니다.", published.status);
  return { id: data.id };
}
