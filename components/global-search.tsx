"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Search, FileText, Loader2 } from "lucide-react";
import { useRouter } from "@/lib/navigation";
import type { SearchResult } from "@/app/api/search/route";

const DEBOUNCE_MS = 300;

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  changes_requested: "Changes Requested",
  submitted: "Submitted",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results ?? []);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }

  function handleSelect(result: SearchResult) {
    setOpen(false);
    setQuery("");
    startTransition(() => {
      router.push(`/app/projects/${result.project_id}/documents/${result.document_id}`);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-xs">
      <div className="relative flex items-center">
        {loading ? (
          <Loader2 className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
        )}
        <input
          type="search"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search documents…"
          className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 max-h-80 overflow-auto rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <button
              key={r.document_id}
              className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-accent focus:bg-accent focus:outline-none"
              onClick={() => handleSelect(r)}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.project_name}
                  <span className="mx-1">·</span>
                  {STATUS_LABEL[r.status] ?? r.status}
                  {r.match_type === "semantic" && (
                    <span className="ml-1 text-blue-500">~</span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && !loading && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 rounded-md border bg-popover px-3 py-3 shadow-md">
          <p className="text-sm text-muted-foreground">No results found.</p>
        </div>
      )}
    </div>
  );
}
