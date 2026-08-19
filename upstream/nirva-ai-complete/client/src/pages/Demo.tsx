import Sidebar from "@/components/Sidebar";
import {
  BookOpen, Bot, Building2, ExternalLink, GitBranch, MessageSquare,
  Network, Puzzle, Store, BarChart3, Cpu, Palette, Play, Container,
  Code2,
} from "lucide-react";
import { Link } from "wouter";

const demos = [
  {
    category: "Dashboard",
    items: [
      { label: "Home — 109 Agents", path: "/", icon: Bot, desc: "สถิติ agents, sprint, infrastructure" },
      { label: "Agents Directory", path: "/agents", icon: Bot, desc: "ค้นหาและกรอง 109 agents" },
      { label: "AI Organization", path: "/organization", icon: Building2, desc: "8 AI Companies + Control Tower" },
      { label: "Reports", path: "/reports", icon: BarChart3, desc: "งานเสร็จ, issues, workload" },
    ],
  },
  {
    category: "Features",
    items: [
      { label: "Chat — Control Tower + ROUTER", path: "/chat", icon: MessageSquare, desc: "DESK route + เลือก model อัตโนมัติ" },
      { label: "Model ROUTER", path: "/orchestration", icon: Cpu, desc: "เลือก tier/model ตามความยากงาน" },
      { label: "Enterprise Dashboard", path: "/enterprise", icon: Building2, desc: "SSO, ERP, audit logs, billing v1.0" },
      { label: "Coding Workspace", path: "/workspace", icon: Code2, desc: "Idea → Design → Code → Test → Deploy" },
      { label: "Workflows", path: "/workflows", icon: GitBranch, desc: "CODE → ARCH → SHIP templates" },
      { label: "Marketplace", path: "/marketplace", icon: Store, desc: "Agent packs — import/export" },
      { label: "Plugins", path: "/plugins", icon: Puzzle, desc: "Webhook, HTTP, task, memory plugins" },
      { label: "Nirva Ecosystem", path: "/ecosystem", icon: Network, desc: "6 ผลิตภัณฑ์ Nirvacore" },
    ],
  },
  {
    category: "Developer",
    items: [
      { label: "Swagger UI", path: "/api/docs", icon: BookOpen, desc: "ทดลอง API แบบ interactive", external: true },
      { label: "OpenAPI JSON", path: "/api/openapi.json", icon: Cpu, desc: "Spec 3.1 สำหรับ Postman", external: true },
      { label: "Developer Docs", path: "/docs", icon: BookOpen, desc: "LLM classifier + API links" },
      { label: "Storybook", path: "/storybook/", icon: Palette, desc: "UI components — Button, Badge, Card", external: true },
    ],
  },
];

const deploySteps = [
  { cmd: "pnpm go", desc: "Local dev — setup + server บน :3000" },
  { cmd: "bash deploy/contabo/deploy.sh", desc: "Production update บน Contabo VPS" },
];

export default function Demo() {
  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-5xl">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Demo Hub · v0.14.4 · รอ deploy</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">
            ดูตัวอย่าง &amp; Deploy
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            โค้ด v0.14 บน <code className="text-xs bg-muted px-1 rounded">main</code> แล้ว — deploy ขึ้น Contabo หรือ Publish บน Manus เพื่ออัปเดต{" "}
            <a href="https://ai.nirva.one" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">ai.nirva.one</a>
          </p>
        </header>

        <section className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-6 mb-10">
          <h2 className="font-semibold text-foreground mb-2">Contabo VPS — Production หลัก</h2>
          <p className="text-sm text-muted-foreground mb-3">
            เอาขึ้น Contabo ได้เลย — ควบคุมเอง 100% มี Ollama + Qdrant + n8n ครบ
          </p>
          <pre className="text-xs bg-background border border-border rounded-xl p-4 overflow-x-auto font-mono mb-3">
{`ssh root@YOUR_CONTABO_IP
git clone https://github.com/Nirvacore/nirva-AI.git /opt/nirva-AI
cd /opt/nirva-AI && sudo bash deploy/contabo/install.sh
bash deploy/contabo/deploy.sh
sudo certbot --nginx -d ai.nirva.one`}
          </pre>
          <p className="text-sm text-muted-foreground">
            คู่มือเต็ม:{" "}
            <a href="https://github.com/Nirvacore/nirva-AI/blob/main/docs/DEPLOY_CONTABO.md" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              docs/DEPLOY_CONTABO.md
            </a>
          </p>
        </section>

        <section className="rounded-2xl border-2 border-primary/40 bg-primary/10 p-6 mb-10">
          <h2 className="font-semibold text-foreground mb-2">ai.nirva.one — อัปเดต production</h2>
          <p className="text-sm text-muted-foreground mb-3">
            โดเมน ai.nirva.one ยังอยู่บน Manus Space — โค้ด v0.14 merge แล้ว ต้อง deploy ใหม่เพื่อให้ production ตรงกับ GitHub
          </p>
          <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside mb-4">
            <li><strong>Contabo (แนะนำ):</strong> <code className="text-xs bg-muted px-1 rounded">bash deploy/contabo/deploy.sh</code> บน VPS</li>
            <li><strong>Manus:</strong> Sync repo + Publish ใน Manus project</li>
            <li>ตรวจ version: <code className="text-xs bg-muted px-1 rounded">GET /api/health</code> → <code className="text-xs bg-muted px-1 rounded">0.14.4</code></li>
          </ol>
          <a
            href="https://ai.nirva.one"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            เปิด ai.nirva.one (production ปัจจุบัน) <ExternalLink className="w-4 h-4" />
          </a>
        </section>

        {demos.map((section) => (
          <section key={section.category} className="mb-10">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              {section.category}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const content = (
                  <div className="flex items-start gap-4 p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 transition-all h-full">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{item.label}</h3>
                        {item.external && <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                      <code className="text-xs text-primary/80 mt-2 block">{item.path}</code>
                    </div>
                  </div>
                );
                return item.external ? (
                  <a key={item.path} href={item.path} target="_blank" rel="noopener noreferrer">
                    {content}
                  </a>
                ) : (
                  <Link key={item.path} href={item.path}>{content}</Link>
                );
              })}
            </div>
          </section>
        ))}

        <section className="rounded-2xl border border-border bg-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Container className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">เอาขึ้นระบบ (Deploy)</h2>
          </div>
          <div className="space-y-3">
            {deploySteps.map((step) => (
              <div key={step.cmd} className="flex items-start gap-3">
                <Play className="w-4 h-4 text-primary mt-1 shrink-0" />
                <div>
                  <code className="text-sm bg-muted px-2 py-1 rounded font-mono">{step.cmd}</code>
                  <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            คู่มือเต็ม:{" "}
            <a
              href="https://github.com/Nirvacore/nirva-AI/blob/main/docs/DEMO.md"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              docs/DEMO.md
            </a>
            {" · "}
            <a
              href="https://github.com/Nirvacore/nirva-AI/blob/main/DEPLOYMENT.md"
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              DEPLOYMENT.md
            </a>
          </p>
        </section>

        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 mb-10">
          <h2 className="font-semibold text-foreground mb-2">เริ่มระบบ — คำสั่งเดียว</h2>
          <p className="text-sm text-muted-foreground mb-3">
            ไม่ต้องรอ Manus — รันเองได้ทันที (โค้ด template เก่าถูกล้างแล้ว)
          </p>
          <pre className="text-sm bg-background border border-border rounded-xl p-4 overflow-x-auto font-mono">
pnpm install && pnpm go
          </pre>
          <p className="text-sm text-muted-foreground mt-3">
            หรือ <code className="text-xs bg-muted px-1.5 py-0.5 rounded">docker compose up -d --build</code> สำหรับ stack ครบ (Ollama + Qdrant)
          </p>
        </section>

        <section className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-6">
          <h2 className="font-semibold text-foreground mb-2">ทดลอง API เร็ว</h2>
          <pre className="text-xs bg-background border border-border rounded-xl p-4 overflow-x-auto text-muted-foreground">
{`curl -X POST http://localhost:3000/api/router/analyze \\
  -H "Content-Type: application/json" \\
  -d '{"message":"สร้างระบบขายออนไลน์"}'`}
          </pre>
        </section>
      </main>
    </div>
  );
}
