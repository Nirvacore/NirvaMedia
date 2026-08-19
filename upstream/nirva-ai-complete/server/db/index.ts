import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS } from "../../shared/agents.ts";
import { buildAgentDetail } from "../../shared/agent-details.ts";
import { ONE_YEAR_MS } from "../../shared/const.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "..", "data");
const DB_PATH = process.env.DATABASE_PATH || path.join(DATA_DIR, "nirva.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbDir = path.dirname(DB_PATH);
    fs.mkdirSync(dbDir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
    seedIfEmpty(db);
  }
  return db;
}

function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      name TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      tier TEXT NOT NULL,
      category TEXT NOT NULL,
      system_prompt TEXT NOT NULL DEFAULT '',
      capabilities TEXT NOT NULL DEFAULT '[]',
      tools TEXT NOT NULL DEFAULT '[]',
      model TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      use_cases TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      agent TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      agent TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_agent ON chat_sessions(agent);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

    CREATE TABLE IF NOT EXISTS memory_entries (
      id TEXT PRIMARY KEY,
      agent TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual',
      qdrant_point_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory_entries(agent);

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      provider TEXT NOT NULL DEFAULT 'demo',
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS marketplace_listings (
      id TEXT PRIMARY KEY,
      agent_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT 'Nirvacore',
      author_id TEXT,
      tags TEXT NOT NULL DEFAULT '[]',
      config_json TEXT NOT NULL,
      downloads INTEGER NOT NULL DEFAULT 0,
      rating_sum INTEGER NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_marketplace_agent ON marketplace_listings(agent_name);
    CREATE INDEX IF NOT EXISTS idx_marketplace_featured ON marketplace_listings(featured);

    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      plan TEXT NOT NULL DEFAULT 'free',
      description TEXT NOT NULL DEFAULT '',
      max_agents INTEGER NOT NULL DEFAULT 8,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_agents (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      agent_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (tenant_id, agent_name)
    );

    CREATE TABLE IF NOT EXISTS agent_plugins (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      plugin_key TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      config_json TEXT NOT NULL DEFAULT '{}',
      agents_json TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER NOT NULL DEFAULT 0,
      installed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_agents ON tenant_agents(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_plugins_tenant ON agent_plugins(tenant_id);

    CREATE TABLE IF NOT EXISTS model_usage (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_nirva_default',
      agent TEXT NOT NULL,
      model_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      task_preview TEXT NOT NULL DEFAULT '',
      cost_usd REAL NOT NULL DEFAULT 0,
      tokens_estimate INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_model_usage_tenant_date ON model_usage(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_model_usage_tier ON model_usage(tier);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'tenant_nirva_default',
      action TEXT NOT NULL,
      actor TEXT NOT NULL DEFAULT 'system',
      resource TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'info',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_audit_tenant_date ON audit_logs(tenant_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
  `);

  // Add tenant_id to tasks if missing (migration for existing DBs)
  const taskCols = database.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!taskCols.some((c) => c.name === "tenant_id")) {
    database.exec(`ALTER TABLE tasks ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'tenant_nirva_default'`);
    database.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id)`);
  }
}

function seedIfEmpty(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) as c FROM agents").get() as { c: number };
  if (count.c > 0) return;

  const insertAgent = database.prepare(`
    INSERT INTO agents (name, role, tier, category, system_prompt, capabilities, tools, model, description, use_cases)
    VALUES (@name, @role, @tier, @category, @system_prompt, @capabilities, @tools, @model, @description, @use_cases)
  `);

  const seedAgents = database.transaction(() => {
    for (const agent of AGENTS) {
      const detail = buildAgentDetail(agent);
      insertAgent.run({
        name: detail.name,
        role: detail.role,
        tier: detail.tier,
        category: detail.category,
        system_prompt: detail.systemPrompt,
        capabilities: JSON.stringify(detail.capabilities),
        tools: JSON.stringify(detail.tools),
        model: detail.model,
        description: detail.description,
        use_cases: JSON.stringify(detail.useCases),
      });
    }
  });
  seedAgents();

  const insertTask = database.prepare(`
    INSERT INTO tasks (id, title, agent, status, progress, description, created_at, updated_at)
    VALUES (@id, @title, @agent, @status, @progress, @description, @created_at, @updated_at)
  `);

  const now = new Date().toISOString();
  const demoTasks = [
    { id: "1", title: "สร้าง REST API endpoints", agent: "CODE", status: "running", progress: 65, description: "สร้าง CRUD endpoints สำหรับ user management", created_at: new Date(Date.now() - 300000).toISOString(), updated_at: now },
    { id: "2", title: "ออกแบบ Database Schema", agent: "ARCH", status: "running", progress: 40, description: "ออกแบบ schema สำหรับ agent memory", created_at: new Date(Date.now() - 600000).toISOString(), updated_at: now },
    { id: "3", title: "เขียน Unit Tests", agent: "CODE", status: "queued", progress: 0, description: "เขียน tests สำหรับ API endpoints", created_at: new Date(Date.now() - 120000).toISOString(), updated_at: now },
    { id: "4", title: "วิเคราะห์ Security", agent: "SEAL", status: "queued", progress: 0, description: "ตรวจสอบช่องโหว่ความปลอดภัยของระบบ", created_at: new Date(Date.now() - 60000).toISOString(), updated_at: now },
    { id: "5", title: "สร้าง Docker Compose", agent: "FLOW", status: "completed", progress: 100, description: "สร้าง docker-compose.yml สำหรับ production", created_at: new Date(Date.now() - 900000).toISOString(), updated_at: now },
  ];

  const seedTasks = database.transaction(() => {
    for (const task of demoTasks) insertTask.run(task);
  });
  seedTasks();
}

export interface DbAgentRow {
  name: string;
  role: string;
  tier: string;
  category: string;
  system_prompt: string;
  capabilities: string;
  tools: string;
  model: string;
  description: string;
  use_cases: string;
}

export function rowToAgentDetail(row: DbAgentRow) {
  return {
    name: row.name,
    role: row.role,
    tier: row.tier,
    category: row.category,
    systemPrompt: row.system_prompt,
    capabilities: JSON.parse(row.capabilities) as string[],
    tools: JSON.parse(row.tools) as string[],
    model: row.model,
    description: row.description,
    useCases: JSON.parse(row.use_cases) as string[],
  };
}

export function getAgentFromDb(name: string) {
  const row = getDb().prepare("SELECT * FROM agents WHERE name = ?").get(name.toUpperCase()) as DbAgentRow | undefined;
  return row ? rowToAgentDetail(row) : null;
}

export function updateAgentInDb(name: string, updates: Partial<{
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  model: string;
  description: string;
  useCases: string[];
}>) {
  const fields: string[] = [];
  const values: Record<string, unknown> = { name: name.toUpperCase() };

  if (updates.systemPrompt !== undefined) { fields.push("system_prompt = @system_prompt"); values.system_prompt = updates.systemPrompt; }
  if (updates.capabilities !== undefined) { fields.push("capabilities = @capabilities"); values.capabilities = JSON.stringify(updates.capabilities); }
  if (updates.tools !== undefined) { fields.push("tools = @tools"); values.tools = JSON.stringify(updates.tools); }
  if (updates.model !== undefined) { fields.push("model = @model"); values.model = updates.model; }
  if (updates.description !== undefined) { fields.push("description = @description"); values.description = updates.description; }
  if (updates.useCases !== undefined) { fields.push("use_cases = @use_cases"); values.use_cases = JSON.stringify(updates.useCases); }

  if (fields.length === 0) return getAgentFromDb(name);

  fields.push("updated_at = datetime('now')");
  getDb().prepare(`UPDATE agents SET ${fields.join(", ")} WHERE name = @name`).run(values);
  return getAgentFromDb(name);
}

export interface DbTaskRow {
  id: string;
  title: string;
  agent: string;
  status: string;
  progress: number;
  description: string;
  created_at: string;
  updated_at: string;
  tenant_id?: string;
}

export function rowToTask(row: DbTaskRow) {
  return {
    id: row.id,
    title: row.title,
    agent: row.agent,
    status: row.status as "running" | "queued" | "completed" | "failed",
    progress: row.progress,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tenantId: row.tenant_id ?? "tenant_nirva_default",
  };
}

export function listTasks(status?: string, tenantId?: string) {
  let sql = "SELECT * FROM tasks";
  const params: string[] = [];
  const conditions: string[] = [];

  if (tenantId) {
    conditions.push("tenant_id = ?");
    params.push(tenantId);
  }
  if (status && status !== "all") {
    conditions.push("status = ?");
    params.push(status);
  }
  if (conditions.length > 0) sql += ` WHERE ${conditions.join(" AND ")}`;
  sql += " ORDER BY created_at DESC";

  const rows = getDb().prepare(sql).all(...params) as DbTaskRow[];
  return rows.map(rowToTask);
}

export function createTask(data: { title: string; agent: string; description?: string; tenantId?: string }) {
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  const tenantId = data.tenantId ?? "tenant_nirva_default";
  getDb().prepare(`
    INSERT INTO tasks (id, title, agent, status, progress, description, created_at, updated_at, tenant_id)
    VALUES (@id, @title, @agent, 'queued', 0, @description, @created_at, @updated_at, @tenant_id)
  `).run({ id, title: data.title, agent: data.agent, description: data.description || "", created_at: now, updated_at: now, tenant_id: tenantId });
  return rowToTask(getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as DbTaskRow);
}

export function updateTaskStatus(id: string, status: string, progress?: number) {
  const now = new Date().toISOString();
  if (progress !== undefined) {
    getDb().prepare("UPDATE tasks SET status = ?, progress = ?, updated_at = ? WHERE id = ?").run(status, progress, now, id);
  } else {
    getDb().prepare("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?").run(status, now, id);
  }
  const row = getDb().prepare("SELECT * FROM tasks WHERE id = ?").get(id) as DbTaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export function deleteTask(id: string) {
  getDb().prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

export function saveChatMessage(sessionId: string, role: string, content: string, agent?: string) {
  const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO chat_messages (id, session_id, role, content, agent, created_at)
    VALUES (@id, @session_id, @role, @content, @agent, @created_at)
  `).run({ id, session_id: sessionId, role, content, agent: agent || null, created_at: now });
  getDb().prepare("UPDATE chat_sessions SET updated_at = ? WHERE id = ?").run(now, sessionId);
  return { id, role, content, agent, createdAt: now };
}

export function getOrCreateChatSession(agent: string, sessionId?: string) {
  const db = getDb();
  if (sessionId) {
    const existing = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);
    if (existing) return sessionId;
  }
  const id = sessionId || `session_${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO chat_sessions (id, agent, created_at, updated_at)
    VALUES (@id, @agent, @created_at, @updated_at)
  `).run({ id, agent, created_at: now, updated_at: now });
  return id;
}

export function getChatHistory(agent: string, limit = 50) {
  const session = getDb().prepare(`
    SELECT id FROM chat_sessions WHERE agent = ? ORDER BY updated_at DESC LIMIT 1
  `).get(agent) as { id: string } | undefined;

  if (!session) return { sessionId: null, messages: [] };

  const messages = getDb().prepare(`
    SELECT id, role, content, agent, created_at as createdAt
    FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ?
  `).all(session.id, limit);

  return { sessionId: session.id, messages };
}

export interface MemoryEntry {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  qdrantPointId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DbMemoryRow {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  qdrant_point_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMemory(row: DbMemoryRow): MemoryEntry {
  return {
    id: row.id,
    agent: row.agent,
    title: row.title,
    content: row.content,
    source: row.source,
    qdrantPointId: row.qdrant_point_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function insertMemoryEntry(data: {
  id: string;
  agent: string;
  title: string;
  content: string;
  source: string;
  qdrantPointId?: string | null;
}): MemoryEntry {
  const now = new Date().toISOString();
  getDb().prepare(`
    INSERT INTO memory_entries (id, agent, title, content, source, qdrant_point_id, created_at, updated_at)
    VALUES (@id, @agent, @title, @content, @source, @qdrant_point_id, @created_at, @updated_at)
  `).run({
    id: data.id,
    agent: data.agent,
    title: data.title,
    content: data.content,
    source: data.source,
    qdrant_point_id: data.qdrantPointId ?? null,
    created_at: now,
    updated_at: now,
  });
  return rowToMemory(getDb().prepare("SELECT * FROM memory_entries WHERE id = ?").get(data.id) as DbMemoryRow);
}

export function listMemoryEntries(agent?: string): MemoryEntry[] {
  if (agent) {
    const rows = getDb().prepare(
      "SELECT * FROM memory_entries WHERE agent = ? ORDER BY created_at DESC"
    ).all(agent) as DbMemoryRow[];
    return rows.map(rowToMemory);
  }
  const rows = getDb().prepare("SELECT * FROM memory_entries ORDER BY created_at DESC").all() as DbMemoryRow[];
  return rows.map(rowToMemory);
}

export function getMemoryEntry(id: string): MemoryEntry | null {
  const row = getDb().prepare("SELECT * FROM memory_entries WHERE id = ?").get(id) as DbMemoryRow | undefined;
  return row ? rowToMemory(row) : null;
}

export function deleteMemoryEntry(id: string): void {
  getDb().prepare("DELETE FROM memory_entries WHERE id = ?").run(id);
}

export function searchMemoryFallback(agent: string, query: string, limit = 5): MemoryEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
  if (words.length === 0) return [];

  const conditions = words.map(() => "(LOWER(content) LIKE ? OR LOWER(title) LIKE ?)").join(" OR ");
  const params: (string | number)[] = [agent, ...words.flatMap((w) => [`%${w}%`, `%${w}%`]), limit];

  const rows = getDb().prepare(`
    SELECT * FROM memory_entries
    WHERE agent = ? AND (${conditions})
    ORDER BY created_at DESC LIMIT ?
  `).all(...params) as DbMemoryRow[];
  return rows.map(rowToMemory);
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: string;
}

interface DbSessionRow {
  id: string;
  user_id: string;
  email: string;
  name: string;
  provider: string;
  created_at: string;
  expires_at: string;
}

export function createSession(data: {
  userId: string;
  email: string;
  name: string;
  provider: string;
}) {
  const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date();
  const expires = new Date(now.getTime() + ONE_YEAR_MS);
  getDb().prepare(`
    INSERT INTO sessions (id, user_id, email, name, provider, created_at, expires_at)
    VALUES (@id, @user_id, @email, @name, @provider, @created_at, @expires_at)
  `).run({
    id,
    user_id: data.userId,
    email: data.email,
    name: data.name,
    provider: data.provider,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  });
  return { id, userId: data.userId, email: data.email, name: data.name, provider: data.provider, expiresAt: expires.toISOString() };
}

export function getSession(id: string) {
  const row = getDb().prepare("SELECT * FROM sessions WHERE id = ?").get(id) as DbSessionRow | undefined;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    provider: row.provider,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function deleteSession(id: string) {
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(id);
}

export function appendAuditLog(opts: {
  tenantId?: string;
  action: string;
  actor?: string;
  resource?: string;
  detail?: string;
  severity?: "info" | "warning" | "critical";
}) {
  const id = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  getDb()
    .prepare(
      `INSERT INTO audit_logs (id, tenant_id, action, actor, resource, detail, severity, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    )
    .run(
      id,
      opts.tenantId || "tenant_nirva_default",
      opts.action,
      opts.actor || "system",
      opts.resource || "",
      opts.detail || "",
      opts.severity || "info"
    );
  return id;
}

export function listAuditLogs(opts: { tenantId?: string; limit?: number } = {}) {
  const limit = opts.limit ?? 50;
  const rows = opts.tenantId
    ? (getDb()
        .prepare(
          `SELECT id, tenant_id, action, actor, resource, detail, severity, created_at
           FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?`
        )
        .all(opts.tenantId, limit) as AuditLogRow[])
    : (getDb()
        .prepare(
          `SELECT id, tenant_id, action, actor, resource, detail, severity, created_at
           FROM audit_logs ORDER BY created_at DESC LIMIT ?`
        )
        .all(limit) as AuditLogRow[]);

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenant_id,
    action: r.action,
    actor: r.actor,
    resource: r.resource,
    detail: r.detail,
    severity: r.severity as "info" | "warning" | "critical",
    createdAt: r.created_at,
  }));
}

interface AuditLogRow {
  id: string;
  tenant_id: string;
  action: string;
  actor: string;
  resource: string;
  detail: string;
  severity: string;
  created_at: string;
}
