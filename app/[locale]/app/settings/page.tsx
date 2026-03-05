"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateEmailPrefs } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PREF_LABELS: Record<string, string> = {
  status_change: "Document status changes (submitted for review, approved, changes requested)",
  mention: "@mentions in comments",
  comment_reply: "New comments on your documents",
  compliance_complete: "Compliance check completed",
};

type Prefs = Record<string, boolean>;

const DEFAULT_PREFS: Prefs = {
  status_change: true,
  mention: true,
  comment_reply: true,
  compliance_complete: true,
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("email_prefs")
        .eq("id", user.id)
        .single();
      if (data?.email_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.email_prefs as Prefs) });
      }
      setLoading(false);
    }
    load();
  }, []);

  function toggle(key: string) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateEmailPrefs(prefs);
      setSaved(true);
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Notification preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email notifications</CardTitle>
          <CardDescription>
            In-app notifications are always delivered. Disable email for specific types below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            Object.keys(PREF_LABELS).map((key) => (
              <label key={key} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-foreground"
                  checked={prefs[key] ?? true}
                  onChange={() => toggle(key)}
                />
                <span className="text-sm">{PREF_LABELS[key]}</span>
              </label>
            ))
          )}

          <div className="pt-2 flex items-center gap-3">
            <Button size="sm" disabled={isPending || loading} onClick={handleSave}>
              {isPending ? "Saving…" : "Save"}
            </Button>
            {saved && <span className="text-sm text-green-600">Saved.</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
