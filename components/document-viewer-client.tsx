"use client";

import { useState } from "react";
import DOMPurify from "dompurify";
import {
  ChevronLeft,
  Download,
  FileDown,
  Pencil,
  RefreshCw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CommentThread } from "@/components/comment-thread";
import { ComplianceReport } from "@/components/compliance-report";
import { DocumentStatusActions } from "@/components/document-status-actions";
import type { ProjectRole, DocumentStatus } from "@/lib/auth/rbac";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  submitted: "Submitted",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type ContentType = "file" | "rich_text";

type Version = {
  id: string;
  version_number: number;
  content_type: ContentType;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  created_by: string;
  created_at: string;
  uploaderName: string;
};

type InitialContent =
  | { type: "file"; url: string }
  | { type: "rich_text"; html: string }
  | null;

type LoadedContent = InitialContent;

type DocumentMeta = {
  id: string;
  title: string;
  status: string;
};

interface DocumentViewerClientProps {
  document: DocumentMeta;
  versions: Version[];
  initialVersionId: string;
  initialContent: InitialContent;
  projectId: string;
  canEdit: boolean;
  currentUserId: string;
  userRole: ProjectRole;
  canDismissCompliance: boolean;
}

const DWG_MIMES = new Set([
  "image/vnd.dwg",
  "application/acad",
  "application/x-acad",
  "application/dwg",
  "application/x-dwg",
]);

const ZOOM_STEPS = [0.5, 0.75, 1, 1.5, 2, 3, 4];

export function DocumentViewerClient({
  document,
  versions,
  initialVersionId,
  initialContent,
  projectId,
  canEdit,
  currentUserId,
  userRole,
  canDismissCompliance,
}: DocumentViewerClientProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  const [content, setContent] = useState<LoadedContent>(initialContent);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2); // default 1×

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[0];

  const isPdf = selectedVersion.mime_type === "application/pdf";
  const isImage = selectedVersion.mime_type?.startsWith("image/") ?? false;
  const isDwg = DWG_MIMES.has(selectedVersion.mime_type ?? "");
  const isRichText = selectedVersion.content_type === "rich_text";

  async function loadVersion(versionId: string) {
    setSelectedVersionId(versionId);
    setIsLoading(true);
    setLoadError(null);
    setZoomIndex(2);

    try {
      const res = await fetch(
        `/api/documents/version-content?versionId=${versionId}&projectId=${projectId}`,
      );
      const body = (await res.json()) as LoadedContent & { error?: string };
      if ("error" in body && body.error) throw new Error(body.error);
      setContent(body);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load version.");
    } finally {
      setIsLoading(false);
    }
  }

  async function retry() {
    await loadVersion(selectedVersionId);
  }

  async function download() {
    if (!selectedVersion.storage_path) return;
    const res = await fetch(
      `/api/documents/signed-url?path=${encodeURIComponent(selectedVersion.storage_path)}&projectId=${projectId}&mode=download`,
    );
    const body = (await res.json()) as { url?: string };
    if (body.url) window.open(body.url, "_blank", "noopener,noreferrer");
  }

  function openPdfExport() {
    window.open(
      `/api/documents/${document.id}/export/pdf`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const zoom = ZOOM_STEPS[zoomIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <Link
            href={`/app/projects/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to project
          </Link>
          <h1 className="text-xl font-semibold">{document.title}</h1>
          <Badge variant="outline" className="text-xs">
            {STATUS_LABELS[document.status] ?? document.status}
          </Badge>
          <DocumentStatusActions
            docId={document.id}
            projectId={projectId}
            currentStatus={document.status as DocumentStatus}
            userRole={userRole}
          />
        </div>

        <div className="flex items-center gap-2">
          {canEdit && isRichText && document.status !== "approved" && (
            <>
              <Button variant="ghost" size="sm" onClick={openPdfExport}>
                <FileDown className="h-4 w-4 mr-1.5" />
                Export PDF
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/projects/${projectId}/documents/${document.id}/edit?suggestions=1`}>
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  AI suggestions
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/projects/${projectId}/documents/${document.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  Edit
                </Link>
              </Button>
            </>
          )}
          {canEdit && isRichText && document.status === "approved" && (
            <Button variant="ghost" size="sm" onClick={openPdfExport}>
              <FileDown className="h-4 w-4 mr-1.5" />
              Export PDF
            </Button>
          )}
          {!isRichText && selectedVersion.storage_path && (
            <Button variant="outline" size="sm" onClick={download}>
              <Download className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Main: viewer + sidebar */}
      <div className="flex gap-4 h-[calc(100vh-16rem)]">
        {/* Viewer panel */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted/30 flex flex-col">
          {/* Zoom toolbar — images only */}
          {isImage && !isLoading && !loadError && content?.type === "file" && content.url && (
            <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-background shrink-0">
              <span className="text-xs text-muted-foreground mr-2">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={zoomIndex === 0}
                onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={zoomIndex === ZOOM_STEPS.length - 1}
                onClick={() => setZoomIndex((i) => Math.min(ZOOM_STEPS.length - 1, i + 1))}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 ml-1"
                disabled={zoomIndex === 2}
                onClick={() => setZoomIndex(2)}
              >
                Reset
              </Button>
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              </div>
            ) : loadError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <p className="text-sm">{loadError}</p>
                <Button variant="outline" size="sm" onClick={retry}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : isRichText && content?.type === "rich_text" ? (
              <div
                className="tiptap-content p-6 max-w-3xl mx-auto"
                // HTML is generated server-side from Tiptap JSON (no raw HTML nodes).
                // DOMPurify sanitizes as defence-in-depth; it returns the input
                // unchanged in environments without a DOM (SSR).
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content.html) }}
              />
            ) : isDwg ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FileDown className="h-10 w-10" />
                <p className="text-sm font-medium">
                  DWG files cannot be previewed in the browser.
                </p>
                <Button variant="outline" size="sm" onClick={download}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download to view
                </Button>
              </div>
            ) : isPdf && content?.type === "file" && content.url ? (
              <iframe
                key={content.url}
                src={content.url}
                title={document.title}
                className="w-full h-full border-0"
              />
            ) : isImage && content?.type === "file" && content.url ? (
              <div className="flex items-start justify-center p-6 min-h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={content.url}
                  src={content.url}
                  alt={document.title}
                  style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                  className="max-w-full transition-transform duration-150"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No preview available.
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="w-64 shrink-0 flex flex-col gap-3 overflow-y-auto">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Version history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 p-2">
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => v.id !== selectedVersionId && loadVersion(v.id)}
                  className={cn(
                    "w-full text-left rounded-md px-3 py-2 text-xs transition-colors",
                    v.id === selectedVersionId
                      ? "bg-[var(--color-brand-navy)] text-white"
                      : "hover:bg-muted",
                  )}
                >
                  <div className="font-medium flex items-center gap-1.5">
                    Version {v.version_number}
                    <span
                      className={cn(
                        "text-[10px] rounded px-1 py-0.5",
                        v.id === selectedVersionId ? "bg-white/20" : "bg-muted",
                      )}
                    >
                      {v.content_type === "rich_text" ? "text" : "file"}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-0.5",
                      v.id === selectedVersionId ? "text-white/70" : "text-muted-foreground",
                    )}
                  >
                    {v.uploaderName}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5",
                      v.id === selectedVersionId ? "text-white/60" : "text-muted-foreground/80",
                    )}
                  >
                    {formatDate(v.created_at)}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <div>
                <div className="text-muted-foreground">Version</div>
                <div className="font-medium">v{selectedVersion.version_number}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Uploaded by</div>
                <div className="font-medium">{selectedVersion.uploaderName}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Date</div>
                <div className="font-medium">{formatDate(selectedVersion.created_at)}</div>
              </div>
              {selectedVersion.file_name && (
                <div>
                  <div className="text-muted-foreground">File</div>
                  <div className="font-medium break-all">{selectedVersion.file_name}</div>
                </div>
              )}
              {selectedVersion.file_size !== null && (
                <div>
                  <div className="text-muted-foreground">Size</div>
                  <div className="font-medium">{formatBytes(selectedVersion.file_size)}</div>
                </div>
              )}
              <div>
                <div className="text-muted-foreground">Status</div>
                <div className="font-medium">
                  {STATUS_LABELS[document.status] ?? document.status}
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
      {/* Compliance report */}
      <div className="space-y-1.5">
        <h2 className="text-sm font-semibold">Compliance Check</h2>
        <ComplianceReport
          versionId={selectedVersionId}
          projectId={projectId}
          canDismiss={canDismissCompliance}
        />
      </div>

      {/* Comments section */}
      <CommentThread
        versionId={selectedVersionId}
        projectId={projectId}
        docId={document.id}
        currentUserId={currentUserId}
        canEdit={canEdit}
      />
    </div>
  );
}
