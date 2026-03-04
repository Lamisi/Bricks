"use client";

import { useActionState, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  updateProject,
  archiveProject,
  type ProjectFormState,
} from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProjectRole } from "@/lib/auth/rbac";

type Project = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
};

export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useTranslations("projectSettings");
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);

  const boundUpdate = projectId
    ? updateProject.bind(null, projectId)
    : async () => ({});

  const [updateState, updateAction, updatePending] = useActionState<
    ProjectFormState,
    FormData
  >(
    boundUpdate as (
      s: ProjectFormState,
      p: FormData,
    ) => Promise<ProjectFormState>,
    {},
  );

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    async function load() {
      const supabase = createClient();
      const [{ data: proj }, , { data: me }] = await Promise.all([
        supabase
          .from("projects")
          .select("id, name, description, location")
          .eq("id", projectId!)
          .single(),
        supabase.auth.getUser(),
        supabase
          .from("project_members")
          .select("role")
          .eq("project_id", projectId!)
          .eq(
            "user_id",
            (await supabase.auth.getUser()).data.user?.id ?? "",
          )
          .single(),
      ]);

      if (!proj) {
        setLoading(false);
        return;
      }
      setProject(proj);
      setMyRole((me?.role as ProjectRole) ?? null);
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) {
    return <div className="animate-pulse h-8 bg-muted rounded w-48" />;
  }
  if (!project || myRole !== "admin") return notFound();

  async function handleArchive() {
    if (!projectId) return;
    if (!confirm(t("dangerZone.confirm"))) return;
    setArchiving(true);
    await archiveProject(projectId);
    router.push("/app/projects");
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{project.name}</p>
      </div>

      {/* Edit metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("general")}</CardTitle>
        </CardHeader>
        <form action={updateAction}>
          <CardContent className="space-y-4">
            {updateState.error && (
              <p role="alert" className="text-sm text-destructive">
                {updateState.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name")}</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={project.name}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location")}</Label>
              <Input
                id="location"
                name="location"
                defaultValue={project.location ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={project.description ?? ""}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" size="sm" disabled={updatePending}>
              {updatePending ? t("saving") : t("save")}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {t("dangerZone.title")}
          </CardTitle>
          <CardDescription>{t("dangerZone.description")}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="destructive"
            size="sm"
            disabled={archiving}
            onClick={handleArchive}
          >
            {archiving ? t("dangerZone.archiving") : t("dangerZone.archive")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
