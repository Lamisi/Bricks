"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { inviteMember, type ProjectFormState } from "@/lib/actions/projects";
import { DocumentUpload } from "@/components/document-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ExternalLink, FileText, MapPin, Plus, Settings, UserPlus } from "lucide-react";
import type { ProjectRole } from "@/lib/auth/rbac";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  architect: "Architect",
  civil_engineer: "Civil Engineer",
  carpenter: "Carpenter",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  submitted: "Submitted",
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  status: string;
  organizations: { name: string } | null;
};

type Member = {
  user_id: string;
  role: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type DocumentRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  current_version: {
    id: string;
    version_number: number;
    file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    storage_path: string | null;
  } | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState<string>("architect");
  const [openingUrl, setOpeningUrl] = useState<string | null>(null);

  const boundInvite = projectId
    ? inviteMember.bind(null, projectId)
    : async () => ({});

  const [inviteState, inviteAction, invitePending] = useActionState<ProjectFormState, FormData>(
    // boundInvite is created dynamically from .bind(); cast needed as TS can't infer bound arity
    boundInvite as (s: ProjectFormState, p: FormData) => Promise<ProjectFormState>,
    {},
  );

  const loadDocuments = useCallback(async (pid: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("documents")
      .select(
        `id, title, status, updated_at,
         document_versions!current_version_id(
           id, version_number, file_name, mime_type, file_size, storage_path
         )`,
      )
      .eq("project_id", pid)
      .order("updated_at", { ascending: false });

    if (data) {
      setDocuments(
        data.map((d) => {
          const ver = Array.isArray(d.document_versions)
            ? d.document_versions[0]
            : d.document_versions;
          return {
            id: d.id,
            title: d.title,
            status: d.status,
            updated_at: d.updated_at,
            current_version: ver ?? null,
          };
        }),
      );
    }
  }, []);

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      const supabase = createClient();

      const [{ data: proj }, { data: memberRows }, { data: { user } }] =
        await Promise.all([
          supabase
            .from("projects")
            .select("id, name, description, location, status, organizations(name)")
            .eq("id", projectId!)
            .single(),
          supabase
            .from("project_members")
            .select("user_id, role, profiles!user_id(full_name, avatar_url)")
            .eq("project_id", projectId!),
          supabase.auth.getUser(),
        ]);

      if (!proj) {
        setLoading(false);
        return;
      }

      setProject(proj as unknown as Project);
      setMembers((memberRows as unknown as Member[]) ?? []);

      const me = memberRows?.find((m) => m.user_id === user?.id);
      setMyRole((me?.role as ProjectRole) ?? null);

      await loadDocuments(projectId!);
      setLoading(false);
    }

    load();
  }, [projectId, loadDocuments]);

  async function openSignedUrl(storagePath: string, mode: "view" | "download") {
    if (!projectId) return;
    setOpeningUrl(storagePath);
    try {
      const res = await fetch(
        `/api/documents/signed-url?path=${encodeURIComponent(storagePath)}&projectId=${projectId}&mode=${mode}`,
      );
      const body = (await res.json()) as { url?: string; error?: string };
      if (body.url) {
        window.open(body.url, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpeningUrl(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-4 bg-muted rounded w-96" />
      </div>
    );
  }

  if (!project) return notFound();

  const isAdmin = myRole === "admin";
  const canUpload = myRole === "admin" || myRole === "architect";

  const initials = (name: string | null) =>
    (name ?? "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.location && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {project.location}
            </p>
          )}
          {project.description && (
            <p className="text-sm text-muted-foreground mt-2 max-xl">
              {project.description}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link href={`/app/projects/${project.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-1.5" />
              Settings
            </Button>
          </Link>
        )}
      </div>

      <Separator />

      {/* Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription className="mt-1">
              {documents.length === 0
                ? "No documents yet."
                : `${documents.length} document${documents.length !== 1 ? "s" : ""}`}
            </CardDescription>
          </div>
          {canUpload && projectId && (
            <Link href={`/app/projects/${projectId}/documents/new`}>
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1" />
                New document
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload zone — architects and admins only */}
          {canUpload && (
            <DocumentUpload
              projectId={project.id}
              onUploadComplete={() => loadDocuments(project.id)}
            />
          )}

          {/* Document list */}
          {documents.length > 0 && (
            <div className="divide-y rounded-md border">
              {documents.map((doc) => {
                const ver = doc.current_version;
                const isOpening = openingUrl === ver?.storage_path;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <Link
                      href={`/app/projects/${project.id}/documents/${doc.id}`}
                      className="flex items-center gap-2.5 min-w-0 flex-1 group"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate group-hover:underline">
                          {doc.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ver ? `v${ver.version_number}` : "—"}
                          {ver?.file_size ? ` · ${formatBytes(ver.file_size)}` : ""}
                          {" · "}
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 align-middle">
                            {STATUS_LABELS[doc.status] ?? doc.status}
                          </Badge>
                        </p>
                      </div>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </Link>
                    {ver?.storage_path && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs shrink-0"
                        disabled={isOpening}
                        onClick={() => openSignedUrl(ver.storage_path!, "download")}
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this
            project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => {
            const name = m.profiles?.full_name ?? "Unknown";
            return (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-[var(--color-brand-navy)] text-white">
                      {initials(name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{name}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {ROLE_LABELS[m.role] ?? m.role}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Invite member (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Invite a member
            </CardTitle>
          </CardHeader>
          <form action={inviteAction}>
            <CardContent className="space-y-4">
              {inviteState.error && (
                <p role="alert" className="text-sm text-destructive">
                  {inviteState.error}
                </p>
              )}
              <div className="flex gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="space-y-2 w-44">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    name="role"
                    value={inviteRole}
                    onValueChange={setInviteRole}
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="architect">Architect</SelectItem>
                      <SelectItem value="civil_engineer">Civil Engineer</SelectItem>
                      <SelectItem value="carpenter">Carpenter</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0">
              <Button type="submit" size="sm" disabled={invitePending}>
                {invitePending ? "Sending…" : "Send invitation"}
              </Button>
            </CardContent>
          </form>
        </Card>
      )}
    </div>
  );
}
