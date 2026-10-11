import Link from "next/link";
import Tag from "./Tag";
import { companions, labelOf } from "@/data/options";

export default function LogCard({ log }) {
  return (
    <Link
      href={`/log/${log.id}`}
      className="group flex min-w-0 gap-4 rounded-2xl border border-border bg-surface p-3 transition-shadow hover:shadow-lg"
    >
      <div className={`h-24 w-24 shrink-0 rounded-xl bg-linear-to-br ${log.cover}`} />
      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate font-semibold group-hover:text-brand">{log.title}</h3>
        <p className="line-clamp-2 text-sm text-muted">{log.excerpt}</p>
        <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted">
          <Tag>{labelOf(companions, log.companion)}</Tag>
          <span>{log.author}</span>
          <span>·</span>
          <time dateTime={log.date}>{log.date}</time>
        </div>
      </div>
    </Link>
  );
}
