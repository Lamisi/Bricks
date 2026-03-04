import { redirect } from "next/navigation";

// Root redirects to the default locale. next-intl middleware handles locale
// detection from cookies / Accept-Language, so this is only a fallback.
export default function RootPage() {
  redirect("/no");
}
