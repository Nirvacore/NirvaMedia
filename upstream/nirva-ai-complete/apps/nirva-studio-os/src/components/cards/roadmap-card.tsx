import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import type { RoadmapModule } from "@/types";

export function RoadmapCard({ module }: { module: RoadmapModule }) {
  return (
    <Card className="opacity-80 transition-opacity hover:opacity-100">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-1">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-nirva-muted" />
          <CardTitle className="text-[13px]">{module.name}</CardTitle>
        </div>
        <StatusBadge status={module.status} />
      </CardHeader>
      <CardContent>
        <CardDescription>{module.reason}</CardDescription>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {module.dependencies.map((dep) => (
            <Badge key={dep} className="border-white/10 bg-white/[0.04] text-zinc-400">
              needs: {dep}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
