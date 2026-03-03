"use client";

/**
 * useRole — returns the current user's role within a project.
 *
 * ⚠️  UI-ONLY: This hook is for showing/hiding UI elements only.
 *     It is NOT authoritative for access control.
 *     All permission enforcement happens server-side via RLS and
 *     requireProjectRole() in API routes and server actions.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRole } from "@/lib/auth/rbac";

type RoleState = {
  role: ProjectRole | null;
  loading: boolean;
  error: string | null;
};

export function useRole(projectId: string | null): RoleState {
  const [state, setState] = useState<RoleState>({
    role: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;
    const supabase = createClient();

    supabase
      .rpc("get_user_project_role", { p_project_id: projectId })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ role: null, loading: false, error: error.message });
        } else {
          setState({
            role: (data as ProjectRole) ?? null,
            loading: false,
            error: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return state;
}

// ---------------------------------------------------------------------------
// Derived convenience hooks (built on top of useRole — also UI-only)
// ---------------------------------------------------------------------------

export function useCanWriteDocuments(projectId: string | null): boolean {
  const { role } = useRole(projectId);
  return role === "admin" || role === "architect";
}

export function useCanReviewDocuments(projectId: string | null): boolean {
  const { role } = useRole(projectId);
  return role === "admin" || role === "civil_engineer";
}

export function useCanManageMembers(projectId: string | null): boolean {
  const { role } = useRole(projectId);
  return role === "admin";
}

export function useIsAdmin(projectId: string | null): boolean {
  const { role } = useRole(projectId);
  return role === "admin";
}
