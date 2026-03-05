"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/lib/navigation";

type SuggestionAction = "accepted" | "dismissed";
type SuggestionType = "missing_section" | "unclear" | "non_compliant";

export async function logSuggestionAction(
  documentId: string,
  versionId: string | null,
  type: SuggestionType,
  description: string,
  recommendedFix: string,
  action: SuggestionAction,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  await supabase.from("suggestion_logs").insert({
    document_id: documentId,
    document_version_id: versionId,
    user_id: user.id,
    suggestion_type: type,
    description,
    recommended_fix: recommendedFix,
    action,
  });
}
