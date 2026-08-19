import Sidebar from "@/components/Sidebar";
import { BookOpen, ExternalLink, Cpu, FileJson } from "lucide-react";
import { Link } from "wouter";
import { useEffect, useState } from "react";

export default function Docs() {
  const [classifier, setClassifier] = useState<{
    methods: string[];
    defaultModel: string;
    pipelines: { id: string; label: string }[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/router/classifier")
      .then((r) => r.json())
      .then(setClassifier)
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-10 max-w-4xl">
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-6 rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">v0.11 Developer Docs</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight mb-2">API &amp; Developer Tools</h1>
          <p className="text-muted-foreground">
            OpenAPI specification, Swagger UI, and LLM intent classifier for the Agent Router.
          </p>
        </header>

        <section className="grid gap-5 mb-10">
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">Swagger UI</h2>
              <p className="text-sm text-muted-foreground">Interactive API explorer at /api/docs</p>
            </div>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </a>

          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <FileJson className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground">OpenAPI 3.1 Spec</h2>
              <p className="text-sm text-muted-foreground">Machine-readable JSON at /api/openapi.json</p>
            </div>
            <ExternalLink className="w-5 h-5 text-muted-foreground" />
          </a>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 mb-10">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">LLM Intent Classifier</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            POST <code className="text-xs bg-muted px-1.5 py-0.5 rounded">/api/router/analyze</code> with{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{"{ useLLM: true }"}</code> to classify via Ollama.
            Falls back to keyword matching when Ollama is unavailable.
          </p>
          {classifier && (
            <div className="text-sm space-y-2">
              <p>
                <span className="text-muted-foreground">Methods:</span> {classifier.methods.join(", ")}
              </p>
              <p>
                <span className="text-muted-foreground">Default model:</span> {classifier.defaultModel}
              </p>
              <p>
                <span className="text-muted-foreground">Pipelines:</span> {classifier.pipelines.length}
              </p>
            </div>
          )}
        </section>

        <p className="text-sm text-muted-foreground">
          See also{" "}
          <Link href="/organization" className="text-primary hover:underline">
            Organization
          </Link>{" "}
          and{" "}
          <a href="https://github.com/Nirvacore/nirva-AI/blob/main/API.md" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
            API.md
          </a>
        </p>
      </main>
    </div>
  );
}
