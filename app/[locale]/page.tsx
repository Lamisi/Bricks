import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { Link } from "@/lib/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("home");
  return { title: `Bricks — ${t("headline")}` };
}

export default function HomePage() {
  const t = useTranslations("home");
  const nav = useTranslations("nav");

  return (
    <div className="min-h-screen bg-brand-parchment">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <Logo size="md" />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            className="text-brand-navy hover:bg-brand-navy/10"
            asChild
          >
            <Link href="/sign-in">{nav("signIn")}</Link>
          </Button>
          <Button
            className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white"
            asChild
          >
            <Link href="/sign-up">{nav("getStarted")}</Link>
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-8 pt-20 pb-28 text-center">
        <Badge
          className="mb-6 bg-brand-navy/10 text-brand-navy border-brand-navy/20 hover:bg-brand-navy/10"
          variant="outline"
        >
          {t("badge")}
        </Badge>
        <h1 className="text-6xl font-bold tracking-tight text-brand-navy leading-tight max-w-3xl mx-auto">
          {t("headline")}
        </h1>
        <p className="mt-6 text-xl text-brand-slate max-w-2xl mx-auto leading-relaxed">
          {t("subheading")}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white px-8 text-base"
            asChild
          >
            <Link href="/sign-up">{t("cta.primary")}</Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-brand-navy text-brand-navy hover:bg-brand-navy hover:text-white px-8 text-base"
          >
            {t("cta.secondary")}
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-8">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-terracotta mb-4">
            {t("features.label")}
          </p>
          <h2 className="text-4xl font-bold text-brand-navy text-center mb-16">
            {t("features.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(["documents", "compliance", "collaboration"] as const).map(
              (key) => (
                <div
                  key={key}
                  className="rounded-xl border border-border bg-brand-parchment p-8 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-lg bg-brand-navy/10 flex items-center justify-center mb-5">
                    <span className="text-2xl">
                      {key === "documents"
                        ? "📋"
                        : key === "compliance"
                          ? "⚡"
                          : "🤝"}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-brand-navy mb-2">
                    {t(`features.items.${key}.title`)}
                  </h3>
                  <p className="text-brand-slate leading-relaxed">
                    {t(`features.items.${key}.description`)}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 max-w-7xl mx-auto px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-brand-terracotta mb-4">
          {t("howItWorks.label")}
        </p>
        <h2 className="text-4xl font-bold text-brand-navy text-center mb-16">
          {t("howItWorks.heading")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {(["upload", "check", "review", "submit"] as const).map((key, i) => (
            <div key={key} className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-brand-terracotta text-white text-lg font-bold flex items-center justify-center mb-4">
                {i + 1}
              </div>
              <h3 className="font-semibold text-brand-navy mb-2">
                {t(`howItWorks.steps.${key}.title`)}
              </h3>
              <p className="text-sm text-brand-slate leading-relaxed">
                {t(`howItWorks.steps.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-brand-navy py-20">
        <div className="max-w-3xl mx-auto px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            {t("cta2.heading")}
          </h2>
          <p className="text-blue-200 mb-8 text-lg">{t("cta2.body")}</p>
          <Button
            size="lg"
            className="bg-brand-terracotta hover:bg-brand-terracotta-dark text-white px-10 text-base"
            asChild
          >
            <Link href="/sign-up">{t("cta2.button")}</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-border">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
          <Logo size="sm" />
          <p className="text-sm text-brand-slate">
            © {new Date().getFullYear()} Bricks. {t("footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}
