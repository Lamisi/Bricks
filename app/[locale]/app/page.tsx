import { redirect } from "@/lib/navigation";

export default function AppPage() {
  redirect({ href: "/app/projects" });
}
