import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type ProjectRole = Database["public"]["Enums"]["project_role"];
export type DocumentStatus = Database["public"]["Enums"]["document_status"];

// ---------------------------------------------------------------------------
// Role resolution
// ---------------------------------------------------------------------------

/**
 * Returns the calling user's role within a project, or null if they are not
 * a member. Uses the `get_user_project_role` DB function so the lookup is
 * a single indexed query scoped to the authenticated user.
 */
export async function getUserProjectRole(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<ProjectRole | null> {
  const { data, error } = await supabase.rpc("get_user_project_role", {
    p_project_id: projectId,
  });
  if (error || !data) return null;
  return data as ProjectRole;
}

// ---------------------------------------------------------------------------
// Route-level guard (use inside Server Components and Route Handlers)
// ---------------------------------------------------------------------------

/**
 * Resolves the calling user's role and throws a `Response` with status 403
 * if the role is not in `allowedRoles`. Returns the resolved role if allowed.
 *
 * Usage in a Route Handler:
 *   const role = await requireProjectRole(supabase, projectId, "admin", "architect");
 */
export async function requireProjectRole(
  supabase: SupabaseClient<Database>,
  projectId: string,
  ...allowedRoles: ProjectRole[]
): Promise<ProjectRole> {
  const role = await getUserProjectRole(supabase, projectId);

  if (!role || !allowedRoles.includes(role)) {
    throw new Response(
      JSON.stringify({ error: "Insufficient permissions for this action." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  return role;
}

// ---------------------------------------------------------------------------
// Status transition rules
// ---------------------------------------------------------------------------

/**
 * Defines which roles can make which document status transitions.
 *
 * Transition table:
 *   architect      : draft → in_review
 *                    changes_requested → in_review
 *                    approved → submitted
 *   civil_engineer : in_review → approved
 *                    in_review → changes_requested
 *   admin          : any → any
 *   carpenter      : no transitions permitted
 */
const ALLOWED_TRANSITIONS: Record<
  ProjectRole,
  Array<{ from: DocumentStatus; to: DocumentStatus }>
> = {
  admin: [
    { from: "draft", to: "in_review" },
    { from: "in_review", to: "approved" },
    { from: "in_review", to: "changes_requested" },
    { from: "changes_requested", to: "in_review" },
    { from: "approved", to: "submitted" },
    { from: "draft", to: "approved" }, // admin override
  ],
  architect: [
    { from: "draft", to: "in_review" },
    { from: "changes_requested", to: "in_review" },
    { from: "approved", to: "submitted" },
  ],
  civil_engineer: [
    { from: "in_review", to: "approved" },
    { from: "in_review", to: "changes_requested" },
  ],
  carpenter: [],
};

/**
 * Returns true if `role` is permitted to transition a document from
 * `fromStatus` to `toStatus`. Pure function — no DB access.
 */
export function canTransitionDocumentStatus(
  role: ProjectRole,
  fromStatus: DocumentStatus,
  toStatus: DocumentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[role].some(
    (t) => t.from === fromStatus && t.to === toStatus,
  );
}

// ---------------------------------------------------------------------------
// Convenience predicates (use in server actions / route handlers)
// ---------------------------------------------------------------------------

export const ROLES_THAT_CAN_WRITE_DOCUMENTS: ProjectRole[] = [
  "admin",
  "architect",
];

export const ROLES_THAT_CAN_REVIEW_DOCUMENTS: ProjectRole[] = [
  "admin",
  "civil_engineer",
];

export const ROLES_THAT_CAN_MANAGE_MEMBERS: ProjectRole[] = ["admin"];
