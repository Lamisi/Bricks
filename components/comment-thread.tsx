"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCheck, ChevronDown, ChevronUp, CornerDownRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { postComment, resolveComment, reopenComment } from "@/lib/actions/comments";
import type { CommentRow } from "@/app/api/comments/route";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Thread = CommentRow & { replies: CommentRow[] };

function buildThreads(flat: CommentRow[]): Thread[] {
  const roots: Thread[] = [];
  const map = new Map<string, Thread>();

  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }
  for (const t of Array.from(map.values())) {
    if (t.parent_id && map.has(t.parent_id)) {
      map.get(t.parent_id)!.replies.push(t);
    } else {
      roots.push(t);
    }
  }
  return roots;
}

// ---------------------------------------------------------------------------
// Single comment card
// ---------------------------------------------------------------------------
function CommentCard({
  comment,
  currentUserId,
  projectId,
  docId,
  canResolve,
  onReply,
  onRefresh,
  isReply = false,
}: {
  comment: CommentRow;
  currentUserId: string;
  projectId: string;
  docId: string;
  canResolve: boolean;
  onReply?: (id: string) => void;
  onRefresh: () => void;
  isReply?: boolean;
}) {
  const isResolved = !!comment.resolved_at;
  const isAuthor = comment.created_by === currentUserId;

  async function handleResolve() {
    await resolveComment(comment.id, projectId, docId);
    onRefresh();
  }

  async function handleReopen() {
    await reopenComment(comment.id, projectId, docId);
    onRefresh();
  }

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm transition-colors",
        isResolved ? "bg-muted/40 opacity-60" : "bg-background",
        isReply && "ml-6",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-xs">{comment.authorName}</span>
          <span className="text-muted-foreground text-[11px]">{formatDate(comment.created_at)}</span>
          {isResolved && (
            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded px-1.5 py-0.5 font-medium">
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!isResolved && (isAuthor || canResolve) && (
            <button
              onClick={handleResolve}
              title="Mark as resolved"
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="h-3 w-3" />
            </button>
          )}
          {isResolved && (isAuthor || canResolve) && (
            <button
              onClick={handleReopen}
              title="Reopen"
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <p className="mt-1.5 whitespace-pre-wrap break-words">{comment.body}</p>

      {!isReply && onReply && (
        <button
          onClick={() => onReply(comment.id)}
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <CornerDownRight className="h-3 w-3" />
          Reply
        </button>
      )}

      {isResolved && comment.resolverName && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Resolved by {comment.resolverName}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reply form
// ---------------------------------------------------------------------------
function ReplyForm({
  versionId,
  projectId,
  docId,
  parentId,
  onSubmit,
  onCancel,
}: {
  versionId: string;
  projectId: string;
  docId: string;
  parentId: string;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  async function submit() {
    if (!body.trim()) return;
    setIsPending(true);
    setError(null);
    const result = await postComment(versionId, projectId, docId, body, parentId);
    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSubmit();
    }
  }

  return (
    <div className="ml-6 mt-2 space-y-2">
      <Textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write a reply…"
        rows={2}
        className="text-sm resize-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" className="h-7 text-xs" disabled={isPending || !body.trim()} onClick={submit}>
          {isPending ? "Posting…" : "Reply"}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CommentThread component
// ---------------------------------------------------------------------------
export function CommentThread({
  versionId,
  projectId,
  docId,
  currentUserId,
  canEdit,
}: {
  versionId: string;
  projectId: string;
  docId: string;
  currentUserId: string;
  canEdit: boolean;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // New top-level comment
  const [newBody, setNewBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(
        `/api/comments?versionId=${versionId}&projectId=${projectId}`,
      );
      if (!res.ok) throw new Error("Could not load comments");
      const data = (await res.json()) as CommentRow[];
      setThreads(buildThreads(data));
    } catch {
      setFetchError("Could not load comments");
    } finally {
      setIsLoading(false);
    }
  }, [versionId, projectId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  async function handlePost() {
    if (!newBody.trim()) return;
    setIsPosting(true);
    setPostError(null);
    const result = await postComment(versionId, projectId, docId, newBody);
    setIsPosting(false);
    if (result.error) {
      setPostError(result.error);
    } else {
      setNewBody("");
      fetchComments();
    }
  }

  const openThreads = threads.filter((t) => !t.resolved_at);
  const resolvedThreads = threads.filter((t) => t.resolved_at);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-sm font-semibold">
          Comments
          {!isLoading && (
            <span className="ml-1.5 text-muted-foreground font-normal">
              ({openThreads.length} open)
            </span>
          )}
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Comment list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments…</p>
        ) : fetchError ? (
          <div className="flex items-center gap-2">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" size="sm" onClick={fetchComments}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {threads.length === 0 && (
              <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment.</p>
            )}

            {/* Open threads */}
            <div className="space-y-3">
              {openThreads.map((thread) => (
                <div key={thread.id}>
                  <CommentCard
                    comment={thread}
                    currentUserId={currentUserId}
                    projectId={projectId}
                    docId={docId}
                    canResolve={canEdit}
                    onReply={setReplyingTo}
                    onRefresh={fetchComments}
                  />
                  {/* Replies */}
                  {thread.replies.map((reply) => (
                    <div key={reply.id} className="mt-2">
                      <CommentCard
                        comment={reply}
                        currentUserId={currentUserId}
                        projectId={projectId}
                        docId={docId}
                        canResolve={canEdit}
                        onRefresh={fetchComments}
                        isReply
                      />
                    </div>
                  ))}
                  {/* Reply form */}
                  {replyingTo === thread.id && (
                    <ReplyForm
                      versionId={versionId}
                      projectId={projectId}
                      docId={docId}
                      parentId={thread.id}
                      onSubmit={() => {
                        setReplyingTo(null);
                        fetchComments();
                      }}
                      onCancel={() => setReplyingTo(null)}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Resolved threads toggle */}
            {resolvedThreads.length > 0 && (
              <div>
                <button
                  onClick={() => setShowResolved((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showResolved ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {showResolved ? "Hide" : "Show"} {resolvedThreads.length} resolved
                </button>
                {showResolved && (
                  <div className="mt-2 space-y-3">
                    {resolvedThreads.map((thread) => (
                      <div key={thread.id}>
                        <CommentCard
                          comment={thread}
                          currentUserId={currentUserId}
                          projectId={projectId}
                          docId={docId}
                          canResolve={canEdit}
                          onReply={setReplyingTo}
                          onRefresh={fetchComments}
                        />
                        {thread.replies.map((reply) => (
                          <div key={reply.id} className="mt-2">
                            <CommentCard
                              comment={reply}
                              currentUserId={currentUserId}
                              projectId={projectId}
                              docId={docId}
                              canResolve={canEdit}
                              onRefresh={fetchComments}
                              isReply
                            />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* New comment form */}
        <div className="border-t pt-4 space-y-2">
          <Textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            placeholder="Leave a comment… Use @Name to mention a project member."
            rows={3}
            className="text-sm resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
            }}
          />
          {postError && <p className="text-xs text-destructive">{postError}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">⌘↵ to submit</span>
            <Button
              size="sm"
              className="h-7 text-xs"
              disabled={isPosting || !newBody.trim()}
              onClick={handlePost}
            >
              {isPosting ? "Posting…" : "Comment"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
