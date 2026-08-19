# 🪪 NID — Identity Platform Architecture (Design Draft)

> **Cost Code:** NID · **Phase:** 1 (Identity · Authentication · Organization · Users · Permissions)
> **Status:** 🟢 Implemented (core) — `shared/identity.ts` · `server/identity/index.ts` · mounted ที่ `/api/v1/identity/*` · tests `server/__tests__/identity.test.ts`
> **Owner:** Founder (approve) · Chief Architect Agent (design) · Backend Agent (implement)

เอกสารนี้จัดทำตาม [Documentation Standards 11 หัวข้อ](NIRVA_ENGINEERING_STANDARDS.md#3-documentation-standards) และ [Database / API / Security Standards](NIRVA_ENGINEERING_STANDARDS.md)

---

## 1. Vision & Purpose

Identity Platform (NID) คือ**บริการกลางแรก**ของ NirvaOS — ทุกแพลตฟอร์ม (Nirva AI, Media, NLE, ฯลฯ) ใช้ระบบตัวตน องค์กร และสิทธิ์ชุดเดียวกัน ไม่มีแพลตฟอร์มใดสร้างระบบ user ของตัวเอง

ขอบเขต Phase 1:

| ส่วน | ครอบคลุม |
|------|----------|
| Identity | Users · Profile · Status |
| Authentication | OAuth · Session · API Keys |
| Organization | Organizations · Teams · Memberships |
| Permissions | Roles · RBAC · Policy check กลาง |

---

## 2. Reuse Analysis (Rule 5: Reuse ก่อน Build)

สิ่งที่มีอยู่แล้วใน repo นี้ และการตัดสินใจ:

| ของเดิม | ที่อยู่ | การตัดสินใจ |
|---------|--------|-------------|
| OAuth flow (Manus portal) + cookie session | `server/auth/index.ts` | ✅ **Reuse** — เพิ่ม provider abstraction ภายหลัง |
| `sessions` table + `AuthUser` | `server/db/index.ts` | 🔁 **Extend** — แยก `users` ออกจาก session ให้เป็น entity ถาวร |
| RBAC 4 roles (viewer/operator/developer/admin) | `shared/permissions.ts` | 🔁 **Extend** — คง role matrix เดิม เพิ่ม scope ระดับ organization/team |
| Multi-tenant (`TenantDefinition`, plans) | `shared/tenants.ts`, `server/tenants/` | 🔁 **Extend** — tenant = organization; เพิ่ม teams + memberships |
| `audit_logs` table | `server/db/index.ts`, `shared/enterprise.ts` | ✅ **Reuse** — ทุก mutation ของ NID เขียน audit log |
| ยังไม่มี: `users`, `organizations` (แยกจาก tenants), `teams`, `memberships`, `api_keys` | — | 🆕 **Build** |

---

## 3. Architecture

```
                  ┌────────────────────────────┐
                  │   ทุก Nirva Platform / App  │
                  └─────────────┬──────────────┘
                                │  /api/v1/identity/*  (+ SDK ภายหลัง)
                  ┌─────────────┴──────────────┐
                  │      NID Identity Core      │
                  ├────────────────────────────┤
                  │ AuthN Service   AuthZ Service│
                  │ (OAuth,Session, (RBAC,Policy │
                  │  API Keys)       Check)      │
                  │ User Service    Org Service  │
                  │ (Profile,       (Orgs,Teams, │
                  │  Lifecycle)      Memberships)│
                  └─────────────┬──────────────┘
                        SQLite (ปัจจุบัน) → PostgreSQL (เมื่อ scale)
                                │
                          audit_logs (ทุก mutation)
```

หลักการ:

- **API First** — ทุกความสามารถผ่าน `/api/v1/identity/*` ก่อน UI
- **Module แยกขาด** — Reuse / Extend / Replace / Scale ได้โดยไม่กระทบโมดูลอื่น (Rule 4)
- AuthZ เป็น **policy check กลาง**: `can(actor, action, resource)` — โมดูลอื่นห้าม hardcode สิทธิ์เอง

---

## 4. Database Design

ทุกตารางมีคอลัมน์มาตรฐานตาม [Database Standards](NIRVA_ENGINEERING_STANDARDS.md#5-database-standards):
`id` · `created_at` · `updated_at` · `created_by` · `updated_by` · `version` · `status` · `deleted_at` (soft delete) + เขียน `audit_logs`

### ตารางใหม่

```sql
users (
  id            TEXT PRIMARY KEY,          -- usr_<nanoid>
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  avatar_url    TEXT,
  locale        TEXT DEFAULT 'th',         -- เชื่อม NLE
  timezone      TEXT DEFAULT 'Asia/Bangkok',
  auth_provider TEXT NOT NULL,             -- 'manus' | 'google' | ...
  provider_id   TEXT,
  status        TEXT DEFAULT 'active',     -- active|suspended|invited
  + คอลัมน์มาตรฐาน
)

organizations (                            -- ขยายจาก tenants เดิม
  id, name, slug UNIQUE, plan,             -- free|pro|enterprise|impact (reuse TenantPlan)
  owner_user_id REFERENCES users,
  settings JSON,
  + คอลัมน์มาตรฐาน
)

teams (
  id, organization_id REFERENCES organizations,
  name, slug,                              -- UNIQUE (organization_id, slug)
  + คอลัมน์มาตรฐาน
)

memberships (                              -- user ↔ org/team + role
  id, user_id REFERENCES users,
  organization_id REFERENCES organizations,
  team_id REFERENCES teams NULL,           -- NULL = สมาชิกระดับ org
  role TEXT NOT NULL,                      -- viewer|operator|developer|admin (reuse UserRole)
  UNIQUE (user_id, organization_id, team_id),
  + คอลัมน์มาตรฐาน
)

api_keys (                                 -- สำหรับ service-to-service + external dev
  id, organization_id, user_id,
  name, key_hash TEXT NOT NULL,            -- เก็บ hash เท่านั้น
  scopes JSON,                             -- ['identity:read', 'media:write', ...]
  last_used_at, expires_at,
  + คอลัมน์มาตรฐาน
)
```

### Migration จากของเดิม

1. `sessions.user` → สร้างแถวใน `users` (backfill ครั้งเดียว)
2. `tenants` → `organizations` (คง id เดิม, `tenant_agents` ยังใช้ต่อ)
3. `shared/permissions.ts` role matrix ใช้ต่อ โดยอ่าน role จาก `memberships` แทน default

---

## 5. API Design

ตาม [API Standards](NIRVA_ENGINEERING_STANDARDS.md#4-api-standards): versioned · auth required · rate limit · error code มาตรฐาน

```
GET    /api/v1/identity/me                    ตัวตน + orgs + roles ของผู้เรียก
GET    /api/v1/identity/users/:id
PATCH  /api/v1/identity/users/:id

POST   /api/v1/identity/orgs                  สร้างองค์กร
GET    /api/v1/identity/orgs/:id
PATCH  /api/v1/identity/orgs/:id
GET    /api/v1/identity/orgs/:id/members
POST   /api/v1/identity/orgs/:id/members      เชิญ/เพิ่มสมาชิก + role
PATCH  /api/v1/identity/orgs/:id/members/:uid เปลี่ยน role
DELETE /api/v1/identity/orgs/:id/members/:uid

POST   /api/v1/identity/orgs/:id/teams
GET    /api/v1/identity/orgs/:id/teams

POST   /api/v1/identity/keys                  ออก API key (คืน plaintext ครั้งเดียว)
GET    /api/v1/identity/keys
DELETE /api/v1/identity/keys/:id

POST   /api/v1/identity/authz/check           { actor, action, resource } → { allowed, reason }
```

**Error format เดียวทั้ง ecosystem:**

```json
{ "error": { "code": "NID-403-ROLE", "message": "...", "requestId": "..." } }
```

---

## 6. Security

ตาม [Security Standards](NIRVA_ENGINEERING_STANDARDS.md#6-security-standards):

- API key เก็บเฉพาะ **hash** (SHA-256) · plaintext แสดงครั้งเดียว
- Session cookie: HttpOnly · SameSite=Lax · Secure ใน production (reuse ของเดิม)
- ทุก mutation เขียน `audit_logs` (actor, action, resource, detail)
- Rate limit ที่ auth endpoints · MFA รองรับใน schema (`users.status`, provider) — เปิดใช้ Phase ถัดไป
- Soft delete เท่านั้น — ไม่มี hard delete ของ identity data

---

## 7. Workflow

```
Client → OAuth login (เดิม) → session cookie
  → ทุก request: middleware resolve user + memberships
  → โมดูลใด ๆ เรียก authz/check ก่อนทำงาน
  → mutation → audit log → response
```

---

## 8. Testing Plan

- **Unit:** role matrix + authz/check ทุก action×role · API key hash/verify · soft delete behavior
- **Integration:** OAuth callback → user backfill · org/member CRUD → audit log ครบ · tenant→org migration script
- **Regression:** ของเดิมต้องไม่พัง — `shared/__tests__`, `server/__tests__` ปัจจุบันผ่านทั้งหมด

---

## 9. Deployment Plan

1. Migration script (backfill users, tenants→orgs) — รันอัตโนมัติตอน boot แบบ idempotent
2. Feature flag `NID_ENABLED` — ปิดได้โดยระบบเดิมทำงานเหมือนเดิม (Rule 4: Replace ได้)
3. ปล่อยตาม [Release Standards](NIRVA_ENGINEERING_STANDARDS.md#12-release-standards): Dev → Testing → Staging → Production + Rollback

---

## 10. Changelog

| Version | วันที่ | รายการ |
|---------|-------|--------|
| 0.1.0-draft | 2026-07-04 | ร่างแรก — Reuse analysis, DB, API, Security design |
| 0.2.0 | 2026-07-04 | Implement core: schema + tenant backfill, users, orgs, teams, memberships, API keys (hash-only), authz/check, audit ทุก mutation, 11 tests |

---

## 11. Next Steps (หลังอนุมัติ)

1. ✅ Architecture Review (Reviewer Agents / ทีม)
2. ⬜ Founder อนุมัติ → เริ่ม implement ตามลำดับ: DB migration → AuthZ service → API → tests
3. ⬜ SDK helper ใน `shared/identity.ts` ให้โมดูลอื่นเรียกใช้

---

## เอกสารที่เกี่ยวข้อง

- [NIRVA_MASTER_EXECUTION_PLAN.md](NIRVA_MASTER_EXECUTION_PLAN.md) — Rule 1–5 และ Priority Phase 1
- [NIRVA_ENGINEERING_STANDARDS.md](NIRVA_ENGINEERING_STANDARDS.md) — มาตรฐานที่เอกสารนี้ปฏิบัติตาม
- [NIRVA_CONSTITUTION.md](NIRVA_CONSTITUTION.md) — Cost Code NID และ Shared Services
