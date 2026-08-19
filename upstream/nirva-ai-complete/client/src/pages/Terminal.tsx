import Sidebar from "@/components/Sidebar";
import { useState, useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Copy, Trash2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { fetchSystemStatus, fetchOllamaModels, planWorkspacePipeline } from "@/lib/api";

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error" | "system";
  content: string;
  timestamp: Date;
}

const mockCommands: Record<string, string[]> = {
  "help": [
    "Available commands:",
    "  help          — แสดงคำสั่งที่ใช้ได้",
    "  status        — ตรวจสอบสถานะระบบ",
    "  agents        — แสดงรายชื่อ agents ที่ active",
    "  ollama list   — แสดง models ที่ติดตั้ง",
    "  docker ps     — แสดง containers ที่ทำงานอยู่",
    "  clear         — ล้างหน้าจอ",
    "  ping          — ทดสอบการเชื่อมต่อ",
    "  workspace     — Idea → Deploy pipeline (หรือ workspace plan \"ไอเดีย\")",
  ],
  "status": [
    "╭─────────────────────────────────────╮",
    "│  Nirva AI Core v0.1 — Status        │",
    "├─────────────────────────────────────┤",
    "│  Ollama:    ● Running (port 11434)  │",
    "│  Qdrant:    ● Running (port 6333)   │",
    "│  n8n:       ● Running (port 5678)   │",
    "│  FastAPI:   ● Running (port 8000)   │",
    "│  Memory:    2.4 GB / 8 GB           │",
    "│  CPU:       23%                     │",
    "╰─────────────────────────────────────╯",
  ],
  "agents": [
    "Active Agents (8/109):",
    "  ● DESK   — หัวหน้าทีม (idle)",
    "  ● FLOW   — Workflow Manager (running task #2)",
    "  ● CODE   — Code Writer (running task #1)",
    "  ● ARCH   — System Architect (running task #3)",
    "  ● CARE   — User Support (idle)",
    "  ● COIN   — Finance Manager (idle)",
    "  ● LEGAL  — Legal Advisor (idle)",
    "  ● MARK   — Marketing (idle)",
  ],
  "ollama list": [
    "NAME                    SIZE      MODIFIED",
    "llama3.1:8b             4.7 GB    2 days ago",
    "codellama:13b           7.4 GB    3 days ago",
    "mistral:7b              4.1 GB    5 days ago",
    "nomic-embed-text        274 MB    1 week ago",
  ],
  "docker ps": [
    "CONTAINER ID   IMAGE              STATUS          PORTS",
    "a1b2c3d4e5f6   ollama/ollama      Up 3 days       0.0.0.0:11434->11434/tcp",
    "b2c3d4e5f6a1   qdrant/qdrant      Up 3 days       0.0.0.0:6333->6333/tcp",
    "c3d4e5f6a1b2   n8nio/n8n          Up 2 days       0.0.0.0:5678->5678/tcp",
    "d4e5f6a1b2c3   nirva-api:latest   Up 1 hour       0.0.0.0:8000->8000/tcp",
  ],
  "ping": [
    "PING nirva-core (62.146.233.24): 56 data bytes",
    "64 bytes from 62.146.233.24: time=12.3 ms",
    "64 bytes from 62.146.233.24: time=11.8 ms",
    "64 bytes from 62.146.233.24: time=12.1 ms",
    "--- nirva-core ping statistics ---",
    "3 packets transmitted, 3 received, 0% packet loss",
  ],
  "uptime": [
    "System uptime: 3 days, 14 hours, 22 minutes",
    "Last restart: 2026-06-19 08:30:00 UTC+7",
  ],
  "whoami": ["nirva-admin"],
  "date": [new Date().toLocaleString("th-TH", { dateStyle: "full", timeStyle: "medium" })],
  "echo hello": ["hello"],
  "pwd": ["/home/nirva/nirva-ai-core"],
  "ls": ["agents.py  docker-compose.yml  main.py  README.md  requirements.txt  src/"],
};

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: "sys-1", type: "system", content: "╭────────────────────────────────────────────╮", timestamp: new Date() },
    { id: "sys-2", type: "system", content: "│  Nirva AI Core Terminal v0.18             │", timestamp: new Date() },
    { id: "sys-3", type: "system", content: "│  พิมพ์ 'help' เพื่อดูคำสั่งที่ใช้ได้       │", timestamp: new Date() },
    { id: "sys-4", type: "system", content: "╰────────────────────────────────────────────╯", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  function executeCommand(cmd: string) {
    const trimmed = cmd.trim().toLowerCase();
    const inputLine: TerminalLine = {
      id: `in-${Date.now()}`,
      type: "input",
      content: cmd.trim(),
      timestamp: new Date(),
    };

    if (trimmed === "clear") {
      setLines([]);
      return;
    }

    const appendOutput = (response: string[]) => {
      const outputLines: TerminalLine[] = response.map((line, i) => ({
        id: `out-${Date.now()}-${i}`,
        type: "output" as const,
        content: line,
        timestamp: new Date(),
      }));
      setLines((prev) => [...prev, inputLine, ...outputLines]);
      setHistory((prev) => [cmd.trim(), ...prev].slice(0, 50));
      setHistoryIndex(-1);
    };

    if (trimmed === "status") {
      fetchSystemStatus()
        .then((text) => appendOutput(text.split("\n")))
        .catch(() => appendOutput(mockCommands.status));
      return;
    }

    if (trimmed === "workspace" || trimmed.startsWith("workspace ")) {
      const ideaMatch = cmd.trim().match(/^workspace\s+plan\s+["']?(.+?)["']?\s*$/i)
        || cmd.trim().match(/^workspace\s+(.+)$/i);
      const idea = ideaMatch?.[1]?.trim() || "สร้าง feature ใหม่";
      planWorkspacePipeline(idea)
        .then((p) => {
          const lines = [
            "Coding Workspace Pipeline:",
            ...p.stages.map((s, i) => `  ${i + 1}. [${s.labelTh}] ${s.agents.join("+")} — ${s.actionTh}`),
            "",
            p.summaryTh,
            "→ เปิด /workspace เพื่อ Execute",
          ];
          appendOutput(lines);
        })
        .catch(() => appendOutput(["workspace: ไม่สามารถวางแผนได้ — ตรวจสอบ server"]));
      return;
    }

    if (trimmed === "ollama list") {
      fetchOllamaModels()
        .then((data) => {
          const lines = ["NAME                    SIZE      MODIFIED", ...data.models.map((m) =>
            `${m.name.padEnd(24)}${m.size.padEnd(10)}${m.modified}`
          )];
          appendOutput(lines);
        })
        .catch(() => appendOutput(mockCommands["ollama list"]));
      return;
    }

    const response = mockCommands[trimmed];
    const outputLines: TerminalLine[] = response
      ? response.map((line, i) => ({ id: `out-${Date.now()}-${i}`, type: "output" as const, content: line, timestamp: new Date() }))
      : [{ id: `err-${Date.now()}`, type: "error" as const, content: `command not found: ${cmd.trim()}`, timestamp: new Date() }];

    setLines((prev) => [...prev, inputLine, ...outputLines]);
    setHistory((prev) => [cmd.trim(), ...prev].slice(0, 50));
    setHistoryIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && input.trim()) {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  }

  function copyAll() {
    const text = lines.map((l) => (l.type === "input" ? `$ ${l.content}` : l.content)).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกทั้งหมดแล้ว");
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8 flex flex-col h-screen">
        {/* Header */}
        <header className="mb-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <TerminalIcon className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Terminal</h1>
              <p className="text-xs text-muted-foreground">nirva-admin@nirva-core:~</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyAll}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all border border-border"
            >
              <Copy className="w-3.5 h-3.5" />
              คัดลอก
            </button>
            <button
              onClick={() => setLines([])}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all border border-border"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ล้าง
            </button>
          </div>
        </header>

        {/* Terminal Body */}
        <div
          className="flex-1 rounded-2xl border border-border bg-[#0d1117] overflow-hidden flex flex-col cursor-text"
          onClick={() => inputRef.current?.focus()}
        >
          <div className="flex-1 overflow-y-auto p-5 font-mono text-sm leading-relaxed">
            {lines.map((line) => (
              <div key={line.id} className="flex">
                {line.type === "input" && (
                  <span className="text-emerald-400 mr-2 select-none flex items-center gap-1">
                    <ChevronRight className="w-3 h-3" />
                  </span>
                )}
                <span
                  className={
                    line.type === "input" ? "text-white" :
                    line.type === "error" ? "text-red-400" :
                    line.type === "system" ? "text-cyan-400" :
                    "text-gray-300"
                  }
                >
                  {line.content}
                </span>
              </div>
            ))}
            {/* Input line */}
            <div className="flex items-center mt-1">
              <span className="text-emerald-400 mr-2 select-none flex items-center gap-1">
                <ChevronRight className="w-3 h-3" />
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent text-white outline-none font-mono text-sm caret-emerald-400"
                spellCheck={false}
                autoFocus
              />
            </div>
            <div ref={endRef} />
          </div>
        </div>
      </main>
    </div>
  );
}
