# API Specification

> REST and WebSocket API for Nirva AI Core Dashboard.

**Status:** v0.1 frontend uses static/mock data. This document defines the planned API contract for backend integration (Sprint 1+).

---

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:8000/api` |
| Production | `https://your-domain.com/api` |

Frontend env: configure via `VITE_OLLAMA_URL`, `VITE_QDRANT_URL`, `VITE_N8N_URL` in `.env`.

---

## Authentication

```
Authorization: Bearer <token>
```

OAuth flow prepared via:
- `VITE_OAUTH_PORTAL_URL` — OAuth portal base URL
- `VITE_APP_ID` — Application ID

Callback: `{origin}/api/oauth/callback`

---

## Agents

### List Agents

```
GET /api/agents
```

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tier` | string | Filter: `self-hosted`, `hybrid`, `cloud` |
| `category` | string | Filter by category name |
| `search` | string | Search name or role |
| `page` | number | Page number (default 1) |
| `limit` | number | Results per page (default 50) |

**Response:**

```json
{
  "agents": [
    {
      "name": "DESK",
      "role": "Chief of Staff (reasoning + routing)",
      "tier": "self-hosted",
      "category": "Core Control Tower",
      "status": "idle",
      "model": "Qwen2.5-72B"
    }
  ],
  "total": 109,
  "page": 1,
  "limit": 50
}
```

### Get Agent Detail

```
GET /api/agents/:name
```

**Response:**

```json
{
  "name": "DESK",
  "role": "Chief of Staff (reasoning + routing)",
  "tier": "self-hosted",
  "category": "Core Control Tower",
  "systemPrompt": "You are DESK...",
  "capabilities": ["Intent classification", "Task decomposition"],
  "tools": ["Router API", "Agent Registry"],
  "model": "Qwen2.5-72B / DeepSeek-V2",
  "description": "DESK เป็นหัวหน้าทีม AI...",
  "useCases": ["รับคำสั่งจากผู้ใช้..."],
  "status": "idle",
  "lastActive": "2026-06-23T10:30:00Z"
}
```

### Update Agent

```
PATCH /api/agents/:name
```

**Body:**

```json
{
  "systemPrompt": "Updated prompt...",
  "model": "llama3.1:8b"
}
```

### Agent Stats

```
GET /api/agents/stats
```

**Response:**

```json
{
  "total": 109,
  "selfHosted": 28,
  "hybrid": 45,
  "cloud": 36,
  "active": 8,
  "idle": 95,
  "running": 3
}
```

---

## Chat

### Send Message

```
POST /api/chat
```

**Body:**

```json
{
  "message": "สร้าง REST API สำหรับ user management",
  "agent": "CODE",
  "stream": true
}
```

**Response (non-streaming):**

```json
{
  "id": "msg_abc123",
  "role": "assistant",
  "content": "ได้ครับ นี่คือตัวอย่างโค้ด...",
  "agent": "CODE",
  "timestamp": "2026-06-23T10:30:00Z"
}
```

**Response (streaming):** Server-Sent Events (SSE)

```
event: message
data: {"delta": "ได้ครับ", "done": false}

event: message
data: {"delta": " นี่คือ...", "done": false}

event: done
data: {"id": "msg_abc123", "done": true}
```

### Chat History

```
GET /api/chat/history?agent=CODE&limit=50
```

---

## Tasks

### List Tasks

```
GET /api/tasks
```

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | `running`, `queued`, `completed`, `failed` |
| `agent` | string | Filter by agent name |

**Response:**

```json
{
  "tasks": [
    {
      "id": "task_001",
      "title": "สร้าง REST API endpoints",
      "agent": "CODE",
      "status": "running",
      "progress": 65,
      "description": "สร้าง CRUD endpoints สำหรับ user management",
      "createdAt": "2026-06-23T10:00:00Z"
    }
  ]
}
```

### Create Task

```
POST /api/tasks
```

**Body:**

```json
{
  "title": "เขียน Unit Tests",
  "agent": "CODE",
  "description": "เขียน pytest สำหรับ API endpoints"
}
```

### Task Actions

```
POST /api/tasks/:id/retry
POST /api/tasks/:id/pause
POST /api/tasks/:id/cancel
DELETE /api/tasks/:id
```

---

## System

### Health Check

```
GET /api/health
```

**Response:**

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "services": {
    "ollama": { "status": "running", "url": "http://localhost:11434" },
    "qdrant": { "status": "running", "url": "http://localhost:6333" },
    "n8n": { "status": "running", "url": "http://localhost:5678" },
    "fastapi": { "status": "running", "url": "http://localhost:8000" }
  },
  "uptime": 86400,
  "memory": { "used": "2.4 GB", "total": "8 GB" },
  "cpu": "23%"
}
```

### System Status (Terminal)

```
GET /api/system/status
```

Returns formatted status block (used by Terminal page).

### Ollama Models

```
GET /api/ollama/models
```

**Response:**

```json
{
  "models": [
    { "name": "llama3.1:8b", "size": "4.7 GB", "modified": "2 days ago" },
    { "name": "codellama:13b", "size": "7.4 GB", "modified": "1 week ago" }
  ]
}
```

---

## Files

### List Files

```
GET /api/files?path=/nirva-ai-core
```

### Upload File

```
POST /api/files/upload
Content-Type: multipart/form-data
```

### Download File

```
GET /api/files/download?path=/nirva-ai-core/main.py
```

### Delete File

```
DELETE /api/files?path=/nirva-ai-core/main.py
```

---

## WebSocket (Planned)

### Agent Status Stream

```
WS /api/ws/agents
```

**Messages:**

```json
{ "type": "agent_status", "agent": "CODE", "status": "running", "task": "task_001" }
{ "type": "task_progress", "task": "task_001", "progress": 72 }
{ "type": "system_alert", "level": "warning", "message": "Ollama memory at 90%" }
```

### Chat Stream

```
WS /api/ws/chat
```

Send/receive chat messages with streaming support.

---

## Error Format

```json
{
  "error": {
    "code": "AGENT_NOT_FOUND",
    "message": "Agent 'UNKNOWN' not found in registry",
    "status": 404
  }
}
```

| Code | HTTP | Description |
|------|------|-------------|
| `AGENT_NOT_FOUND` | 404 | Agent name not in registry |
| `TASK_NOT_FOUND` | 404 | Task ID not found |
| `OLLAMA_UNAVAILABLE` | 503 | Ollama server not reachable |
| `RATE_LIMITED` | 429 | Too many requests |
| `UNAUTHORIZED` | 401 | Missing or invalid token |

---

## Current Implementation (v0.1)

| Endpoint | Status | Implementation |
|----------|--------|----------------|
| All REST endpoints | Mock | Hardcoded in page components |
| WebSocket | Not started | — |
| OAuth | Prepared | `getLoginUrl()` in `client/src/const.ts` |
| Terminal commands | Mock | `mockCommands` in `Terminal.tsx` |
| Chat responses | Mock | `mockResponses` in `Chat.tsx` |

The production Express server (`server/index.ts`) currently only serves static files with SPA fallback.
