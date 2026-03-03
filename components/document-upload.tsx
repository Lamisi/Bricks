"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPTED_EXTENSIONS = ".pdf,.png,.jpg,.jpeg,.svg,.dwg";
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/vnd.dwg",
  "application/acad",
  "application/x-acad",
  "application/dwg",
  "application/x-dwg",
];
const MAX_BYTES = 50 * 1024 * 1024;

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "success"; fileName: string; versionNumber: number }
  | { status: "error"; message: string };

interface DocumentUploadProps {
  projectId: string;
  onUploadComplete?: () => void;
}

export function DocumentUpload({ projectId, onUploadComplete }: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });

  function validateFile(file: File): string | null {
    if (!ACCEPTED_MIME_TYPES.includes(file.type) && file.type !== "") {
      return `File type "${file.type}" is not allowed. Accepted: PDF, PNG, JPG, SVG, DWG.`;
    }
    if (file.size > MAX_BYTES) {
      return `File exceeds the 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).`;
    }
    return null;
  }

  function uploadFile(file: File) {
    const validationError = validateFile(file);
    if (validationError) {
      setUploadState({ status: "error", message: validationError });
      return;
    }

    setUploadState({ status: "uploading", progress: 0, fileName: file.name });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("project_id", projectId);

    // Use XHR so we can track upload progress to the API route
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setUploadState({
          status: "uploading",
          progress: Math.round((e.loaded / e.total) * 100),
          fileName: file.name,
        });
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        let versionNumber = 1;
        try {
          const body = JSON.parse(xhr.responseText) as { versionNumber?: number };
          versionNumber = body.versionNumber ?? 1;
        } catch {
          // ignore parse errors
        }
        setUploadState({ status: "success", fileName: file.name, versionNumber });
        onUploadComplete?.();
      } else {
        let message = "Upload failed. Please try again.";
        try {
          const body = JSON.parse(xhr.responseText) as { error?: string };
          if (body.error) message = body.error;
        } catch {
          // ignore
        }
        setUploadState({ status: "error", message });
      }
    });

    xhr.addEventListener("error", () => {
      setUploadState({ status: "error", message: "Network error. Please check your connection and try again." });
    });

    xhr.open("POST", "/api/documents/upload");
    xhr.send(formData);
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  function reset() {
    setUploadState({ status: "idle" });
  }

  const isUploading = uploadState.status === "uploading";

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document"
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading) {
            inputRef.current?.click();
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          isDragging
            ? "border-[var(--color-brand-terracotta)] bg-[var(--color-brand-terracotta)]/5"
            : "border-border hover:border-muted-foreground/50",
          isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        )}
      >
        <Upload className="h-6 w-6 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Drop a file or click to browse</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            PDF, PNG, JPG, SVG, DWG — max 50 MB
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        className="hidden"
        onChange={onInputChange}
        disabled={isUploading}
      />

      {/* Status messages */}
      {uploadState.status === "uploading" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 truncate">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {uploadState.fileName}
            </span>
            <span className="shrink-0 ml-2">{uploadState.progress}%</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-[var(--color-brand-terracotta)] transition-all duration-200"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState.status === "success" && (
        <div className="flex items-center justify-between rounded-md bg-green-50 px-3 py-2 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              <strong>{uploadState.fileName}</strong> uploaded as version{" "}
              {uploadState.versionNumber}
            </span>
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 ml-2" onClick={reset}>
            Upload another
          </Button>
        </div>
      )}

      {uploadState.status === "error" && (
        <div className="flex items-center justify-between rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {uploadState.message}
          </span>
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2 ml-2 text-destructive hover:text-destructive" onClick={reset}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
