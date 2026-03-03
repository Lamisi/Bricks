import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProjectRole } from "@/lib/auth/rbac";

// MIME types accepted server-side. DWG lacks a universal MIME type so we
// accept the most common variants that browsers / OS libs assign to it.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/vnd.dwg",
  "application/acad",
  "application/x-acad",
  "application/dwg",
  "application/x-dwg",
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  // --- Auth ---
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- Parse form data ---
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart form data." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const projectId = (formData.get("project_id") as string | null)?.trim();
  const title = (formData.get("title") as string | null)?.trim() || null;

  if (!file || !projectId) {
    return NextResponse.json({ error: "Missing required fields: file, project_id." }, { status: 400 });
  }

  // --- Role check ---
  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    return NextResponse.json({ error: "Only admins and architects can upload documents." }, { status: 403 });
  }

  // --- MIME type validation ---
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `File type "${file.type || "unknown"}" is not allowed. Accepted types: PDF, PNG, JPG, SVG, DWG.`,
      },
      { status: 400 },
    );
  }

  // --- File size validation ---
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds the 50 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB).` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const documentTitle = title || file.name;

  // --- Version resolution ---
  // Find an existing document with the same title in this project.
  // If found → new version. If not → create a new document first.
  const { data: existingDoc } = await admin
    .from("documents")
    .select("id")
    .eq("project_id", projectId)
    .eq("title", documentTitle)
    .maybeSingle();

  let documentId: string;
  let nextVersion: number;
  let isNewDocument = false;

  if (existingDoc) {
    documentId = existingDoc.id;

    const { data: latestVersion } = await admin
      .from("document_versions")
      .select("version_number")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    nextVersion = (latestVersion?.version_number ?? 0) + 1;
  } else {
    const { data: newDoc, error: docError } = await admin
      .from("documents")
      .insert({
        project_id: projectId,
        title: documentTitle,
        created_by: user.id,
        status: "draft",
      })
      .select("id")
      .single();

    if (docError || !newDoc) {
      console.error("Document insert failed:", docError?.message);
      return NextResponse.json({ error: "Could not create document record." }, { status: 500 });
    }

    documentId = newDoc.id;
    nextVersion = 1;
    isNewDocument = true;
  }

  // --- Storage upload ---
  // Path: projects/{project_id}/documents/{doc_id}/{version}/{filename}
  const storagePath = `projects/${projectId}/documents/${documentId}/${nextVersion}/${file.name}`;

  const fileBuffer = await file.arrayBuffer();

  const { error: storageError } = await admin.storage
    .from("documents")
    .upload(storagePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (storageError) {
    // Roll back newly created document record
    if (isNewDocument) {
      await admin.from("documents").delete().eq("id", documentId);
    }
    console.error("Storage upload failed:", { documentId, message: storageError.message });
    return NextResponse.json({ error: "Storage upload failed. Please try again." }, { status: 500 });
  }

  // --- Create document_versions record ---
  const { data: versionRow, error: versionError } = await admin
    .from("document_versions")
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      content_type: "file",
      created_by: user.id,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (versionError || !versionRow) {
    // Roll back storage upload and document if brand new
    await admin.storage.from("documents").remove([storagePath]);
    if (isNewDocument) {
      await admin.from("documents").delete().eq("id", documentId);
    }
    console.error("Version insert failed:", { documentId, message: versionError?.message });
    return NextResponse.json({ error: "Could not create version record." }, { status: 500 });
  }

  // --- Update current_version_id ---
  await admin
    .from("documents")
    .update({
      current_version_id: versionRow.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  console.log("Document uploaded:", {
    documentId,
    versionId: versionRow.id,
    versionNumber: nextVersion,
    fileSize: file.size,
    uploaderId: user.id,
  });

  return NextResponse.json({
    documentId,
    versionId: versionRow.id,
    versionNumber: nextVersion,
  });
}
