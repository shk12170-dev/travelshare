import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { removeUpload } from "@/lib/storage";

// 미디어 삭제: 본인이 올린 것만 가능
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ errors: ["로그인이 필요합니다."] }, { status: 401 });

  const { id } = await params;
  const item = await prisma.mediaItem.findUnique({ where: { id }, select: { authorId: true, fileName: true } });
  if (!item) return Response.json({ errors: ["이미 삭제되었거나 없는 미디어입니다."] }, { status: 404 });
  if (item.authorId !== user.id) {
    return Response.json({ errors: ["본인이 올린 미디어만 삭제할 수 있습니다."] }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.like.deleteMany({ where: { targetType: "media", targetId: id } }),
    prisma.mediaItem.delete({ where: { id } }),
  ]);
  if (item.fileName) await removeUpload(item.fileName);
  return new Response(null, { status: 204 });
}
