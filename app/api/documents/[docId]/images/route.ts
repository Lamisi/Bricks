import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectRole } from "@/lib/auth/rbac";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB for embedded images
const SIGNED_URL_EXPIRY = 3600; // 1 hour — stored in rich_text_json

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const { docId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const projectId = (formData.get("project_id") as string | null)?.trim();

  if (!file || !projectId) {
    return NextResponse.json({ error: "Missing file or project_id." }, { status: 400 });
  }

  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    return NextResponse.json({ error: "Insufficient permissions." }, { status: 403 });
  }

  if (!ALLOWED_IMAGE_MIMES.has(file.type)) {
    return NextResponse.json({ error: "File type not allowed for images." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image exceeds 10 MB limit." }, { status: 400 });
  }

  const storagePath = `projects/${projectId}/documents/${docId}/images/${crypto.randomUUID()}-${file.name}`;
  const buffer = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error: storageError } = await admin.storage
    .from("documents")
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (storageError) {
    return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
  }

  const { data: signed, error: urlError } = await admin.storage
    .from("documents")
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

  if (urlError || !signed) {
    return NextResponse.json({ error: "Could not generate image URL." }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
}
