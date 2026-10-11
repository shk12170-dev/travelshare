import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { viewUrl } from "@/lib/mediaStorage";
import { resolveUpload } from "@/lib/storage";

// 업로드된 미디어 파일 제공.
// - R2 방식: 서명된 보기 주소로 이동(302). 파일 전송은 R2가 직접 처리해 우리 서버 사용량이 늘지 않음
// - 로컬 방식: 서버가 직접 전송. 영상 탐색(건너뛰기)을 위해 Range 요청을 지원
export async function GET(request, { params }) {
  const { id } = await params;
  const item = await prisma.mediaItem.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true },
  });
  if (!item?.fileName) return new Response("Not Found", { status: 404 });

  const remote = await viewUrl(item.fileName);
  if (remote) {
    // 같은 주소가 1시간 단위로 유지되므로 브라우저·CDN이 이미지를 다시 받지 않고 재사용할 수 있음
    return new Response(null, { status: 302, headers: { Location: remote, "Cache-Control": "public, max-age=300, s-maxage=300" } });
  }

  const filePath = resolveUpload(item.fileName);
  let size;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const headers = {
    "Content-Type": item.mimeType,
    "Accept-Ranges": "bytes",
    // 삭제된 파일이 브라우저·CDN에 오래 남지 않도록 1시간만 캐시
    "Cache-Control": "public, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (range && (range[1] || range[2])) {
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(filePath));
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
