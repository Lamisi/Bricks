"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Download,
  FileDown,
  RefreshCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

type Version = {
  id: string;
  version_number: number;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  storage_path: string | null;
  created_by: string;
  created_at: string;
  uploaderName: string;
};

type DocumentMeta = {
  id: string;
  title: string;
  status: string;
};

interface DocumentViewerClientProps {
  document: DocumentMeta;
  versions: Version[];
  initialVersionId: string;
  initialSignedUrl: string | null;
  projectId: string;
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
  initialSignedUrl,
  projectId,
}: DocumentViewerClientProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  const [signedUrl, setSignedUrl] = useState<string | null>(initialSignedUrl);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2); // index into ZOOM_STEPS, default 1×

  const selectedVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[0];

  const isPdf = selectedVersion.mime_type === "application/pdf";
  const isImage = selectedVersion.mime_type?.startsWith("image/") ?? false;
  const isDwg = DWG_MIMES.has(selectedVersion.mime_type ?? "");

  async function fetchSignedUrl(storagePath: string, mode: "view" | "download" = "view") {
    const res = await fetch(
      `/api/documents/signed-url?path=${encodeURIComponent(storagePath)}&projectId=${projectId}&mode=${mode}`,
    );
    const body = (await res.json()) as { url?: string; error?: string };
    if (!body.url) throw new Error(body.error ?? "Could not load file.");
    return body.url;
  }

  async function loadVersion(versionId: string) {
    const version = versions.find((v) => v.id === versionId);
    if (!version?.storage_path) return;

    setSelectedVersionId(versionId);
    setIsLoadingUrl(true);
    setUrlError(null);
    setZoomIndex(2);

    try {
      const url = await fetchSignedUrl(version.storage_path);
      setSignedUrl(url);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Could not load file.");
    } finally {
      setIsLoadingUrl(false);
    }
  }

  async function retryLoad() {
    if (!selectedVersion.storage_path) return;
    setIsLoadingUrl(true);
    setUrlError(null);
    try {
      const url = await fetchSignedUrl(selectedVersion.storage_path);
      setSignedUrl(url);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : "Could not load file.");
    } finally {
      setIsLoadingUrl(false);
    }
  }

  async function download() {
    if (!selectedVersion.storage_path) return;
    try {
      const url = await fetchSignedUrl(selectedVersion.storage_path, "download");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      // silent — user can retry
    }
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
        </div>

        <Button variant="outline" size="sm" onClick={download} disabled={!selectedVersion.storage_path}>
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>

      {/* Main content: viewer + sidebar */}
      <div className="flex gap-4 h-[calc(100vh-14rem)]">
        {/* Viewer panel */}
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted/30 flex flex-col">
          {/* Toolbar (images only) */}
          {isImage && !isLoadingUrl && !urlError && signedUrl && (
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

          {/* Viewer content */}
          <div className="flex-1 overflow-auto">
            {isLoadingUrl ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Loading…</span>
                </div>
              </div>
            ) : urlError ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <p className="text-sm">{urlError}</p>
                <Button variant="outline" size="sm" onClick={retryLoad}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry
                </Button>
              </div>
            ) : isDwg ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FileDown className="h-10 w-10" />
                <p className="text-sm font-medium">DWG files cannot be previewed in the browser.</p>
                <Button variant="outline" size="sm" onClick={download}>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download to view
                </Button>
              </div>
            ) : isPdf && signedUrl ? (
              <iframe
                key={signedUrl}
                src={signedUrl}
                title={document.title}
                className="w-full h-full border-0"
              />
            ) : isImage && signedUrl ? (
              <div className="flex items-start justify-center p-6 min-h-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  key={signedUrl}
                  src={signedUrl}
                  alt={document.title}
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                  }}
                  className={cn(
                    "max-w-full transition-transform duration-150",
                    zoomIndex !== 2 && "cursor-zoom-out",
                  )}
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
          {/* Version history */}
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
                  <div className="font-medium">Version {v.version_number}</div>
                  <div
                    className={cn(
                      "mt-0.5",
                      v.id === selectedVersionId
                        ? "text-white/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {v.uploaderName}
                  </div>
                  <div
                    className={cn(
                      "mt-0.5",
                      v.id === selectedVersionId
                        ? "text-white/60"
                        : "text-muted-foreground/80",
                    )}
                  >
                    {formatDate(v.created_at)}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Metadata */}
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
    </div>
  );
}
