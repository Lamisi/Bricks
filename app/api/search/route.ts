import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { embedText } from "@/lib/ai/embeddings";

export interface SearchResult {
  document_id: string;
  title: string;
  description: string | null;
  status: string;
  project_id: string;
  project_name: string;
  updated_at: string;
  match_type: "keyword" | "semantic";
  score: number;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const projectId = searchParams.get("project_id") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const dateFrom = searchParams.get("date_from") ?? undefined;
  const dateTo = searchParams.get("date_to") ?? undefined;

  const results: SearchResult[] = [];
  const seenIds = new Set<string>();

  // ── 1. Full-text search ───────────────────────────────────────────────────
  const { data: ftsRows, error: ftsError } = await supabase.rpc("search_documents", {
    query_text: q,
    filter_project: projectId ?? null,
    filter_status: status ?? null,
    filter_date_from: dateFrom ?? null,
    filter_date_to: dateTo ?? null,
    result_limit: 20,
  });

  if (ftsError) {
    console.error("FTS search error:", ftsError);
  } else {
    for (const row of ftsRows ?? []) {
      seenIds.add(row.document_id);
      results.push({ ...row, match_type: "keyword", score: row.rank ?? 0 });
    }
  }

  // ── 2. Semantic search (graceful fallback if OpenAI unavailable) ──────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const embedding = await embedText(q);
      const { data: semRows, error: semError } = await supabase.rpc(
        "search_documents_semantic",
        {
          query_embedding: JSON.stringify(embedding),
          filter_project: projectId ?? null,
          filter_status: status ?? null,
          result_limit: 10,
        },
      );

      if (semError) {
        console.error("Semantic search error:", semError);
      } else {
        for (const row of semRows ?? []) {
          if (!seenIds.has(row.document_id)) {
            seenIds.add(row.document_id);
            results.push({ ...row, match_type: "semantic", score: row.similarity ?? 0 });
          }
        }
      }
    } catch (err) {
      // Semantic search failure must never break keyword results
      console.error("Semantic search unavailable:", err);
    }
  }

  // Sort: keyword results first (by rank), then semantic (by similarity)
  results.sort((a, b) => {
    if (a.match_type !== b.match_type) return a.match_type === "keyword" ? -1 : 1;
    return b.score - a.score;
  });

  return NextResponse.json({ results, query: q });
}
