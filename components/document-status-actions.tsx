"use client";

import { useState } from "react";
import { useRouter } from "@/lib/navigation";
import { CheckCircle, Clock, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { transitionDocumentStatus } from "@/lib/actions/workflow";
import { getAvailableTransitions, type ProjectRole, type DocumentStatus } from "@/lib/auth/rbac";

const ACTION_LABELS: Partial<Record<DocumentStatus, string>> = {
  in_review: "Submit for Review",
  approved: "Approve",
  changes_requested: "Request Changes",
  submitted: "Submit to Authorities",
};

const ACTION_ICONS: Partial<Record<DocumentStatus, React.ReactNode>> = {
  in_review: <Send className="h-3.5 w-3.5 mr-1.5" />,
  approved: <CheckCircle className="h-3.5 w-3.5 mr-1.5" />,
  changes_requested: <XCircle className="h-3.5 w-3.5 mr-1.5" />,
  submitted: <Clock className="h-3.5 w-3.5 mr-1.5" />,
};

const ACTION_VARIANTS: Partial<Record<DocumentStatus, "default" | "outline" | "destructive">> = {
  in_review: "default",
  approved: "default",
  changes_requested: "outline",
  submitted: "outline",
};

interface DocumentStatusActionsProps {
  docId: string;
  projectId: string;
  currentStatus: DocumentStatus;
  userRole: ProjectRole;
}

export function DocumentStatusActions({
  docId,
  projectId,
  currentStatus,
  userRole,
}: DocumentStatusActionsProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "Request Changes" note form state
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [note, setNote] = useState("");

  const availableTransitions = getAvailableTransitions(userRole, currentStatus);

  if (availableTransitions.length === 0) return null;

  async function handleTransition(newStatus: DocumentStatus, noteText?: string) {
    setIsPending(true);
    setError(null);
    const result = await transitionDocumentStatus(docId, projectId, newStatus, noteText);
    setIsPending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowNoteForm(false);
      setNote("");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {availableTransitions.map((target) => {
          if (target === "changes_requested") {
            // Show inline note form instead of immediately transitioning
            return showNoteForm ? null : (
              <Button
                key={target}
                size="sm"
                variant={ACTION_VARIANTS[target] ?? "outline"}
                disabled={isPending}
                onClick={() => setShowNoteForm(true)}
              >
                {ACTION_ICONS[target]}
                {ACTION_LABELS[target]}
              </Button>
            );
          }
          return (
            <Button
              key={target}
              size="sm"
              variant={ACTION_VARIANTS[target] ?? "default"}
              disabled={isPending}
              onClick={() => handleTransition(target)}
            >
              {ACTION_ICONS[target]}
              {isPending ? "Updating…" : ACTION_LABELS[target]}
            </Button>
          );
        })}
      </div>

      {/* Inline "Request Changes" note form */}
      {showNoteForm && (
        <div className="rounded-md border p-3 bg-muted/30 space-y-2">
          <p className="text-xs font-medium">Describe what needs to change</p>
          <Textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Explain what changes are required…"
            rows={3}
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              disabled={isPending || !note.trim()}
              onClick={() => handleTransition("changes_requested", note)}
            >
              {isPending ? "Sending…" : "Request Changes"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={() => {
                setShowNoteForm(false);
                setNote("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
