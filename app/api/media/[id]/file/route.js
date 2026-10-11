import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { resolveUpload } from "@/lib/storage";

// 업로드된 미디어 파일 제공. 영상 탐색(건너뛰기)을 위해 Range 요청을 지원합니다.
export async function GET(request, { params }) {
  const { id } = await params;
  const item = await prisma.mediaItem.findUnique({
    where: { id },
    select: { fileName: true, mimeType: true },
  });
  if (!item?.fileName) return new Response("Not Found", { status: 404 });

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
