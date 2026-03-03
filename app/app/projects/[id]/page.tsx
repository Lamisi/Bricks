"use client";

import { useActionState, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { inviteMember, type ProjectFormState } from "@/lib/actions/projects";
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
import { MapPin, Settings, UserPlus } from "lucide-react";
import type { ProjectRole } from "@/lib/auth/rbac";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  architect: "Architect",
  civil_engineer: "Civil Engineer",
  carpenter: "Carpenter",
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

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState<string>("architect");

  const boundInvite = projectId
    ? inviteMember.bind(null, projectId)
    : async () => ({});

  const [inviteState, inviteAction, invitePending] = useActionState<ProjectFormState, FormData>(
    // boundInvite is created dynamically from .bind(); cast needed as TS can't infer bound arity
    boundInvite as (s: ProjectFormState, p: FormData) => Promise<ProjectFormState>,
    {},
  );

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();

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
      setLoading(false);
    }

    load();
  }, [projectId]);

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
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
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

      {/* Documents placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
          <CardDescription>
            Document upload and management will be available in issue #7.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
