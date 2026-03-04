import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { getSignedViewUrl } from "@/lib/supabase/storage";
import { tiptapJsonToHtml } from "@/lib/tiptap/html";

/**
 * Returns the renderable content for any document version.
 * Used by the document viewer when switching between versions.
 *
 * Response:
 *  { type: "file",      url: "..." }  — signed URL, valid 60 s
 *  { type: "rich_text", html: "..." } — server-rendered HTML (sanitised)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const versionId = searchParams.get("versionId");
  const projectId = searchParams.get("projectId");

  if (!versionId || !projectId) {
    return NextResponse.json({ error: "Missing versionId or projectId." }, { status: 400 });
  }

  const role = await getUserProjectRole(supabase, projectId);
  if (!role) return NextResponse.json({ error: "Not a project member." }, { status: 403 });

  const admin = createAdminClient();
  const { data: version } = await admin
    .from("document_versions")
    .select("id, content_type, storage_path, rich_text_json")
    .eq("id", versionId)
    .single();

  if (!version) return NextResponse.json({ error: "Version not found." }, { status: 404 });

  if (version.content_type === "file") {
    if (!version.storage_path) {
      return NextResponse.json({ error: "No storage path for this version." }, { status: 404 });
    }
    const url = await getSignedViewUrl(version.storage_path);
    return NextResponse.json({ type: "file", url });
  }

  // rich_text
  if (!version.rich_text_json) {
    return NextResponse.json({ error: "No content for this version." }, { status: 404 });
  }
  const html = tiptapJsonToHtml(version.rich_text_json);
  return NextResponse.json({ type: "rich_text", html });
}
