"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SearchResult } from "@/app/api/search/route";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "changes_requested", label: "Changes Requested" },
  { value: "submitted", label: "Submitted" },
];

interface Project {
  id: string;
  name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient();
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .order("name");
      setProjects(data ?? []);
    }
    loadProjects();
  }, []);

  function buildUrl() {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (projectFilter) params.set("project_id", projectFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    return `/api/search?${params.toString()}`;
  }

  async function runSearch() {
    if (query.trim().length < 2) return;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const res = await fetch(buildUrl(), { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Search error:", err);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      runSearch();
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Search</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search document titles and content…"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={loading || query.trim().length < 2}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      </form>

      {/* Results */}
      {results === null ? null : results.length === 0 ? (
        <p className="text-muted-foreground">No results found for &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {results.length} result{results.length !== 1 ? "s" : ""}
          </p>
          <ul className="divide-y rounded-lg border">
            {results.map((r) => (
              <li key={r.document_id}>
                <Link
                  href={`/app/projects/${r.project_id}/documents/${r.document_id}`}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{r.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {r.status.replace("_", " ")}
                      </Badge>
                      {r.match_type === "semantic" && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                          semantic
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.project_name}
                      <span className="mx-1">·</span>
                      Updated {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {r.description}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
