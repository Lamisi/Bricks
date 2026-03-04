"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { createDocumentForGeneration, saveDocumentVersion } from "@/lib/actions/documents";
import type { Json } from "@/types/database";

// ---------------------------------------------------------------------------
// Markdown → HTML (minimal subset for Tiptap)
// ---------------------------------------------------------------------------
function markdownToHtml(text: string): string {
  const lines = text.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3>${esc(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2>${esc(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1>${esc(line.slice(2))}</h1>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${esc(line.slice(2))}</li>`);
    } else if (line === "") {
      if (inList) { html.push("</ul>"); inList = false; }
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<p>${esc(line)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = "wizard" | "generating" | "editing";

interface WizardValues {
  title: string;
  projectType: string;
  municipality: string;
  scope: string;
  specs: string;
  language: string;
}

// ---------------------------------------------------------------------------
// DocumentGenerator
// ---------------------------------------------------------------------------
export function DocumentGenerator({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("wizard");
  const [docId, setDocId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const accumulatedRef = useRef("");

  const [values, setValues] = useState<WizardValues>({
    title: "",
    projectType: "",
    municipality: "",
    scope: "",
    specs: "",
    language: "no",
  });

  const editor = useEditor({
    extensions: [StarterKit],
    editorProps: {
      attributes: {
        class: "tiptap-content focus:outline-none p-6 min-h-[400px] text-sm",
      },
    },
    editable: false,
  });

  // Throttled update of Tiptap content during streaming
  const lastUpdateRef = useRef(0);
  const updateEditor = useCallback(
    (text: string) => {
      if (!editor) return;
      const now = Date.now();
      if (now - lastUpdateRef.current < 300) return; // throttle to ~3 fps
      lastUpdateRef.current = now;
      editor.commands.setContent(markdownToHtml(text), { emitUpdate: false });
    },
    [editor],
  );

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { title, projectType, municipality, scope, specs, language } = values;
    if (!title.trim() || !projectType || !municipality.trim() || !scope.trim()) return;

    // 1. Create document record
    const result = await createDocumentForGeneration(projectId, title.trim());
    if (result.error || !result.docId) {
      setError(result.error ?? "Could not create document");
      return;
    }
    const newDocId = result.docId;
    setDocId(newDocId);
    setStep("generating");
    accumulatedRef.current = "";

    // 2. Stream generation
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, projectType, municipality, scope, specs, language }),
      });

      if (!res.ok) {
        setError("Generation failed. Please try again.");
        setStep("wizard");
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setError("Streaming not supported in this browser.");
        setStep("wizard");
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulatedRef.current += chunk;
        updateEditor(accumulatedRef.current);
      }

      // Final content update
      if (editor) {
        editor.commands.setContent(markdownToHtml(accumulatedRef.current), { emitUpdate: false });
        editor.setEditable(true);
      }

      // 3. Auto-save
      setIsSaving(true);
      const content = editor?.getJSON() as Json;
      const saveResult = await saveDocumentVersion(newDocId, projectId, content);
      setIsSaving(false);

      if (saveResult.versionId) setVersionId(saveResult.versionId);

      setStep("editing");
    } catch {
      setError("Generation failed. Please try again.");
      setStep("wizard");
    }
  }

  async function handleRetry() {
    setError(null);
    setStep("wizard");
    setDocId(null);
    accumulatedRef.current = "";
    editor?.commands.clearContent();
    editor?.setEditable(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => { editor?.destroy(); };
  }, [editor]);

  const canSubmit =
    values.title.trim() &&
    values.projectType &&
    values.municipality.trim() &&
    values.scope.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/app/projects/${projectId}/documents/new`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-muted-foreground" />
          Generate document
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Describe your project and Claude will generate a compliant first draft referencing
          Norwegian building regulations.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Step 1: Wizard ───────────────────────────────────────────────── */}
      {step === "wizard" && (
        <form onSubmit={handleGenerate} className="rounded-lg border bg-card p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Title */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="gen-title">Document title</Label>
              <Input
                id="gen-title"
                value={values.title}
                onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
                placeholder="e.g. Søknad om rammetillatelse – Eikeveien 12"
                required
              />
            </div>

            {/* Project type */}
            <div className="space-y-1.5">
              <Label htmlFor="gen-type">Project type</Label>
              <Select
                value={values.projectType}
                onValueChange={(val) => setValues((v) => ({ ...v, projectType: val }))}
              >
                <SelectTrigger id="gen-type">
                  <SelectValue placeholder="Select type…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential_building">Residential building</SelectItem>
                  <SelectItem value="commercial_building">Commercial / office building</SelectItem>
                  <SelectItem value="renovation">Renovation / rehabilitation</SelectItem>
                  <SelectItem value="extension">Building extension</SelectItem>
                  <SelectItem value="infrastructure">Infrastructure / civil works</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Municipality */}
            <div className="space-y-1.5">
              <Label htmlFor="gen-municipality">Municipality</Label>
              <Input
                id="gen-municipality"
                value={values.municipality}
                onChange={(e) => setValues((v) => ({ ...v, municipality: e.target.value }))}
                placeholder="e.g. Oslo, Bergen, Trondheim"
                required
              />
            </div>

            {/* Scope */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="gen-scope">Project scope</Label>
              <Textarea
                id="gen-scope"
                value={values.scope}
                onChange={(e) => setValues((v) => ({ ...v, scope: e.target.value }))}
                placeholder="Describe what you are building — purpose, location, context…"
                className="min-h-[80px]"
                required
              />
            </div>

            {/* Specs */}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="gen-specs">
                Key structural specifications{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="gen-specs"
                value={values.specs}
                onChange={(e) => setValues((v) => ({ ...v, specs: e.target.value }))}
                placeholder="e.g. 3 floors, 450 m² footprint, timber frame, 12 residential units…"
                className="min-h-[60px]"
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <Label htmlFor="gen-lang">Document language</Label>
              <Select
                value={values.language}
                onValueChange={(val) => setValues((v) => ({ ...v, language: val }))}
              >
                <SelectTrigger id="gen-lang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">Norwegian (Bokmål)</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" disabled={!canSubmit}>
            <Sparkles className="h-4 w-4 mr-1.5" />
            Generate document
          </Button>
        </form>
      )}

      {/* ── Step 2: Generating / Step 3: Editing ─────────────────────────── */}
      {(step === "generating" || step === "editing") && (
        <div className="space-y-3">
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {step === "generating" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {isSaving ? "Saving draft…" : "Generating document…"}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-foreground font-medium">Draft ready — you can edit it now</span>
                </>
              )}
            </div>

            {step === "editing" && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleRetry}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/app/projects/${projectId}/documents/${docId}/edit`,
                    )
                  }
                >
                  Open in editor
                </Button>
              </div>
            )}
          </div>

          {/* Streaming preview / editor */}
          <div
            className={cn(
              "rounded-lg border overflow-hidden",
              step === "generating" && "opacity-80",
            )}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      )}
    </div>
  );
}
