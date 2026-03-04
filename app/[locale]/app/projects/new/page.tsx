"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("newProject");
  const [state, formAction, pending] = useActionState(createProject, {});

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold mb-6">{t("heading")}</h1>

      <Card>
        <CardHeader>
          <CardTitle>{t("card.title")}</CardTitle>
          <CardDescription>{t("card.description")}</CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="space-y-4">
            {state.error && (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">{t("fields.name")}</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder={t("placeholders.name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">{t("fields.location")}</Label>
              <Input
                id="location"
                name="location"
                placeholder={t("placeholders.location")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                placeholder={t("placeholders.description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="org_name">{t("fields.orgName")}</Label>
              <Input
                id="org_name"
                name="org_name"
                placeholder={t("placeholders.orgName")}
              />
              <p className="text-xs text-muted-foreground">
                {t("fields.orgNameHint")}
              </p>
            </div>
          </CardContent>

          <CardFooter className="gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? t("submitting") : t("submit")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
