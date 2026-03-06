import { getLocale } from "next-intl/server";
import { redirect } from "@/lib/navigation";

export default async function AppPage() {
  const locale = await getLocale();
  redirect({ href: "/app/projects", locale });
}
