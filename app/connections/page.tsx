"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- vinext client runtime currently duplicates React through next/link */

import { useCallback, useEffect, useMemo, useState } from "react";
import { connectorCatalog } from "../../lib/product-catalog";
import styles from "./connections.module.css";

type ConnectionStatus = "setup_required" | "connected" | "error";

type ConnectorAccount = {
  id: string;
  connectorId: string;
  accountName: string;
  status: ConnectionStatus;
  externalAccountId: string | null;
  lastSyncedAt: string | number | null;
  updatedAt: string | number;
};

type PublishJob = {
  id: string;
  channel: string;
  status: "queued" | "blocked_auth" | "published" | "failed";
  scheduledAt: string | number | null;
  attempts: number;
  lastError: string | null;
  createdAt: string | number;
};

type WorkspaceEntitlement = {
  bundleId: string | null;
  connectorIds: string[];
  moduleIds: string[];
  status: string;
};

const connectorDetails: Record<string, { mark: string; accent: string; description: string }> = {
  "meta-network": { mark: "M", accent: "violet", description: "บัญชีธุรกิจและเพจในเครือ Meta ผ่านแกนอนุมัติเดียว" },
  "google-video": { mark: "▶", accent: "red", description: "วิดีโอแบบยาวและ Shorts พร้อมสถานะการส่งงานร่วมกัน" },
  "bytedance-global": { mark: "♪", accent: "cyan", description: "TikTok Global แยกจาก Douyin และระบบจีนโดยชัดเจน" },
  "line-ecosystem": { mark: "L", accent: "green", description: "LINE Official Account, Messaging และ Broadcast สำหรับเอเชีย" },
  "china-dedicated": { mark: "中", accent: "gold", description: "บัญชี API และข้อกำกับเฉพาะจีน ไม่ใช้ร่วมกับ Global TikTok" },
  "regional-plus": { mark: "+", accent: "blue", description: "ช่องทางท้องถิ่นและเครือข่ายมืออาชีพสำหรับการขยายรายภูมิภาค" },
};

const statusCopy = {
  draft_ready: { label: "Draft-ready", detail: "สร้างร่างเนื้อหาได้ ยังไม่ได้เริ่มเชื่อมบัญชี" },
  setup_required: { label: "Setup required", detail: "สร้างรายการบัญชีแล้ว รอขั้นตอน OAuth" },
  connected: { label: "Connected", detail: "บัญชีภายนอกยืนยันแล้ว พร้อมรับงานเผยแพร่" },
  error: { label: "Error", detail: "การเชื่อมต่อมีปัญหา ต้องตรวจสอบใหม่" },
} as const;

function formatDate(value: string | number | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function jobLabel(status: PublishJob["status"]) {
  return {
    queued: "รอเผยแพร่",
    blocked_auth: "รอเชื่อมบัญชี",
    published: "เผยแพร่แล้ว",
    failed: "ไม่สำเร็จ",
  }[status];
}

export default function ConnectionsPage() {
  const [accounts, setAccounts] = useState<ConnectorAccount[]>([]);
  const [jobs, setJobs] = useState<PublishJob[]>([]);
  const [entitlement, setEntitlement] = useState<WorkspaceEntitlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingConnector, setWorkingConnector] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadWorkspace = useCallback(async () => {
    try {
      const [connectionsResponse, jobsResponse, entitlementResponse] = await Promise.all([
        fetch("/api/connections"),
        fetch("/api/publish-jobs"),
        fetch("/api/entitlements"),
      ]);
      if (!connectionsResponse.ok || !jobsResponse.ok || !entitlementResponse.ok) throw new Error();
      const [connectionsData, jobsData, entitlementData] = await Promise.all([
        connectionsResponse.json(),
        jobsResponse.json(),
        entitlementResponse.json(),
      ]);
      setAccounts(connectionsData.connections ?? connectionsData.accounts ?? []);
      setJobs(jobsData.jobs ?? []);
      setEntitlement(entitlementData.entitlement ?? null);
      setError("");
    } catch {
      setError("ยังโหลดสถานะการเชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const request = Promise.resolve().then(loadWorkspace);
    void request;
  }, [loadWorkspace]);

  const accountByConnector = useMemo(() => {
    const result = new Map<string, ConnectorAccount>();
    accounts.forEach((account) => {
      if (!result.has(account.connectorId)) result.set(account.connectorId, account);
    });
    return result;
  }, [accounts]);

  const connectedCount = accounts.filter((account) => account.status === "connected").length;
  const pendingCount = accounts.filter((account) => account.status === "setup_required").length;
  const entitledConnectors = entitlement?.connectorIds ?? [];

  async function startSetup(connectorId: string, connectorName: string) {
    setWorkingConnector(connectorId);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId, accountName: `${connectorName} · Nirva Workspace` }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "เริ่มตั้งค่าไม่สำเร็จ");
      }
      await loadWorkspace();
      setMessage(`${connectorName} ถูกเตรียมไว้แล้ว ขั้นถัดไปคือยืนยันบัญชีผ่าน OAuth`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เริ่มตั้งค่าไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setWorkingConnector(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <a className={styles.brand} href="/" aria-label="Nirva Media home">
          <span className={styles.brandMark}><i /><i /><i /></span>
          <span>Nirva<span>Media</span></span>
        </a>
        <nav aria-label="เมนูหลัก">
          <a href="/">เว็บไซต์</a>
          <a href="/studio">Campaign Studio</a>
          <a href="/solutions">Product Fabric</a>
          <a className={styles.activeNav} href="/connections">Connections</a>
        </nav>
        <span className={styles.workspaceState}><i /> NIRVA WORKSPACE</span>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>CONNECTION CENTER · ONE GLOBAL FABRIC</span>
          <h1>ทุกแพลตฟอร์ม<br /><em>ต่อผ่านแกนเดียว</em></h1>
          <p>จัดการบัญชี ช่องทาง และคิวเผยแพร่ทั่วโลกจากที่เดียว โดยยังคงแยกกฎ API บัญชี และข้อกำกับของแต่ละภูมิภาคอย่างถูกต้อง</p>
          <div className={styles.heroActions}>
            <a href="#connector-families">ดู Connector Families <span>↓</span></a>
            <a href="/solutions">จัดการแพ็กเกจ</a>
          </div>
        </div>

        <div className={styles.commandCard}>
          <div className={styles.commandTop}>
            <span><i /> CONNECTION FOUNDATION</span>
            <small>{loading ? "กำลังตรวจสอบ" : "พร้อมทำงาน"}</small>
          </div>
          <div className={styles.connectionPulse}>
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
            <span>N</span>
            {connectorCatalog.map((connector, index) => (
              <b className={styles[`node${index + 1}`]} key={connector.id}>{connectorDetails[connector.id].mark}</b>
            ))}
          </div>
          <div className={styles.metrics}>
            <div><strong>{entitledConnectors.length || "—"}</strong><span>Enabled families</span></div>
            <div><strong>{connectedCount}</strong><span>Connected</span></div>
            <div><strong>{pendingCount}</strong><span>Waiting OAuth</span></div>
          </div>
        </div>
      </section>

      <section className={styles.truthStrip}>
        <span>สถานะระบบจริง</span>
        <p><strong>Connection Foundation เปิดใช้งานแล้ว</strong> สำหรับทะเบียนบัญชี คิวเผยแพร่ และบันทึกเหตุการณ์ แต่ยังไม่มีการขอ Token หรือส่งโพสต์ไปแพลตฟอร์มภายนอกจริงในขั้นนี้</p>
      </section>

      <section className={styles.content} id="connector-families">
        <div className={styles.sectionHeading}>
          <div><span>01</span><div><small>GLOBAL CONNECTOR MAP</small><h2>6 Connector Families</h2></div></div>
          <p>เริ่มจากครอบครัวที่อยู่ใน Product Fabric ของ Workspace แล้วค่อยยืนยันบัญชีจริงในขั้น OAuth</p>
        </div>

        {error && <div className={styles.alert} role="alert">{error}<button onClick={loadWorkspace}>ลองใหม่</button></div>}
        {message && <div className={styles.success} role="status"><span>✓</span>{message}</div>}

        <div className={styles.connectorGrid}>
          {connectorCatalog.map((connector) => {
            const account = accountByConnector.get(connector.id);
            const currentStatus = account?.status ?? "draft_ready";
            const copy = statusCopy[currentStatus];
            const allowed = entitledConnectors.includes(connector.id);
            const detail = connectorDetails[connector.id];
            const waiting = workingConnector === connector.id;

            return (
              <article className={`${styles.connectorCard} ${styles[detail.accent]}`} key={connector.id}>
                <div className={styles.connectorCardTop}>
                  <span className={styles.connectorIcon}>{detail.mark}</span>
                  <span className={`${styles.statusBadge} ${styles[currentStatus]}`}><i /> {copy.label}</span>
                </div>
                <small className={styles.scope}>{connector.scope}</small>
                <h3>{connector.name}</h3>
                <p className={styles.platforms}>{connector.platforms}</p>
                <p className={styles.description}>{detail.description}</p>

                <div className={styles.accountState}>
                  <span>{account?.accountName ?? "ยังไม่มีบัญชีในทะเบียน"}</span>
                  <small>{account ? copy.detail : allowed ? copy.detail : "สร้างร่างได้ แต่ Connector นี้ยังไม่อยู่ในแพ็กเกจที่เปิดใช้"}</small>
                  {account?.lastSyncedAt && <small>ตรวจล่าสุด {formatDate(account.lastSyncedAt)}</small>}
                </div>

                <button
                  disabled={!allowed || waiting || currentStatus === "setup_required" || currentStatus === "connected"}
                  onClick={() => startSetup(connector.id, connector.name)}
                >
                  {waiting
                    ? "กำลังเตรียม..."
                    : currentStatus === "connected"
                      ? "เชื่อมต่อแล้ว"
                      : currentStatus === "setup_required"
                        ? "รอ OAuth"
                        : currentStatus === "error"
                          ? "เริ่มตั้งค่าใหม่"
                          : allowed
                            ? "เริ่มตั้งค่า"
                            : "เพิ่มผ่าน Product Fabric"}
                  <span>{currentStatus === "connected" ? "✓" : "→"}</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.queueSection}>
        <div className={styles.sectionHeading}>
          <div><span>02</span><div><small>SMART PUBLISHER</small><h2>Publish Queue</h2></div></div>
          <a href="/studio">สร้างงานใน Campaign Studio →</a>
        </div>

        <div className={styles.queueShell}>
          <div className={styles.queueSummary}>
            <div><strong>{jobs.length}</strong><span>งานล่าสุด</span></div>
            <div><strong>{jobs.filter((job) => job.status === "queued").length}</strong><span>รอเผยแพร่</span></div>
            <div><strong>{jobs.filter((job) => job.status === "blocked_auth").length}</strong><span>รอเชื่อมบัญชี</span></div>
            <p>งานที่ยังไม่มีบัญชี Connected จะถูกเก็บอย่างปลอดภัยในสถานะ “รอเชื่อมบัญชี” และไม่ถูกส่งออกภายนอก</p>
          </div>

          {jobs.length > 0 ? (
            <div className={styles.queueTable} role="table" aria-label="คิวเผยแพร่ล่าสุด">
              <div className={styles.tableHead} role="row">
                <span role="columnheader">ช่องทาง</span><span role="columnheader">สถานะ</span><span role="columnheader">กำหนดเวลา</span><span role="columnheader">การลองส่ง</span>
              </div>
              {jobs.map((job) => (
                <div className={styles.tableRow} role="row" key={job.id}>
                  <div role="cell"><b>{job.channel}</b><small>Job {job.id.slice(0, 8)}</small></div>
                  <div role="cell"><span className={`${styles.jobStatus} ${styles[job.status]}`}><i /> {jobLabel(job.status)}</span>{job.lastError && <small>{job.lastError}</small>}</div>
                  <div role="cell"><span>{formatDate(job.scheduledAt ?? job.createdAt)}</span><small>{job.scheduledAt ? "กำหนดเผยแพร่" : "สร้างรายการ"}</small></div>
                  <div role="cell"><b>{job.attempts}</b><small>ครั้ง</small></div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyQueue}>
              <span>↗</span>
              <h3>ยังไม่มีงานในคิวเผยแพร่</h3>
              <p>เมื่อตั้งเวลาโพสต์จาก Campaign Studio งานจะปรากฏที่นี่ พร้อมตรวจสถานะการเชื่อมบัญชีก่อนส่ง</p>
              <a href="/studio">เปิด Campaign Studio</a>
            </div>
          )}
        </div>
      </section>

      <section className={styles.foundation}>
        <div><small>SHARED CONNECTION FOUNDATION</small><h2>สร้างครั้งเดียว<br />ขยายได้ทั่วโลก</h2></div>
        <div className={styles.foundationSteps}>
          <span><b>01</b> Account registry</span>
          <span><b>02</b> Publish jobs</span>
          <span><b>03</b> Audit events</span>
          <span className={styles.future}><b>04</b> OAuth & token vault <em>NEXT</em></span>
          <span className={styles.future}><b>05</b> Live adapters <em>NEXT</em></span>
        </div>
      </section>

      <footer className={styles.footer}>
        <a className={styles.brand} href="/"><span className={styles.brandMark}><i /><i /><i /></span><span>Nirva<span>Media</span></span></a>
        <p>One workspace. Every market. Clear connection truth.</p>
        <div><a href="/solutions">Product Fabric</a><a href="/studio">Campaign Studio</a></div>
      </footer>
    </main>
  );
}
