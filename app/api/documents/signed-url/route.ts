import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserProjectRole } from "@/lib/auth/rbac";
import { getSignedViewUrl, getSignedDownloadUrl } from "@/lib/supabase/storage";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const storagePath = searchParams.get("path");
  const projectId = searchParams.get("projectId");
  const mode = searchParams.get("mode") ?? "view"; // "view" | "download"

  if (!storagePath || !projectId) {
    return NextResponse.json({ error: "Missing path or projectId." }, { status: 400 });
  }

  // Verify the user is a project member before issuing a signed URL
  const role = await getUserProjectRole(supabase, projectId);
  if (!role) {
    return NextResponse.json({ error: "Not a project member." }, { status: 403 });
  }

  try {
    const url =
      mode === "download"
        ? await getSignedDownloadUrl(storagePath)
        : await getSignedViewUrl(storagePath);

    return NextResponse.json({ url });
  } catch (err) {
    console.error("Signed URL generation failed:", err);
    return NextResponse.json({ error: "Could not generate access URL." }, { status: 500 });
  }
}
