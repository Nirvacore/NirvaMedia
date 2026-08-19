"use client";

import { useMemo, useState } from "react";

type SourceFile = {
  path: string;
  category: string;
  bytes: number;
  sha256: string;
};

type SourceCategory = {
  name: string;
  files: number;
  bytes: number;
};

export function CompleteSourceExplorer({
  categories,
  files,
}: {
  categories: SourceCategory[];
  files: SourceFile[];
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const visibleFiles = useMemo(() => files.filter((file) => (
    (category === "All" || file.category === category)
    && (!normalizedQuery || file.path.toLowerCase().includes(normalizedQuery))
  )), [category, files, normalizedQuery]);

  return (
    <div className="source-explorer">
      <div className="source-category-grid">
        <button className={category === "All" ? "active" : ""} onClick={() => setCategory("All")}>
          <span>ALL SOURCE</span><strong>{files.length}</strong><small>ทุกไฟล์ที่ Claude สร้าง</small>
        </button>
        {categories.map((item) => (
          <button key={item.name} className={category === item.name ? "active" : ""} onClick={() => setCategory(item.name)}>
            <span>{item.name}</span><strong>{item.files}</strong><small>{(item.bytes / 1024).toFixed(0)} KB</small>
          </button>
        ))}
      </div>

      <div className="source-browser">
        <header>
          <div><span>STRUCTURE INDEX</span><strong>{visibleFiles.length} files</strong></div>
          <label><span>ค้นหาไฟล์</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="เช่น content-studio, media, sdk…" /></label>
        </header>
        <div className="source-file-list">
          {visibleFiles.map((file, index) => (
            <article key={file.path}>
              <span>{String(index + 1).padStart(3, "0")}</span>
              <div><strong>{file.path}</strong><small>{file.category} · {(file.bytes / 1024).toFixed(1)} KB</small></div>
              <code>{file.sha256.slice(0, 12)}</code>
            </article>
          ))}
          {visibleFiles.length === 0 && <p>ไม่พบไฟล์ที่ตรงกับคำค้น</p>}
        </div>
      </div>
    </div>
  );
}
