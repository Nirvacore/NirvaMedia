import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const AgentCard: Story = {
  render: () => (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle>DESK</CardTitle>
        <CardDescription>Chief of Staff — routes commands to 109 agents</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Control Tower · Self-hosted · Qwen2.5-72B</p>
      </CardContent>
    </Card>
  ),
};
