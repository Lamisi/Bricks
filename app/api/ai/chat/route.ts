import { convertToModelMessages, streamText, UIMessage } from "ai";
import { createClient } from "@/lib/supabase/server";
import { getClaudeModel, DEFAULT_MODEL } from "@/lib/ai/claude";

// ---------------------------------------------------------------------------
// In-process rate limiter — 10 requests per user per minute.
// NOTE: This is per-instance. In a multi-instance / edge deployment, replace
// with a distributed store (Upstash Redis, Vercel KV, or Supabase RPC).
// ---------------------------------------------------------------------------
const rateMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string, maxPerMinute = 10): boolean {
  const now = Date.now();
  const entry = rateMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateMap.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Rate limit ────────────────────────────────────────────────────────────
  if (!checkRateLimit(user.id)) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait before making another request." },
      { status: 429 },
    );
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let messages: UIMessage[];
  let systemPrompt: string | undefined;

  try {
    const body = (await request.json()) as {
      messages: UIMessage[];
      systemPrompt?: string;
    };
    messages = body.messages;
    systemPrompt = body.systemPrompt;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "messages array is required" }, { status: 400 });
  }

  // ── Stream ────────────────────────────────────────────────────────────────
  try {
    const model = getClaudeModel();

    console.log("AI request:", {
      userId: user.id,
      model: DEFAULT_MODEL,
      messageCount: messages.length,
    });

    const result = streamText({
      model,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 4096,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Claude API error:", { userId: user.id, message });

    return Response.json(
      { error: "AI service unavailable. Please try again." },
      { status: 503 },
    );
  }
}
