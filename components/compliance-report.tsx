"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type CheckStatus = "pending" | "running" | "complete" | "failed" | "unsupported";

type Issue = {
  id: string;
  severity: "high" | "medium" | "low";
  description: string;
  source_reference: string | null;
  dismissed_at: string | null;
  dismiss_reason: string | null;
};

type Check = {
  id: string;
  status: CheckStatus;
  error: string | null;
  duration_ms: number | null;
};

type ApiResponse = {
  check: Check | null;
  issues: Issue[];
  error?: string;
};

// ---------------------------------------------------------------------------
// Severity config
// ---------------------------------------------------------------------------
const SEVERITY_CONFIG = {
  high: {
    label: "High",
    icon: XCircle,
    classes: "text-destructive bg-destructive/10 border-destructive/20",
    badgeVariant: "destructive" as const,
  },
  medium: {
    label: "Medium",
    icon: AlertTriangle,
    classes: "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800",
    badgeVariant: "outline" as const,
  },
  low: {
    label: "Low",
    icon: Info,
    classes: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    badgeVariant: "outline" as const,
  },
};

// ---------------------------------------------------------------------------
// IssueCard
// ---------------------------------------------------------------------------
function IssueCard({
  issue,
  projectId,
  canDismiss,
  onDismissed,
}: {
  issue: Issue;
  projectId: string;
  canDismiss: boolean;
  onDismissed: (id: string, reason: string) => void;
}) {
  const [showDismiss, setShowDismiss] = useState(false);
  const [reason, setReason] = useState("");
  const [isDismissing, setIsDismissing] = useState(false);

  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;
  const isDismissed = !!issue.dismissed_at;

  async function handleDismiss() {
    if (!reason.trim()) return;
    setIsDismissing(true);
    try {
      const res = await fetch("/api/ai/compliance/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id, projectId, reason: reason.trim() }),
      });
      if (res.ok) {
        onDismissed(issue.id, reason.trim());
        setShowDismiss(false);
        setReason("");
      }
    } finally {
      setIsDismissing(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-md border p-3 text-sm space-y-1.5",
        isDismissed ? "opacity-50 bg-muted border-border" : config.classes,
      )}
    >
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge
              variant={isDismissed ? "outline" : config.badgeVariant}
              className="text-[10px] px-1.5 py-0 h-4"
            >
              {config.label}
            </Badge>
            {isDismissed && (
              <span className="text-[10px] text-muted-foreground">Dismissed</span>
            )}
          </div>
          <p>{issue.description}</p>
          {issue.source_reference && (
            <p className="text-xs text-muted-foreground mt-1 italic">{issue.source_reference}</p>
          )}
          {isDismissed && issue.dismiss_reason && (
            <p className="text-xs text-muted-foreground mt-1">
              Reason: {issue.dismiss_reason}
            </p>
          )}
        </div>
        {!isDismissed && canDismiss && (
          <button
            onClick={() => setShowDismiss((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground shrink-0 flex items-center gap-0.5"
          >
            {showDismiss ? (
              <>
                Cancel <ChevronUp className="h-3 w-3" />
              </>
            ) : (
              <>
                Dismiss <ChevronDown className="h-3 w-3" />
              </>
            )}
          </button>
        )}
      </div>

      {showDismiss && (
        <div className="ml-6 space-y-2 pt-1">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this is a false positive (required)"
            className="text-xs min-h-[60px]"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={!reason.trim() || isDismissing}
            onClick={handleDismiss}
          >
            {isDismissing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Confirm dismiss
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComplianceReport
// ---------------------------------------------------------------------------
export function ComplianceReport({
  versionId,
  projectId,
  canDismiss,
}: {
  versionId: string;
  projectId: string;
  canDismiss: boolean;
}) {
  const [state, setState] = useState<ApiResponse>({ check: null, issues: [] });
  const [isLoading, setIsLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedCheckRef = useRef(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ai/compliance?versionId=${versionId}&projectId=${projectId}`,
      );
      const data = (await res.json()) as ApiResponse;
      setState(data);
      return data;
    } catch {
      return null;
    }
  }, [versionId, projectId]);

  const startCheck = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, projectId }),
      });
      const data = (await res.json()) as ApiResponse & {
        checkId?: string;
        status?: string;
        error?: string;
      };
      // Refresh state from status endpoint
      const refreshed = await fetchStatus();
      if (refreshed) setState(refreshed);
    } finally {
      setIsLoading(false);
    }
  }, [versionId, projectId, fetchStatus]);

  // On version change: fetch status; if none exists, auto-start a check
  useEffect(() => {
    startedCheckRef.current = false;
    if (pollRef.current) clearTimeout(pollRef.current);

    async function init() {
      setIsLoading(true);
      const data = await fetchStatus();
      setIsLoading(false);

      if (!data?.check && !startedCheckRef.current) {
        startedCheckRef.current = true;
        startCheck();
      }
    }

    init();

    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [versionId, fetchStatus, startCheck]);

  // Poll while pending/running
  useEffect(() => {
    const status = state.check?.status;
    if (status === "pending" || status === "running") {
      pollRef.current = setTimeout(async () => {
        const data = await fetchStatus();
        if (data) setState(data);
      }, 3000);
    }
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [state, fetchStatus]);

  function handleDismissed(id: string, reason: string) {
    setState((prev) => ({
      ...prev,
      issues: prev.issues.map((issue) =>
        issue.id === id
          ? { ...issue, dismissed_at: new Date().toISOString(), dismiss_reason: reason }
          : issue,
      ),
    }));
  }

  const { check, issues } = state;
  const openIssues = issues.filter((i) => !i.dismissed_at);
  const dismissedIssues = issues.filter((i) => i.dismissed_at);
  const [showDismissed, setShowDismissed] = useState(false);

  // ── Loading / starting ────────────────────────────────────────────────────
  if (isLoading || check?.status === "pending" || check?.status === "running") {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Running compliance check against Norwegian building regulations…</span>
        </div>
      </div>
    );
  }

  // ── No check yet (shouldn't normally be reached since we auto-start) ──────
  if (!check) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">No compliance check run yet.</span>
        <Button size="sm" variant="outline" onClick={() => { startedCheckRef.current = false; startCheck(); }}>
          <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
          Run check
        </Button>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (check.status === "failed") {
    return (
      <div className="rounded-lg border bg-destructive/10 p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Compliance check failed</p>
            {check.error && (
              <p className="text-xs text-muted-foreground mt-0.5">{check.error}</p>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => { startedCheckRef.current = false; startCheck(); }}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  // ── Unsupported ───────────────────────────────────────────────────────────
  if (check.status === "unsupported") {
    return (
      <div className="rounded-lg border bg-muted p-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium">Manual review required</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This document type cannot be automatically scanned (e.g. scanned image PDF). Please
            verify compliance manually.
          </p>
        </div>
      </div>
    );
  }

  // ── Complete ──────────────────────────────────────────────────────────────
  return (
    <div className="rounded-lg border bg-card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {openIssues.length === 0 ? (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
          )}
          <span className="text-sm font-medium">
            {openIssues.length === 0
              ? "No compliance issues found"
              : `${openIssues.length} compliance issue${openIssues.length !== 1 ? "s" : ""} found`}
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-muted-foreground"
          onClick={() => { startedCheckRef.current = false; startCheck(); }}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Re-check
        </Button>
      </div>

      {openIssues.length > 0 && (
        <div className="space-y-2">
          {openIssues.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              projectId={projectId}
              canDismiss={canDismiss}
              onDismissed={handleDismissed}
            />
          ))}
        </div>
      )}

      {dismissedIssues.length > 0 && (
        <div>
          <button
            onClick={() => setShowDismissed((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {showDismissed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {dismissedIssues.length} dismissed issue{dismissedIssues.length !== 1 ? "s" : ""}
          </button>
          {showDismissed && (
            <div className="space-y-2 mt-2">
              {dismissedIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  projectId={projectId}
                  canDismiss={false}
                  onDismissed={handleDismissed}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
