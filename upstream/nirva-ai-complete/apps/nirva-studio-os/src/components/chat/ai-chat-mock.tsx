"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FileAudio, FileText, ListTodo, Network, Send, Sparkles, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { defaultAIReply, mockAIResponses } from "@/lib/mock-data";
import { analyzeMessageLive, type LiveRouting } from "@/lib/nirva-api";
import type { AIResponse, AISource } from "@/types";

const SUGGESTED_PROMPTS = [
  "What should I create today?",
  "Summarize my Nirva Studio ideas.",
  "Which content ideas are ready?",
  "Show business relationships related to BEST.",
  "Turn my last voice note into a Facebook post.",
];

const SOURCE_ICON: Record<AISource["kind"], typeof FileText> = {
  capture: FileAudio,
  content: FileText,
  graph: Network,
  task: ListTodo,
};

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  sources?: AISource[];
  routing?: LiveRouting | null;
}

function findResponse(prompt: string): AIResponse {
  const lower = prompt.toLowerCase();
  return (
    mockAIResponses.find((r) => r.match.some((m) => lower.includes(m))) ?? defaultAIReply
  );
}

export function AIChatMock() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const counter = useRef(0);

  const send = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || thinking) return;
    counter.current += 1;
    setMessages((prev) => [...prev, { id: counter.current, role: "user", text }]);
    setInput("");
    setThinking(true);
    // Real DESK routing (keyword classifier, works without an LLM) + mock reply body.
    const [routing] = await Promise.all([
      analyzeMessageLive(text),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
    const response = findResponse(text);
    counter.current += 1;
    setMessages((prev) => [
      ...prev,
      { id: counter.current, role: "ai", text: response.reply, sources: response.sources, routing },
    ]);
    setThinking(false);
  };

  return (
    <div className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col rounded-2xl border border-nirva-border/60 bg-nirva-surface/40">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-nirva-violet/15 shadow-glow">
              <Sparkles className="h-5 w-5 text-nirva-violet-soft" />
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-100">Ask Nirva AI</p>
            <p className="mt-1 max-w-sm text-xs text-nirva-muted">
              ถามจาก captures, content pipeline, ปฏิทิน และ relationship graph ของคุณ (mock responses)
            </p>
            <div className="mt-5 flex max-w-lg flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => send(prompt)}
                  className="rounded-full border border-nirva-border bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-zinc-300 transition-colors hover:border-nirva-violet/50 hover:text-zinc-100"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] md:max-w-[70%]",
                  message.role === "user"
                    ? "rounded-2xl rounded-br-md bg-nirva-violet/20 px-4 py-2.5"
                    : "rounded-2xl rounded-bl-md border border-nirva-border/60 bg-nirva-card px-4 py-3"
                )}
              >
                {message.role === "ai" && message.routing && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-nirva-violet/25 bg-nirva-violet/[0.07] px-2.5 py-1.5">
                    <Workflow className="h-3 w-3 text-nirva-violet-soft" />
                    <span className="text-[10px] text-nirva-muted">
                      DESK routing (live) · {message.routing.intentLabelTh} ·{" "}
                      {Math.round(message.routing.confidence * 100)}%
                    </span>
                    {message.routing.agents.slice(0, 4).map((agent) => (
                      <span
                        key={agent}
                        className="rounded-full bg-nirva-violet/15 px-2 py-0.5 text-[9px] font-semibold tracking-wide text-nirva-violet-soft"
                      >
                        {agent}
                      </span>
                    ))}
                  </div>
                )}
                <p className="whitespace-pre-line text-[13px] leading-relaxed text-zinc-100">{message.text}</p>
                {message.sources && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-2.5">
                    {message.sources.map((source) => {
                      const Icon = SOURCE_ICON[source.kind];
                      return (
                        <span
                          key={source.title}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-nirva-border/60 bg-white/[0.03] px-2 py-1 text-[10px] text-nirva-muted"
                        >
                          <Icon className="h-3 w-3 text-nirva-violet-soft" />
                          {source.title}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {thinking && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-nirva-muted">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-nirva-violet-soft" />
            Nirva is thinking…
          </motion.div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-nirva-border/60 p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your ideas, content, or relationships…"
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || thinking}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
