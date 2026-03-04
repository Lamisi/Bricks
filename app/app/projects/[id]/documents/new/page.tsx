import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRichTextDocument } from "@/lib/actions/documents";
import { requireProjectRole } from "@/lib/auth/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function NewDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Only architects and admins can create documents
  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    redirect(`/app/projects/${projectId}`);
  }

  const action = createRichTextDocument.bind(null, projectId);

  return (
    <div className="max-w-lg space-y-6">
      <Link
        href={`/app/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to project
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>New document</CardTitle>
          <CardDescription>
            Create a rich-text document. You can upload files from the project page.
          </CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document title</Label>
              <Input
                id="title"
                name="title"
                required
                autoFocus
                placeholder="e.g. Project Proposal – Phase 1"
              />
            </div>
          </CardContent>
          <CardContent className="pt-0 flex gap-2">
            <Button type="submit">Create and open editor</Button>
            <Button variant="outline" type="button" asChild>
              <Link href={`/app/projects/${projectId}`}>Cancel</Link>
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
