"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { signIn, type AuthState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/lib/navigation";

const initialState: AuthState = {};

export default function SignInPage() {
  const t = useTranslations("auth.signIn");
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>

      <form action={formAction}>
        <CardContent className="space-y-4">
          {redirectTo && (
            <input type="hidden" name="redirectTo" value={redirectTo} />
          )}
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? t("submitting") : t("submit")}
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            {t("noAccount")}{" "}
            <Link
              href="/sign-up"
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              {t("signUp")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
