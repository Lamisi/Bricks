"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { joinProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useRouter } from "@/lib/navigation";

export default function JoinProjectPage() {
  const t = useTranslations("join");
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [state, setState] = useState<{
    status: "idle" | "joining" | "success" | "error";
    message?: string;
    projectId?: string;
  }>({ status: "idle" });

  async function handleJoin() {
    if (!token) return;
    setState({ status: "joining" });
    const result = await joinProject(token);
    if (result.error) {
      setState({ status: "error", message: result.error });
    } else {
      setState({ status: "success", projectId: result.projectId });
    }
  }

  useEffect(() => {
    if (state.status === "success" && state.projectId) {
      router.push(`/app/projects/${state.projectId}`);
    }
  }, [state, router]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle>{t("invalidLink.title")}</CardTitle>
            <CardDescription>{t("invalidLink.description")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Logo size="md" showWordmark />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </CardHeader>

          {state.status === "error" && (
            <CardContent>
              <p role="alert" className="text-sm text-destructive">
                {state.message}
              </p>
            </CardContent>
          )}

          <CardFooter>
            <Button
              className="w-full"
              onClick={handleJoin}
              disabled={
                state.status === "joining" || state.status === "success"
              }
            >
              {state.status === "joining"
                ? t("joining")
                : state.status === "success"
                  ? t("redirecting")
                  : t("accept")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
