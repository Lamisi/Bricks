"use client";

import { useActionState } from "react";
import { createProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProjectPage() {
  const [state, formAction, pending] = useActionState(createProject, {});

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">New project</h1>

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Fill in the details for your construction project.
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="space-y-4">
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Project name *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="Oslofjord Residential Block A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Oslo, Norway"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Brief description of the project scope…"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_name">Organization name</Label>
              <Input
                id="org_name"
                name="org_name"
                placeholder="Your company name (created on first project)"
              />
              <p className="text-xs text-muted-foreground">
                Used to group your projects. Ignored if you already have an
                organization.
              </p>
            </div>
          </CardContent>

          <CardFooter className="gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating…" : "Create project"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
