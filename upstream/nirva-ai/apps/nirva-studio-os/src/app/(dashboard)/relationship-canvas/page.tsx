"use client";

import { PageHeader } from "@/components/layout/page-header";
import { RelationshipCanvas } from "@/components/canvas/relationship-canvas";

export default function RelationshipCanvasPage() {
  return (
    <>
      <PageHeader
        title="Relationship Canvas"
        subtitle="แผนที่ความสัมพันธ์ธุรกิจแบบซูมได้ — บริษัท คน สัญญา โปรเจกต์ และคอนเทนต์เชื่อมกันหมด"
      />
      <RelationshipCanvas />
    </>
  );
}
