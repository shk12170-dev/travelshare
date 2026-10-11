import Link from "next/link";
import CommentForm from "./CommentForm";
import DeleteButton from "./DeleteButton";
import { addComment, deleteComment } from "@/app/actions/interactions";
import { getComments } from "@/lib/queries";

export default async function CommentSection({ logId, logAuthorId, user }) {
  const comments = await getComments(logId);

  return (
    <section aria-labelledby="comments-title" className="flex flex-col gap-4">
      <h2 id="comments-title" className="text-lg font-bold">
        댓글 {comments.length}
      </h2>

      {comments.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted">
                  <span className="font-semibold text-foreground">{comment.author}</span> ·{" "}
                  <time dateTime={comment.date}>{comment.date}</time>
                </p>
                {user && (user.id === comment.authorId || user.id === logAuthorId) && (
                  <DeleteButton action={deleteComment.bind(null, comment.id)} confirmMessage="댓글을 삭제할까요?" />
                )}
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6">{comment.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">아직 댓글이 없습니다. 첫 댓글을 남겨 보세요.</p>
      )}

      {user ? (
        <CommentForm action={addComment.bind(null, logId)} />
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">
          <Link href={`/login?next=${encodeURIComponent(`/log/${logId}`)}`} className="font-semibold text-brand">
            로그인
          </Link>
          하고 댓글을 남겨 보세요.
        </p>
      )}
    </section>
  );
}
