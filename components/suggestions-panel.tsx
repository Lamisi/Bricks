"use client";

import { experimental_useObject as useObject } from "@ai-sdk/react";
import { z } from "zod";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  Info,
  Loader2,
  RefreshCw,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { logSuggestionAction } from "@/lib/actions/suggestions";
import type { Editor } from "@tiptap/react";

// ---------------------------------------------------------------------------
// Schema (mirrors route.ts — keeps client bundle free of server imports)
// ---------------------------------------------------------------------------
const SuggestionSchema = z.object({
  type: z.enum(["missing_section", "unclear", "non_compliant"]),
  description: z.string(),
  recommended_fix: z.string(),
  source_reference: z.string().nullable(),
});

const SuggestionsOutputSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

type Suggestion = z.infer<typeof SuggestionSchema>;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TYPE_CONFIG = {
  missing_section: {
    label: "Missing section",
    icon: FileSearch,
    badgeClass: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  },
  unclear: {
    label: "Unclear",
    icon: Info,
    badgeClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  },
  non_compliant: {
    label: "Non-compliant",
    icon: AlertTriangle,
    badgeClass: "bg-destructive/10 text-destructive",
  },
};

// ---------------------------------------------------------------------------
// SuggestionCard
// ---------------------------------------------------------------------------
function SuggestionCard({
  suggestion,
  index,
  documentId,
  versionId,
  editor,
  onAccepted,
  onDismissed,
}: {
  suggestion: Partial<Suggestion>;
  index: number;
  documentId: string;
  versionId: string;
  editor: Editor;
  onAccepted: (index: number) => void;
  onDismissed: (index: number) => void;
}) {
  const type = suggestion.type ?? "unclear";
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  const description = suggestion.description ?? "";
  const recommendedFix = suggestion.recommended_fix ?? "";
  const sourceRef = suggestion.source_reference;

  const isStreaming = !suggestion.description || !suggestion.recommended_fix;

  async function handleAccept() {
    if (!recommendedFix) return;
    // Insert recommended fix at the end of the document
    editor.chain().focus().setTextSelection(editor.state.doc.content.size).insertContent(
      `<p><strong>[AI suggestion: ${type.replace("_", " ")}]</strong> ${recommendedFix}</p>`,
    ).run();
    onAccepted(index);
    await logSuggestionAction(
      documentId,
      versionId,
      type as "missing_section" | "unclear" | "non_compliant",
      description,
      recommendedFix,
      "accepted",
    );
  }

  async function handleDismiss() {
    onDismissed(index);
    if (description && recommendedFix) {
      await logSuggestionAction(
        documentId,
        versionId,
        type as "missing_section" | "unclear" | "non_compliant",
        description,
        recommendedFix,
        "dismissed",
      );
    }
  }

  return (
    <div className="rounded-md border bg-card p-3 space-y-2 text-sm">
      <div className="flex items-start gap-2">
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0 space-y-1">
          <span
            className={cn(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
              config.badgeClass,
            )}
          >
            {config.label}
          </span>
          {description ? (
            <p className="text-xs leading-relaxed">{description}</p>
          ) : (
            <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
          )}
        </div>
      </div>

      {recommendedFix ? (
        <div className="bg-muted/50 rounded p-2 text-xs leading-relaxed border-l-2 border-muted-foreground/30">
          <span className="text-muted-foreground text-[10px] block mb-0.5">Recommended fix</span>
          {recommendedFix}
        </div>
      ) : (
        <div className="bg-muted/50 rounded p-2 space-y-1.5">
          <div className="h-2.5 bg-muted animate-pulse rounded w-full" />
          <div className="h-2.5 bg-muted animate-pulse rounded w-4/5" />
        </div>
      )}

      {sourceRef && (
        <p className="text-[10px] text-muted-foreground italic">{sourceRef}</p>
      )}

      {!isStreaming && (
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            className="h-6 text-xs px-2"
            onClick={handleAccept}
            disabled={!recommendedFix}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Apply
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={handleDismiss}>
            <X className="h-3 w-3 mr-1" />
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SuggestionsPanel
// ---------------------------------------------------------------------------
export function SuggestionsPanel({
  docId,
  versionId,
  projectId,
  editor,
  onClose,
}: {
  docId: string;
  versionId: string;
  projectId: string;
  editor: Editor;
  onClose: () => void;
}) {
  const { object, submit, isLoading, error, stop } = useObject({
    api: "/api/ai/suggestions",
    schema: SuggestionsOutputSchema,
  });

  const suggestions = (object?.suggestions ?? []).filter(
    (s): s is NonNullable<typeof s> => s !== undefined,
  );
  const [dismissed, setDismissed] = React.useState<Set<number>>(new Set());
  const [accepted, setAccepted] = React.useState<Set<number>>(new Set());

  const visibleSuggestions = suggestions.filter(
    (_, i) => !dismissed.has(i) && !accepted.has(i),
  );
  const doneCount = dismissed.size + accepted.size;

  function handleStart() {
    setDismissed(new Set());
    setAccepted(new Set());
    submit({ versionId, projectId });
  }

  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileSearch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">AI Suggestions</span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Initial state */}
        {!isLoading && suggestions.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center text-muted-foreground">
            <FileSearch className="h-10 w-10 opacity-30" />
            <div>
              <p className="text-sm font-medium text-foreground">Get AI suggestions</p>
              <p className="text-xs mt-1">
                Claude will review your document and suggest improvements grounded in Norwegian
                building regulations.
              </p>
            </div>
            <Button size="sm" onClick={handleStart}>
              <ChevronRight className="h-3.5 w-3.5 mr-1.5" />
              Analyse document
            </Button>
          </div>
        )}

        {/* Loading — first suggestion not yet arrived */}
        {isLoading && suggestions.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>Analysing document…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">Analysis failed</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Could not generate suggestions. Please try again.
              </p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <>
            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Generating suggestions…</span>
              </div>
            )}
            {!isLoading && doneCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {accepted.size} applied · {dismissed.size} dismissed
              </p>
            )}
            {visibleSuggestions.length === 0 && !isLoading && (
              <div className="flex flex-col items-center gap-3 py-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <p className="text-sm">All suggestions handled.</p>
              </div>
            )}
            {suggestions.map((s, i) =>
              dismissed.has(i) || accepted.has(i) ? null : (
                <SuggestionCard
                  key={i}
                  index={i}
                  suggestion={s}
                  documentId={docId}
                  versionId={versionId}
                  editor={editor}
                  onAccepted={(idx) => setAccepted((prev) => new Set(Array.from(prev).concat(idx)))}
                  onDismissed={(idx) => setDismissed((prev) => new Set(Array.from(prev).concat(idx)))}
                />
              ),
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {(suggestions.length > 0 || isLoading || error) && (
        <div className="px-4 py-3 border-t flex items-center gap-2 shrink-0">
          {isLoading ? (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleStart}
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Re-analyse
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// React import needed for useState
// ---------------------------------------------------------------------------
import React from "react";
