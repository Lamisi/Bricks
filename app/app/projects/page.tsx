import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Users } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  architect: "Architect",
  civil_engineer: "Civil Engineer",
  carpenter: "Carpenter",
};

export default async function ProjectsPage() {
  const supabase = await createClient();

  // RLS ensures only the user's memberships are returned
  const { data: memberships } = await supabase
    .from("project_members")
    .select(
      `role,
       project:project_id (
         id, name, description, location, status, created_at
       )`,
    )
    .order("created_at", { ascending: false });

  const active = memberships?.filter((m) => {
    const p = m.project as { status?: string } | null;
    return p?.status !== "archived";
  }) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Construction projects you belong to
          </p>
        </div>
        <Link href="/app/projects/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New project
          </Button>
        </Link>
      </div>

      {active.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <p className="text-muted-foreground mb-4">
              You don&apos;t have any projects yet.
            </p>
            <Link href="/app/projects/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                Create your first project
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((m) => {
            const project = m.project as {
              id: string;
              name: string;
              description?: string | null;
              location?: string | null;
              status: string;
            };
            return (
              <Link key={project.id} href={`/app/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-snug">
                        {project.name}
                      </CardTitle>
                      <Badge variant="outline" className="shrink-0 text-xs">
                        {ROLE_LABELS[m.role] ?? m.role}
                      </Badge>
                    </div>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  {project.location && (
                    <CardContent className="pt-0">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </span>
                    </CardContent>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
