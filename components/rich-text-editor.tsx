"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "@/lib/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import {
  Bold,
  FileDown,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Sparkles,
  Table as TableIcon,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { saveDocumentVersion } from "@/lib/actions/documents";
import { SuggestionsPanel } from "@/components/suggestions-panel";
import type { Json } from "@/types/database";

const AUTO_SAVE_MS = 30_000;

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface RichTextEditorProps {
  docId: string;
  projectId: string;
  initialTitle: string;
  initialContent?: Json;
  initialVersionId?: string | null;
  autoOpenSuggestions?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded text-sm transition-colors",
        active
          ? "bg-[var(--color-brand-navy)] text-white"
          : "hover:bg-muted text-muted-foreground hover:text-foreground",
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />;
}

export function RichTextEditor({
  docId,
  projectId,
  initialTitle,
  initialContent,
  initialVersionId,
  autoOpenSuggestions = false,
}: RichTextEditorProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(autoOpenSuggestions);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(
    initialVersionId ?? null,
  );

  // Refs to avoid stale closures in the auto-save interval
  const isDirtyRef = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    immediatelyRender: false,
    content: (initialContent as object) ?? "",
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none p-5 min-h-[480px] text-sm",
      },
    },
    onUpdate: () => {
      setIsDirty(true);
      isDirtyRef.current = true;
    },
  });

  const save = useCallback(async () => {
    if (!editor || !isDirtyRef.current) return;

    setSaveStatus("saving");
    const content = editor.getJSON() as Json;

    const result = await saveDocumentVersion(docId, projectId, content);

    if (result.error) {
      setSaveStatus("error");
    } else {
      setSaveStatus("saved");
      setLastSaved(new Date());
      setIsDirty(false);
      isDirtyRef.current = false;
      if (result.versionId) setCurrentVersionId(result.versionId);
    }
  }, [editor, docId, projectId]);

  // Auto-save interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) save();
    }, AUTO_SAVE_MS);
    return () => clearInterval(interval);
  }, [save]);

  async function handleImageUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setIsUploadingImage(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("project_id", projectId);

    try {
      const res = await fetch(`/api/documents/${docId}/images`, {
        method: "POST",
        body: fd,
      });
      const body = (await res.json()) as { url?: string; error?: string };
      if (body.url) {
        editor?.chain().focus().setImage({ src: body.url }).run();
      }
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  function openExportPdf() {
    window.open(`/api/documents/${docId}/export/pdf`, "_blank", "noopener,noreferrer");
  }

  if (!editor) return null;

  const statusText =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "error"
        ? "Save failed — will retry"
        : lastSaved
          ? `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : isDirty
            ? "Unsaved changes"
            : "";

  return (
    <div className="flex gap-0 rounded-lg border overflow-hidden h-[calc(100vh-8rem)]">
      {/* Main editor column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
      {/* Document title */}
      <div className="border-b px-4 py-3">
        <Input
          value={initialTitle}
          readOnly
          className="border-0 p-0 text-xl font-semibold shadow-none focus-visible:ring-0 bg-transparent h-auto"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5 bg-muted/30">
        <ToolbarButton
          title="Undo"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
        >
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
        >
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          title="Insert table (3×3)"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          <TableIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <ToolbarButton
          title="Insert image"
          disabled={isUploadingImage}
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />

        <Divider />

        <ToolbarButton
          title="AI suggestions"
          active={showSuggestions}
          onClick={() => setShowSuggestions((v) => !v)}
        >
          <Sparkles className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto bg-background">
        <EditorContent editor={editor} />
      </div>

      {/* Footer: status + actions */}
      <div className="flex items-center justify-between gap-3 border-t px-4 py-2 bg-muted/20">
        <span
          className={cn(
            "text-xs",
            saveStatus === "error"
              ? "text-destructive"
              : saveStatus === "saved"
                ? "text-green-600 dark:text-green-400"
                : "text-muted-foreground",
          )}
        >
          {statusText}
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={openExportPdf}
          >
            <FileDown className="h-3.5 w-3.5 mr-1" />
            Export PDF
          </Button>
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={saveStatus === "saving" || !isDirty}
            onClick={save}
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => router.push(`/app/projects/${projectId}/documents/${docId}`)}
          >
            View
          </Button>
        </div>
      </div>
      </div>{/* end main editor column */}

      {/* Suggestions panel */}
      {showSuggestions && currentVersionId && (
        <div className="w-80 shrink-0 flex flex-col overflow-hidden border-l">
          <SuggestionsPanel
            docId={docId}
            versionId={currentVersionId}
            projectId={projectId}
            editor={editor}
            onClose={() => setShowSuggestions(false)}
          />
        </div>
      )}
      {showSuggestions && !currentVersionId && (
        <div className="w-80 shrink-0 flex flex-col items-center justify-center gap-2 border-l p-6 text-center text-sm text-muted-foreground">
          <Sparkles className="h-8 w-8 opacity-30" />
          <p>Save your document first to get AI suggestions.</p>
          <Button size="sm" onClick={save} disabled={saveStatus === "saving"}>
            {saveStatus === "saving" ? "Saving…" : "Save now"}
          </Button>
        </div>
      )}
    </div>
  );
}
