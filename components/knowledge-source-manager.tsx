"use client";

import { useRef, useState } from "react";
import { CheckCircle, FileText, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Source = {
  id: string;
  title: string;
  description: string | null;
  language: string;
  status: string;
  chunk_count: number;
  source_type: string;
  created_at: string;
};

type IngestResult = {
  sourceId?: string;
  status?: string;
  chunkCount?: number;
  failedChunks?: number;
  error?: string;
  embedError?: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLES: Record<string, string> = {
  ready: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  processing: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  partial: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  failed: "bg-destructive/10 text-destructive",
  pending: "bg-muted text-muted-foreground",
};

export function KnowledgeSourceManager({ initialSources }: { initialSources: Source[] }) {
  const [sources, setSources] = useState<Source[]>(initialSources);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<IngestResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("no");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !title.trim()) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      // Step 1: Get a signed upload URL from the server (small JSON request —
      // no body size limit applies here).
      const urlRes = await fetch(
        `/api/rag/upload-url?fileName=${encodeURIComponent(selectedFile.name)}`,
      );
      const urlBody = (await urlRes.json()) as { signedUrl?: string; storagePath?: string; error?: string };
      if (!urlRes.ok || !urlBody.signedUrl || !urlBody.storagePath) {
        setUploadResult({ error: urlBody.error ?? "Could not get upload URL" });
        setIsUploading(false);
        return;
      }

      // Step 2: Upload the PDF directly to Supabase Storage via the signed URL.
      // This bypasses Next.js entirely — no body-size limits apply.
      const uploadRes = await fetch(urlBody.signedUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type || "application/pdf" },
      });
      if (!uploadRes.ok) {
        setUploadResult({ error: "File upload to storage failed. Please try again." });
        setIsUploading(false);
        return;
      }

      // Step 3: Trigger ingestion with the storage path (small JSON payload).
      const res = await fetch("/api/rag/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storagePath: urlBody.storagePath,
          title: title.trim(),
          language,
          description: description.trim() || undefined,
        }),
      });
      const body = (await res.json()) as IngestResult;
      setUploadResult(body);

      if (!body.error && body.sourceId) {
        // Optimistic: add the new source to the list
        setSources((prev) => [
          {
            id: body.sourceId!,
            title: title.trim(),
            description: description.trim() || null,
            language,
            status: body.status ?? "ready",
            chunk_count: body.chunkCount ?? 0,
            source_type: "pdf",
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        setTitle("");
        setDescription("");
        setSelectedFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    } catch {
      setUploadResult({ error: "Upload failed. Please try again." });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="text-sm font-semibold mb-4">Add knowledge source</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ks-title">Title</Label>
              <Input
                id="ks-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Plan- og bygningsloven 2025"
                required
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="ks-desc">Description (optional)</Label>
              <Input
                id="ks-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ks-lang">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="ks-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Norwegian (Bokmål)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ks-file">PDF file (max 20 MB)</Label>
              <Input
                id="ks-file"
                ref={fileRef}
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          {uploadResult && (() => {
            const isError = !!uploadResult.error || uploadResult.status === "failed";
            const isPartial = uploadResult.status === "partial";
            const isSuccess = uploadResult.status === "ready";
            return (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
                  isError
                    ? "bg-destructive/10 text-destructive"
                    : isPartial
                      ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400"
                      : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
                )}
              >
                {isError || isPartial ? (
                  <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                ) : (
                  <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
                )}
                <span>
                  {uploadResult.error
                    ? uploadResult.error
                    : isSuccess
                      ? `Ingested ${uploadResult.chunkCount} chunks successfully`
                      : `Ingested ${uploadResult.chunkCount ?? 0} chunks (${uploadResult.failedChunks} failed)${uploadResult.embedError ? ` — ${uploadResult.embedError}` : ""}`}
                </span>
              </div>
            );
          })()}

          <Button type="submit" size="sm" disabled={isUploading || !selectedFile || !title.trim()}>
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Ingesting…
              </>
            ) : (
              "Upload & ingest"
            )}
          </Button>
        </form>
      </div>

      {/* Source list */}
      <div className="rounded-lg border bg-card">
        <div className="px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">
            Sources
            <span className="ml-1.5 text-muted-foreground font-normal">({sources.length})</span>
          </h2>
        </div>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4">No knowledge sources yet.</p>
        ) : (
          <div className="divide-y">
            {sources.map((s) => (
              <div key={s.id} className="flex items-start gap-3 px-4 py-3">
                <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{s.title}</span>
                    <span
                      className={cn(
                        "text-[10px] rounded px-1.5 py-0.5 font-medium",
                        STATUS_STYLES[s.status] ?? STATUS_STYLES.pending,
                      )}
                    >
                      {s.status}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {s.language.toUpperCase()}
                    </Badge>
                  </div>
                  {s.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{s.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {s.chunk_count} chunks · {formatDate(s.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
