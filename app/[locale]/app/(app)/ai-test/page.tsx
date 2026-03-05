import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/navigation";
import { AiTestPanel } from "@/components/ai-test-panel";

// This page is only accessible in development — it never ships to production.
export default async function AiTestPage() {
  if (process.env.NODE_ENV === "production") {
    const locale = await getLocale();
    redirect({ href: "/app", locale });
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-xl font-semibold mb-1">AI Test Panel</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Development only — hidden in production.
      </p>
      <AiTestPanel />
    </div>
  );
}
