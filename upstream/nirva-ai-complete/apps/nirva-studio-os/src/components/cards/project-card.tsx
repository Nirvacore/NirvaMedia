import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="transition-colors hover:border-nirva-violet/40">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription className="mt-1">{project.description}</CardDescription>
        </div>
        <StatusBadge status={project.status} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full",
                project.accent === "violet"
                  ? "bg-gradient-to-r from-nirva-violet to-nirva-violet-soft"
                  : "bg-gradient-to-r from-nirva-gold to-nirva-gold-soft"
              )}
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-nirva-muted">{project.progress}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
