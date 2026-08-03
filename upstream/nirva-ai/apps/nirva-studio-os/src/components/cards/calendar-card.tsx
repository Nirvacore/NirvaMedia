import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlatformBadge, StatusBadge } from "./status-badge";
import type { Campaign } from "@/types";

export function CalendarCard({ campaign }: { campaign: Campaign }) {
  return (
    <Card className="transition-colors hover:border-nirva-gold/40">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-1">
        <CardTitle className="text-[13px]">{campaign.name}</CardTitle>
        <StatusBadge status={campaign.status} />
      </CardHeader>
      <CardContent>
        <CardDescription>
          {campaign.startDate} – {campaign.endDate} · {campaign.postCount} posts
        </CardDescription>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {campaign.platforms.map((p) => (
            <PlatformBadge key={p} platform={p} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
