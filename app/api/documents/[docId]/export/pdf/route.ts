import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { tiptapJsonToHtml } from "@/lib/tiptap/html";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;
  const { searchParams } = new URL(request.url);
  const versionId = searchParams.get("versionId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Fetch document + project name (RLS enforces project membership)
  const { data: doc } = await supabase
    .from("documents")
    .select("id, title, status, project_id, projects(name)")
    .eq("id", docId)
    .single();

  if (!doc) return new NextResponse("Not found", { status: 404 });

  const role = await getUserProjectRole(supabase, doc.project_id);
  if (!role) return new NextResponse("Forbidden", { status: 403 });

  const projectName =
    (Array.isArray(doc.projects) ? doc.projects[0]?.name : (doc.projects as { name: string } | null)?.name) ?? "";

  // Fetch the requested version (or latest rich_text version as fallback)
  const admin = createAdminClient();
  let versionQuery = admin
    .from("document_versions")
    .select("id, rich_text_json, version_number, created_at")
    .eq("document_id", docId)
    .eq("content_type", "rich_text");

  if (versionId) {
    versionQuery = versionQuery.eq("id", versionId);
  } else {
    versionQuery = versionQuery.order("version_number", { ascending: false }).limit(1);
  }

  const { data: version } = await versionQuery.maybeSingle();

  if (!version?.rich_text_json) {
    return new NextResponse("No rich-text content found.", { status: 404 });
  }

  const html = tiptapJsonToHtml(version.rich_text_json);
  const date = new Date(version.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Build a filename-friendly title for the browser's "Save as PDF" dialog
  const slug = (s: string) => s.replace(/[^a-zA-Z0-9\u00C0-\u024F]+/g, "_").replace(/^_+|_+$/g, "");
  const pageTitle = [slug(projectName), slug(doc.title), `v${version.version_number}`]
    .filter(Boolean)
    .join("_");

  console.log("PDF export:", { documentId: docId, versionNumber: version.version_number, userId: user.id });

  // Return a server-rendered HTML page with print styles.
  // The browser auto-triggers the print dialog (window.print on load);
  // the user saves it as PDF. The <title> becomes the suggested filename.
  const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a1a1a;
      margin: 0;
      padding: 2.5cm 3cm;
      max-width: 900px;
    }
    header { border-bottom: 2px solid #0F2D5E; padding-bottom: 0.75rem; margin-bottom: 1.5rem; }
    header .project { font-size: 0.75rem; font-weight: 600; color: #0F2D5E; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.2rem; }
    header h1 { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.2rem; color: #1a1a1a; }
    header p  { font-size: 0.8rem; color: #666; margin: 0; }
    h1 { font-size: 1.4rem; font-weight: 700; margin: 1.2rem 0 0.4rem; }
    h2 { font-size: 1.15rem; font-weight: 600; margin: 1rem 0 0.35rem; }
    h3 { font-size: 1rem; font-weight: 600; margin: 0.85rem 0 0.3rem; }
    p  { margin: 0.5rem 0; }
    ul, ol { padding-left: 1.5rem; margin: 0.5rem 0; }
    li { margin: 0.15rem 0; }
    strong { font-weight: 700; }
    em { font-style: italic; }
    blockquote { border-left: 3px solid #ddd; padding-left: 1rem; color: #555; margin: 0.75rem 0; }
    code { background: #f5f5f5; border-radius: 3px; font-family: monospace; font-size: 0.875em; padding: 0.1em 0.3em; }
    pre  { background: #f5f5f5; border-radius: 4px; padding: 0.75rem; overflow-x: auto; margin: 0.75rem 0; }
    pre code { background: none; padding: 0; }
    img  { max-width: 100%; border-radius: 4px; margin: 0.5rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 0.75rem 0; font-size: 0.9em; }
    th, td { border: 1px solid #ddd; padding: 0.35rem 0.6rem; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    @media print {
      body { padding: 0; }
      @page { margin: 2cm 2.5cm; }
    }
  </style>
</head>
<body>
  <header>
    ${projectName ? `<p class="project">${escapeHtml(projectName)}</p>` : ""}
    <h1>${escapeHtml(doc.title)}</h1>
    <p>Version ${version.version_number} &middot; ${date} &middot; Status: ${escapeHtml(doc.status)}</p>
  </header>
  ${html}
  <script>window.addEventListener('load', () => window.print());<\/script>
</body>
</html>`;

  return new NextResponse(page, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
