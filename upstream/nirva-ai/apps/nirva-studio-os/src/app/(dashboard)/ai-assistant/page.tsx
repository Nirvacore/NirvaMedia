"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AIChatMock } from "@/components/chat/ai-chat-mock";

export default function AIAssistantPage() {
  return (
    <>
      <PageHeader
        title="AI Assistant"
        subtitle="ถาม Nirva จากทุกอย่างใน workspace — captures, pipeline, ปฏิทิน และ relationship graph"
      />
      <AIChatMock />
    </>
  );
}
