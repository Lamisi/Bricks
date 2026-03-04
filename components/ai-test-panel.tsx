"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import type { UIMessage } from "ai";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function getTextContent(msg: UIMessage): string {
  return msg.parts
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export function AiTestPanel() {
  const [inputValue, setInputValue] = useState("");

  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/ai/chat" }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    await sendMessage({ text });
  }

  return (
    <div className="rounded-lg border bg-card flex flex-col gap-0 overflow-hidden">
      {/* Message list */}
      <div className="flex-1 overflow-auto p-4 space-y-3 min-h-[320px] max-h-[480px]">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-16">
            Send a message to test the Claude API connection.
          </p>
        )}
        {messages.map((m: UIMessage) => (
          <div
            key={m.id}
            className={cn(
              "rounded-md px-3 py-2 text-sm max-w-[85%]",
              m.role === "user"
                ? "bg-[var(--color-brand-navy)] text-white ml-auto"
                : "bg-muted",
            )}
          >
            <span className="font-medium text-[11px] block mb-0.5 opacity-70">
              {m.role === "user" ? "You" : "Claude"}
            </span>
            <p className="whitespace-pre-wrap">{getTextContent(m)}</p>
          </div>
        ))}
        {isLoading && (
          <div className="bg-muted rounded-md px-3 py-2 text-sm max-w-[85%] animate-pulse">
            <span className="font-medium text-[11px] block mb-0.5 opacity-70">Claude</span>
            <span className="text-muted-foreground">Thinking…</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="px-4 py-2 text-xs text-destructive border-t">{error.message}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t px-3 py-2.5">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask Claude something…"
          disabled={isLoading}
          className="text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !inputValue.trim()}
          className="shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
