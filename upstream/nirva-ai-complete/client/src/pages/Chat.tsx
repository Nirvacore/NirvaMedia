import Sidebar from "@/components/Sidebar";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Sparkles, RotateCcw, Copy, Check, Square, Cpu } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { sendChatMessage, sendTowerMessage, fetchChatHistory, type ChatResponse } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: string;
  isStreaming?: boolean;
  modelRouting?: ChatResponse["modelRouting"];
}

const tierBadge: Record<string, { label: string; className: string }> = {
  free: { label: "Free", className: "bg-green-50 text-green-700 border-green-200" },
  low_cost: { label: "Low Cost", className: "bg-amber-50 text-amber-700 border-amber-200" },
  premium: { label: "Premium", className: "bg-violet-50 text-violet-700 border-violet-200" },
};

const agentPersonalities: Record<string, { greeting: string; style: string }> = {
  DESK: { greeting: "สวัสดีครับ ผม **DESK** หัวหน้าทีม AI พร้อมรับคำสั่งและจัดการงานให้คุณครับ\n\nสามารถถามอะไรก็ได้ เช่น:\n- วิเคราะห์โค้ด\n- สร้าง workflow\n- จัดการ task", style: "formal" },
  FLOW: { greeting: "สวัสดีครับ ผม **FLOW** ผู้จัดการ workflow พร้อมออกแบบและรันระบบอัตโนมัติให้คุณครับ", style: "efficient" },
  CODE: { greeting: "สวัสดีครับ ผม **CODE** ผู้เชี่ยวชาญเขียนโค้ด พร้อมสร้างซอฟต์แวร์ให้คุณครับ\n\nลองถามเรื่องโค้ดได้เลย!", style: "technical" },
  ARCH: { greeting: "สวัสดีครับ ผม **ARCH** สถาปนิกระบบ พร้อมออกแบบโครงสร้างที่แข็งแกร่งให้คุณครับ", style: "thoughtful" },
};

const mockResponses: Record<string, string[]> = {
  DESK: [
    "ได้ครับ ผมจะจัดการให้ทันที\n\n**ขั้นตอนต่อไป:**\n1. วิเคราะห์ความต้องการ\n2. ส่งต่อให้ Agent ที่เหมาะสม\n3. ติดตามผลลัพธ์",
    "ผมได้รับคำสั่งแล้วครับ กำลังประสานงานกับทีม...\n\n> Task Priority: **High**\n> Assigned to: CODE + ARCH",
  ],
  CODE: [
    "ได้ครับ นี่คือตัวอย่างโค้ด Python สำหรับ FastAPI endpoint:\n\n```python\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\n\napp = FastAPI()\n\nclass Agent(BaseModel):\n    name: str\n    role: str\n    model: str = \"llama3.1:8b\"\n\n@app.post(\"/agents/\")\nasync def create_agent(agent: Agent):\n    \"\"\"Create a new AI agent.\"\"\"\n    return {\"status\": \"created\", \"agent\": agent.dict()}\n\n@app.get(\"/agents/{name}\")\nasync def get_agent(name: str):\n    # Query from database\n    return {\"name\": name, \"status\": \"active\"}\n```\n\nโค้ดนี้สร้าง REST API สำหรับจัดการ agents ครับ",
    "นี่คือ TypeScript function สำหรับ fetch data:\n\n```typescript\ninterface AgentResponse {\n  name: string;\n  status: 'active' | 'idle' | 'error';\n  lastRun: Date;\n}\n\nasync function fetchAgents(): Promise<AgentResponse[]> {\n  const response = await fetch('/api/agents');\n  if (!response.ok) {\n    throw new Error(`HTTP error! status: ${response.status}`);\n  }\n  return response.json();\n}\n\n// Usage\nconst agents = await fetchAgents();\nconsole.log(`Found ${agents.length} agents`);\n```",
    "ผมแนะนำให้ใช้ Docker Compose แบบนี้ครับ:\n\n```yaml\nversion: '3.8'\nservices:\n  ollama:\n    image: ollama/ollama\n    ports:\n      - \"11434:11434\"\n    volumes:\n      - ollama_data:/root/.ollama\n    deploy:\n      resources:\n        reservations:\n          devices:\n            - capabilities: [gpu]\n\n  qdrant:\n    image: qdrant/qdrant\n    ports:\n      - \"6333:6333\"\n    volumes:\n      - qdrant_data:/qdrant/storage\n\nvolumes:\n  ollama_data:\n  qdrant_data:\n```\n\n**หมายเหตุ:** ต้องมี GPU สำหรับ Ollama ครับ",
  ],
  FLOW: [
    "ผมออกแบบ workflow ให้แล้วครับ:\n\n| Step | Action | Agent | Duration |\n|------|--------|-------|----------|\n| 1 | รับ request | DESK | 0.5s |\n| 2 | วิเคราะห์ intent | DESK | 1.0s |\n| 3 | สร้างโค้ด | CODE | 5-30s |\n| 4 | Review | ARCH | 2-5s |\n| 5 | Deploy | FLOW | 10-60s |\n\n**Total estimated time:** ~1-2 นาที",
    "ระบบ CI/CD pipeline ที่แนะนำ:\n\n```bash\n#!/bin/bash\n# deploy.sh\nset -e\n\necho \"🔄 Pulling latest changes...\"\ngit pull origin main\n\necho \"🐳 Building containers...\"\ndocker compose build --no-cache\n\necho \"🚀 Deploying...\"\ndocker compose up -d\n\necho \"✅ Health check...\"\ncurl -f http://localhost:8000/health || exit 1\n\necho \"🎉 Deployment successful!\"\n```",
  ],
  ARCH: [
    "ผมแนะนำ architecture แบบนี้ครับ:\n\n**System Design:**\n\n```\n┌─────────────┐     ┌──────────────┐\n│   Client    │────▶│  API Gateway │\n│  (React)    │     │  (FastAPI)   │\n└─────────────┘     └──────┬───────┘\n                           │\n                    ┌──────┴───────┐\n                    │  Agent Router │\n                    │   (DESK)     │\n                    └──────┬───────┘\n                           │\n              ┌────────────┼────────────┐\n              │            │            │\n        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐\n        │   CODE    │ │ FLOW  │ │   ARCH    │\n        │  (Ollama) │ │ (n8n) │ │  (Ollama) │\n        └───────────┘ └───────┘ └───────────┘\n```\n\n**Key decisions:**\n- ใช้ **event-driven** architecture\n- แต่ละ agent เป็น **microservice**\n- ใช้ **Qdrant** สำหรับ vector memory",
  ],
};

const defaultResponses = [
  "ผมเข้าใจคำขอของคุณแล้วครับ กำลังดำเนินการ...\n\n*กรุณารอสักครู่*",
  "ได้ครับ ผมจะจัดการให้ทันที\n\n**สถานะ:** กำลังประมวลผล",
  "ข้อมูลที่คุณต้องการมีดังนี้ครับ...\n\n---\n\nหากต้องการรายละเอียดเพิ่มเติม สามารถถามได้เลยครับ",
];

/** Helper to extract text content from React children (for copy code) */
function extractTextFromChildren(children: any): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join("");
  if (children?.props?.children) return extractTextFromChildren(children.props.children);
  return "";
}

/** Custom hook for streaming text effect */
function useStreamingText(fullText: string, isStreaming: boolean, speed: number = 12) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(fullText);
      setIsComplete(true);
      return;
    }

    // Reset for new streaming
    indexRef.current = 0;
    setDisplayedText("");
    setIsComplete(false);
    cancelledRef.current = false;

    function streamNext() {
      if (cancelledRef.current) return;
      if (indexRef.current >= fullText.length) {
        setIsComplete(true);
        return;
      }

      // Determine chunk size — stream faster inside code blocks
      let chunkSize = 1;
      const remaining = fullText.slice(indexRef.current);

      // Speed up inside code blocks (3-5 chars at a time)
      if (remaining.match(/^[a-zA-Z0-9_\-.:;=<>{}()\[\]"',/\\| ]/)) {
        chunkSize = Math.floor(Math.random() * 3) + 2;
      }

      // If we're in a code block, go even faster
      const textSoFar = fullText.slice(0, indexRef.current);
      const openTicks = (textSoFar.match(/```/g) || []).length;
      if (openTicks % 2 === 1) {
        chunkSize = Math.floor(Math.random() * 5) + 3;
      }

      // Don't exceed remaining text
      chunkSize = Math.min(chunkSize, fullText.length - indexRef.current);

      indexRef.current += chunkSize;
      setDisplayedText(fullText.slice(0, indexRef.current));

      // Variable speed: faster for code, slower for natural text
      const baseDelay = openTicks % 2 === 1 ? speed * 0.4 : speed;
      const jitter = Math.random() * baseDelay * 0.8;
      // Pause slightly at newlines for readability
      const newlineDelay = fullText[indexRef.current - 1] === "\n" ? 60 : 0;

      timerRef.current = setTimeout(streamNext, baseDelay + jitter + newlineDelay);
    }

    // Start with a small delay to show the bubble first
    timerRef.current = setTimeout(streamNext, 200);

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fullText, isStreaming, speed]);

  const skipToEnd = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    setDisplayedText(fullText);
    setIsComplete(true);
  }, [fullText]);

  return { displayedText, isComplete, skipToEnd };
}

/** Component for a streaming assistant message */
function StreamingMessage({
  msg,
  copiedId,
  onCopy,
  onCopyCode,
}: {
  msg: Message;
  copiedId: string | null;
  onCopy: (content: string, id: string) => void;
  onCopyCode: (code: string) => void;
}) {
  const { displayedText, isComplete, skipToEnd } = useStreamingText(
    msg.content,
    msg.isStreaming || false,
    14
  );

  return (
    <div className="max-w-[75%] group relative px-5 py-4 rounded-2xl bg-card border border-border text-foreground rounded-bl-md">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-[10px] text-muted-foreground font-semibold">{msg.agent}</p>
          {msg.modelRouting && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-semibold border ${tierBadge[msg.modelRouting.recommendedTier]?.className || "bg-muted text-muted-foreground border-border"}`}
              title={msg.modelRouting.reasoningTh}
            >
              <Cpu className="w-2.5 h-2.5" />
              {msg.modelRouting.model.name}
              <span className="opacity-70">· {tierBadge[msg.modelRouting.recommendedTier]?.label}</span>
            </span>
          )}
        </div>
        {msg.isStreaming && !isComplete && (
          <button
            onClick={skipToEnd}
            className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all border border-border/50"
            title="ข้ามไปจบ"
          >
            <Square className="w-2.5 h-2.5" />
            ข้าม
          </button>
        )}
      </div>
      <div className="chat-markdown prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5 prose-pre:my-3 prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-code:text-[13px] prose-code:font-mono prose-table:text-sm prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-table:border prose-table:border-border prose-th:bg-muted/30 prose-th:border prose-th:border-border prose-td:border prose-td:border-border prose-blockquote:border-primary/40 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4 prose-strong:text-foreground prose-a:text-primary">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            pre({ children, ...props }) {
              return (
                <div className="relative group/code">
                  <button
                    onClick={() => {
                      const text = extractTextFromChildren(children);
                      onCopyCode(text);
                    }}
                    className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 opacity-0 group-hover/code:opacity-100 transition-all z-10 border border-white/10"
                    title="คัดลอกโค้ด"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                  <pre {...props}>{children}</pre>
                </div>
              );
            },
            code({ className, children, ...props }) {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[13px] font-mono text-foreground border border-border/30" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {displayedText}
        </ReactMarkdown>
        {!isComplete && (
          <span className="inline-block w-[2px] h-4 bg-primary/70 animate-pulse ml-0.5 align-middle" />
        )}
      </div>
      <p className="text-[10px] mt-2 text-muted-foreground/60">
        {msg.timestamp.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {isComplete && (
        <button
          onClick={() => onCopy(msg.content, msg.id)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/60 transition-all"
          title="คัดลอกข้อความ"
        >
          {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
      )}
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("DESK");
  const [towerMode, setTowerMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agents = ["DESK", "FLOW", "SAGE", "CODE", "ARCH", "CARE", "COIN", "SEAL", "SCOUT"];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const personality = agentPersonalities[selectedAgent];
    setSessionId(null);

    fetchChatHistory(selectedAgent)
      .then((data) => {
        if (data.sessionId) setSessionId(data.sessionId);
        if (data.messages.length > 0) {
          setMessages(data.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.createdAt),
            agent: m.agent || selectedAgent,
            isStreaming: false,
          })));
          return;
        }
        throw new Error("no history");
      })
      .catch(() => {
        setMessages(personality ? [{
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: personality.greeting,
          timestamp: new Date(),
          agent: selectedAgent,
          isStreaming: false,
        }] : [{
          id: `greeting-${Date.now()}`,
          role: "assistant",
          content: `สวัสดีครับ ผม **${selectedAgent}** พร้อมช่วยเหลือคุณครับ`,
          timestamp: new Date(),
          agent: selectedAgent,
          isStreaming: false,
        }]);
      });
  }, [selectedAgent]);

  function getResponse(agent: string): string {
    const agentResponses = mockResponses[agent];
    if (agentResponses && agentResponses.length > 0) {
      return agentResponses[Math.floor(Math.random() * agentResponses.length)];
    }
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  }

  function sendMessage() {
    if (!input.trim() || isTyping) return;

    const userContent = input.trim();
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const history = messages
      .filter((m) => !m.isStreaming && !m.id.startsWith("greeting-"))
      .map((m) => ({ role: m.role, content: m.content }));

    const useTower = selectedAgent === "DESK" && towerMode;
    const chatPromise = useTower
      ? sendTowerMessage(userContent, sessionId)
      : sendChatMessage(userContent, selectedAgent, history, sessionId);

    chatPromise
      .then((response) => {
        if (response.sessionId) setSessionId(response.sessionId);
        const towerResponse = useTower ? response as Awaited<ReturnType<typeof sendTowerMessage>> : null;
        const assistantMsg: Message = {
          id: response.id,
          role: "assistant",
          content: response.content,
          timestamp: new Date(response.timestamp),
          agent: useTower ? "DESK" : selectedAgent,
          isStreaming: true,
          modelRouting: response.modelRouting,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (response.source === "ollama") {
          const tierLabel = response.modelRouting
            ? tierBadge[response.modelRouting.recommendedTier]?.label
            : null;
          toast.success(
            useTower ? "Control Tower — Ollama" : "ตอบจาก Ollama",
            tierLabel ? { description: `ROUTER → ${response.modelRouting?.model.name} (${tierLabel})` } : undefined
          );
        } else if (towerResponse?.routing) {
          toast.message("Agent Router", {
            description: `${towerResponse.routing.agents.join(" → ")}`,
          });
        }
      })
      .catch(() => {
        const response = getResponse(selectedAgent);
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: `${response}\n\n---\n*โหมดจำลอง — เชื่อมต่อ Ollama ไม่ได้ ตรวจสอบ Settings*`,
          timestamp: new Date(),
          agent: selectedAgent,
          isStreaming: true,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        toast.message("ใช้โหมดจำลอง", { description: "ไม่สามารถเชื่อมต่อ Ollama ได้" });
      })
      .finally(() => setIsTyping(false));
  }

  function copyMessage(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("คัดลอกแล้ว");
  }

  function copyCodeBlock(code: string) {
    navigator.clipboard.writeText(code);
    toast.success("คัดลอกโค้ดแล้ว");
  }

  function clearChat() {
    const personality = agentPersonalities[selectedAgent];
    setMessages(personality ? [{
      id: `greeting-${Date.now()}`,
      role: "assistant",
      content: personality.greeting,
      timestamp: new Date(),
      agent: selectedAgent,
      isStreaming: false,
    }] : [{
      id: `greeting-${Date.now()}`,
      role: "assistant",
      content: `สวัสดีครับ ผม **${selectedAgent}** พร้อมช่วยเหลือคุณครับ`,
      timestamp: new Date(),
      agent: selectedAgent,
      isStreaming: false,
    }]);
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] flex flex-col h-screen">
        {/* Header */}
        <header className="px-8 py-5 border-b border-border flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-foreground">Agent Chat</h1>
            <p className="text-sm text-muted-foreground">
              {selectedAgent === "DESK" && towerMode
                ? "Control Tower — DESK วิเคราะห์และ route ไปยัง AI Companies"
                : "สนทนากับ AI Agent — รองรับ Markdown & Code"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selectedAgent === "DESK" && (
              <button
                onClick={() => setTowerMode(!towerMode)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all border ${
                  towerMode
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "text-muted-foreground border-border hover:bg-muted/60"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Control Tower
              </button>
            )}
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all border border-border"
            >
              <RotateCcw className="w-4 h-4" />
              ล้างแชท
            </button>
          </div>
        </header>

        {/* Agent Selector */}
        <div className="px-8 py-3 border-b border-border flex items-center gap-2 overflow-x-auto flex-shrink-0">
          <span className="text-xs text-muted-foreground font-medium mr-2">เลือก Agent:</span>
          {agents.map((agent) => (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedAgent === agent
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted/30 text-muted-foreground border border-transparent hover:bg-muted/60"
              }`}
            >
              {agent}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              {msg.role === "assistant" ? (
                <StreamingMessage
                  msg={msg}
                  copiedId={copiedId}
                  onCopy={copyMessage}
                  onCopyCode={copyCodeBlock}
                />
              ) : (
                <div className="max-w-[75%] group relative px-4 py-3 rounded-2xl bg-primary text-primary-foreground rounded-br-md">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-[10px] mt-2 text-primary-foreground/60">
                    {msg.timestamp.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              )}
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-muted/60 border border-border flex items-center justify-center flex-shrink-0 mt-1">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-card border border-border rounded-bl-md">
                <p className="text-[10px] text-muted-foreground font-semibold mb-2">{selectedAgent}</p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 ml-1">กำลังคิด...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-8 py-4 border-t border-border flex-shrink-0">
          <div className="flex items-center gap-3 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder={`พิมพ์ข้อความถึง ${selectedAgent}... (ลอง: "สร้าง API endpoint", "เขียน Docker Compose")`}
              className="flex-1 px-5 py-3.5 rounded-2xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="p-3.5 rounded-2xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50 mt-2">
            AI ตอบกลับเป็น Markdown พร้อม Typing Effect — กดปุ่ม "ข้าม" เพื่อแสดงผลทันที
          </p>
        </div>
      </main>
    </div>
  );
}
