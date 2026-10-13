import Link from "next/link";
import Tag from "./Tag";
import { companions, labelOf } from "@/data/options";

export default function LogCard({ log }) {
  return (
    <Link
      href={`/log/${log.id}`}
      className="group flex min-w-0 gap-4 rounded-2xl border border-border bg-surface p-3 transition-shadow hover:shadow-lg"
    >
      <div className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-linear-to-br ${log.cover}`}>
        {log.photos?.[0] && (
          // 사용자가 올린 사진 주소(저장소로 이동)라 일반 img 사용
          // eslint-disable-next-line @next/next/no-img-element
          <img src={log.photos[0].src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate font-semibold group-hover:text-brand">{log.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{log.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          <Tag>{labelOf(companions, log.companion)}</Tag>
          <span>{log.author}</span>
          <span>·</span>
          <time dateTime={log.date}>{log.date}</time>
          <span className="ml-auto">
            <span aria-hidden>♥</span>
            <span className="sr-only">좋아요</span> {log.likes} · <span aria-hidden>💬</span>
            <span className="sr-only">댓글</span> {log.commentCount ?? 0}
          </span>
        </div>
      </div>
    </Link>
  );
}
