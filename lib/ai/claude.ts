import "server-only";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Default Claude model used across all AI features.
 * Pinned here so that model updates are intentional and visible.
 */
export const DEFAULT_MODEL = "claude-sonnet-4-6" as const;

/**
 * Returns a configured Anthropic provider.
 * Throws at startup if ANTHROPIC_API_KEY is missing — fail fast.
 */
function getAnthropicProvider() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return createAnthropic({ apiKey });
}

/**
 * Returns a Claude model instance ready for use with Vercel AI SDK functions
 * (streamText, generateText, generateObject, etc.)
 *
 * Usage:
 *   const result = streamText({ model: getClaudeModel(), messages });
 */
export function getClaudeModel(model: string = DEFAULT_MODEL) {
  return getAnthropicProvider()(model);
}
