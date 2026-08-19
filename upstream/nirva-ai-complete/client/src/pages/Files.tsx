import Sidebar from "@/components/Sidebar";
import { useState } from "react";
import { Folder, FileText, FileCode, FileImage, Download, Upload, Trash2, ChevronRight, Home as HomeIcon, Search } from "lucide-react";
import { toast } from "sonner";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  extension?: string;
  size?: string;
  modified: string;
  children?: FileItem[];
}

const fileTree: FileItem[] = [
  {
    id: "1", name: "nirva-ai-core", type: "folder", modified: "2026-06-22", children: [
      { id: "1-1", name: "main.py", type: "file", extension: "py", size: "4.2 KB", modified: "2026-06-22" },
      { id: "1-2", name: "agents.py", type: "file", extension: "py", size: "8.7 KB", modified: "2026-06-22" },
      { id: "1-3", name: "docker-compose.yml", type: "file", extension: "yml", size: "1.8 KB", modified: "2026-06-21" },
      { id: "1-4", name: "requirements.txt", type: "file", extension: "txt", size: "0.5 KB", modified: "2026-06-20" },
      {
        id: "1-5", name: "src", type: "folder", modified: "2026-06-22", children: [
          { id: "1-5-1", name: "graph.py", type: "file", extension: "py", size: "6.1 KB", modified: "2026-06-22" },
          { id: "1-5-2", name: "memory.py", type: "file", extension: "py", size: "3.4 KB", modified: "2026-06-21" },
          { id: "1-5-3", name: "tools.py", type: "file", extension: "py", size: "5.9 KB", modified: "2026-06-21" },
        ]
      },
    ]
  },
  {
    id: "2", name: "configs", type: "folder", modified: "2026-06-21", children: [
      { id: "2-1", name: "ollama.json", type: "file", extension: "json", size: "1.2 KB", modified: "2026-06-21" },
      { id: "2-2", name: "qdrant.json", type: "file", extension: "json", size: "0.8 KB", modified: "2026-06-20" },
      { id: "2-3", name: "n8n-workflows.json", type: "file", extension: "json", size: "12.4 KB", modified: "2026-06-20" },
    ]
  },
  {
    id: "3", name: "docs", type: "folder", modified: "2026-06-20", children: [
      { id: "3-1", name: "HANDOFF.md", type: "file", extension: "md", size: "15.2 KB", modified: "2026-06-20" },
      { id: "3-2", name: "CLAUDE.md", type: "file", extension: "md", size: "8.9 KB", modified: "2026-06-20" },
      { id: "3-3", name: "architecture.png", type: "file", extension: "png", size: "245 KB", modified: "2026-06-19" },
    ]
  },
  { id: "4", name: "README.md", type: "file", extension: "md", size: "3.1 KB", modified: "2026-06-22" },
  { id: "5", name: ".env.example", type: "file", extension: "env", size: "0.4 KB", modified: "2026-06-20" },
];

function getFileIcon(item: FileItem) {
  if (item.type === "folder") return <Folder className="w-5 h-5 text-amber-500" />;
  if (item.extension === "png" || item.extension === "jpg") return <FileImage className="w-5 h-5 text-pink-500" />;
  if (item.extension === "py" || item.extension === "ts" || item.extension === "tsx") return <FileCode className="w-5 h-5 text-blue-500" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
}

export default function Files() {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  function getCurrentItems(): FileItem[] {
    let items = fileTree;
    for (const segment of currentPath) {
      const folder = items.find((i) => i.name === segment && i.type === "folder");
      if (folder?.children) items = folder.children;
      else break;
    }
    return items;
  }

  function navigateToFolder(name: string) {
    setCurrentPath((prev) => [...prev, name]);
  }

  function navigateToIndex(index: number) {
    setCurrentPath((prev) => prev.slice(0, index));
  }

  const currentItems = getCurrentItems();
  const filteredItems = searchQuery
    ? currentItems.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : currentItems;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 ml-[72px] p-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">File Manager</h1>
            <p className="text-sm text-muted-foreground mt-1">จัดการไฟล์โปรเจกต์ของคุณ</p>
          </div>
          <button
            onClick={() => toast.info("อัปโหลดไฟล์ — ฟีเจอร์กำลังพัฒนา")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all active:scale-97"
          >
            <Upload className="w-4 h-4" />
            อัปโหลด
          </button>
        </header>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 mb-4 text-sm">
          <button
            onClick={() => setCurrentPath([])}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
          >
            <HomeIcon className="w-3.5 h-3.5" />
            root
          </button>
          {currentPath.map((segment, i) => (
            <div key={i} className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
              <button
                onClick={() => navigateToIndex(i + 1)}
                className="px-2 py-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
              >
                {segment}
              </button>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาไฟล์..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>

        {/* File List */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_100px_140px_80px] px-5 py-3 border-b border-border bg-muted/20 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span>ชื่อ</span>
            <span>ขนาด</span>
            <span>แก้ไขล่าสุด</span>
            <span className="text-right">จัดการ</span>
          </div>
          {/* Items */}
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_100px_140px_80px] px-5 py-3.5 border-b border-border/50 last:border-b-0 hover:bg-muted/20 transition-colors group items-center"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(item)}
                {item.type === "folder" ? (
                  <button
                    onClick={() => navigateToFolder(item.name)}
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {item.name}
                  </button>
                ) : (
                  <span className="text-sm text-foreground">{item.name}</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{item.size || "—"}</span>
              <span className="text-xs text-muted-foreground">{item.modified}</span>
              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {item.type === "file" && (
                  <button
                    onClick={() => toast.success(`ดาวน์โหลด ${item.name}`)}
                    className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => toast.success(`ลบ ${item.name}`)}
                  className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <Folder className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">ไม่พบไฟล์</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
