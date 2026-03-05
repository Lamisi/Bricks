import { getTranslations } from "next-intl/server";
import { redirect } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { GlobalSearch } from "@/components/global-search";
import { Link } from "@/lib/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/sign-in" });

  const [{ data: profile }, t] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getTranslations("appLayout"),
  ]);

  const displayName = profile?.full_name ?? user.email ?? "Account";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/app/projects">
              <Logo size="sm" showWordmark />
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/app/projects"
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
              >
                {t("projects")}
              </Link>
              <Link
                href="/app/search"
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors md:hidden"
              >
                Search
              </Link>
              <Link
                href="/app/settings"
                className="text-sm font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
              >
                Settings
              </Link>
            </nav>
          </div>

          <div className="hidden md:block w-64">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} />
            <LanguageSwitcher />
            <span className="hidden sm:block text-sm text-muted-foreground">
              {displayName}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                {t("signOut")}
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
