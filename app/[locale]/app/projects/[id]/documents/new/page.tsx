import { redirect } from "@/lib/navigation";
import { getTranslations } from "next-intl/server";
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
import { ChevronLeft, Sparkles } from "lucide-react";
import { Link } from "@/lib/navigation";

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
  if (!user) redirect({ href: "/sign-in" });

  // Only architects and admins can create documents
  try {
    await requireProjectRole(supabase, projectId, "admin", "architect");
  } catch {
    redirect({ href: `/app/projects/${projectId}` });
  }

  const t = await getTranslations("newDocument");
  const action = createRichTextDocument.bind(null, projectId);

  return (
    <div className="max-w-lg space-y-6">
      <Link
        href={`/app/projects/${projectId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t("backToProject")}
      </Link>

      {/* Generate with AI */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            {t("generateWithAi.title")}
          </CardTitle>
          <CardDescription>{t("generateWithAi.description")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Button variant="outline" asChild>
            <Link href={`/app/projects/${projectId}/documents/generate`}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              {t("generateWithAi.button")}
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("blank.title")}</CardTitle>
          <CardDescription>{t("blank.description")}</CardDescription>
        </CardHeader>
        <form action={action}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">{t("blank.titleLabel")}</Label>
              <Input
                id="title"
                name="title"
                required
                autoFocus
                placeholder={t("blank.titlePlaceholder")}
              />
            </div>
          </CardContent>
          <CardContent className="pt-0 flex gap-2">
            <Button type="submit">{t("blank.submit")}</Button>
            <Button variant="outline" type="button" asChild>
              <Link href={`/app/projects/${projectId}`}>
                {t("blank.cancel")}
              </Link>
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
