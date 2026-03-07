import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/rag/upload-url?fileName=tek17.pdf
// Admin-only. Returns a short-lived signed URL the browser can PUT a PDF to
// directly in Supabase Storage, bypassing Next.js body-size limits entirely.
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Global admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("fileName") ?? "upload.pdf";
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `knowledge-uploads/${crypto.randomUUID()}-${safeName}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("documents")
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    console.error("Failed to create signed upload URL:", error);
    return NextResponse.json({ error: "Could not create upload URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, storagePath });
}
