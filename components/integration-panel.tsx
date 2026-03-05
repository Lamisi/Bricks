"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  createIntegration,
  deleteIntegration,
  toggleIntegrationStatus,
} from "@/lib/actions/integrations";
import { Trash2, Plus, ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

interface Integration {
  id: string;
  name: string;
  type: string;
  webhook_url: string;
  status: "active" | "inactive";
  created_at: string;
}

interface Log {
  id: string;
  direction: string;
  event_type: string;
  status: string;
  http_status_code: number | null;
  destination_url: string | null;
  attempt: number;
  error: string | null;
  created_at: string;
}

interface Props {
  projectId: string;
  isAdmin: boolean;
}

export function IntegrationPanel({ projectId, isAdmin }: Props) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, Log[]>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/integrations?project_id=${projectId}`);
        const data = res.ok ? await res.json() : null;
        if (!cancelled) setIntegrations(data?.integrations ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function loadIntegrations() {
    setLoading(true);
    const res = await fetch(`/api/integrations?project_id=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    }
    setLoading(false);
  }

  async function loadLogs(integrationId: string) {
    if (logs[integrationId]) return;
    const res = await fetch(`/api/integrations/${integrationId}/logs?project_id=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setLogs((prev) => ({ ...prev, [integrationId]: data.logs ?? [] }));
    }
  }

  function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadLogs(id);
    }
  }

  function handleCreate() {
    setFormError(null);
    startTransition(async () => {
      const result = await createIntegration(projectId, name, webhookUrl);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setNewSecret(result.secret ?? null);
      setName("");
      setWebhookUrl("");
      setShowForm(false);
      await loadIntegrations();
    });
  }

  function handleDelete(integrationId: string) {
    startTransition(async () => {
      await deleteIntegration(integrationId, projectId);
      setIntegrations((prev) => prev.filter((i) => i.id !== integrationId));
      if (expandedId === integrationId) setExpandedId(null);
    });
  }

  function handleToggleStatus(integration: Integration) {
    const next = integration.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      await toggleIntegrationStatus(integration.id, projectId, next);
      setIntegrations((prev) =>
        prev.map((i) => (i.id === integration.id ? { ...i, status: next } : i)),
      );
    });
  }

  async function copySecret(secret: string) {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Integrations</h3>
        {isAdmin && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            Add webhook
          </Button>
        )}
      </div>

      {newSecret && (
        <div className="rounded border border-yellow-300 bg-yellow-50 p-3 text-sm">
          <p className="mb-1 font-medium text-yellow-800">
            Save this secret — it will not be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1 text-xs text-yellow-900">
              {newSecret}
            </code>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0"
              onClick={() => copySecret(newSecret)}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <button
            className="mt-2 text-xs text-yellow-700 underline"
            onClick={() => setNewSecret(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {showForm && isAdmin && (
        <div className="rounded border p-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="int-name">Name</Label>
            <Input
              id="int-name"
              placeholder="e.g. Slack notifications"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="int-url">Webhook URL</Label>
            <Input
              id="int-url"
              type="url"
              placeholder="https://example.com/webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex gap-2">
            <Button size="sm" disabled={isPending || !name || !webhookUrl} onClick={handleCreate}>
              {isPending ? "Creating…" : "Create"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : integrations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No integrations configured.</p>
      ) : (
        <ul className="divide-y rounded border">
          {integrations.map((integration) => (
            <li key={integration.id}>
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  className="mr-1 shrink-0 text-muted-foreground"
                  onClick={() => handleToggleExpand(integration.id)}
                  aria-label="Toggle logs"
                >
                  {expandedId === integration.id ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{integration.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{integration.webhook_url}</p>
                </div>
                <Badge variant={integration.status === "active" ? "default" : "secondary"}>
                  {integration.status}
                </Badge>
                {isAdmin && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      disabled={isPending}
                      onClick={() => handleToggleStatus(integration)}
                    >
                      {integration.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      disabled={isPending}
                      onClick={() => handleDelete(integration.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>

              {expandedId === integration.id && (
                <div className="border-t bg-muted/30 px-4 py-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recent delivery logs
                  </p>
                  {!logs[integration.id] ? (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  ) : logs[integration.id].length === 0 ? (
                    <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                  ) : (
                    <ul className="space-y-1">
                      {logs[integration.id].slice(0, 20).map((log) => (
                        <li key={log.id} className="flex items-start gap-2 text-xs">
                          <Badge
                            variant={
                              log.status === "success"
                                ? "default"
                                : log.status === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="mt-0.5 shrink-0 text-[10px]"
                          >
                            {log.status}
                          </Badge>
                          <span className="text-muted-foreground min-w-0">
                            <span className="font-medium text-foreground">{log.event_type}</span>
                            {log.http_status_code != null && ` · HTTP ${log.http_status_code}`}
                            {log.attempt > 1 && ` · attempt ${log.attempt}`}
                            {log.error && (
                              <span className="block text-destructive truncate">{log.error}</span>
                            )}
                          </span>
                          <span className="ml-auto shrink-0 text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
