"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- vinext client runtime currently duplicates React through next/link */

import { useEffect, useState } from "react";
import { channelsForConnectors } from "../../lib/product-catalog";

const allChannelOptions = [
  "Instagram", "Facebook", "WhatsApp Business", "Threads", "YouTube", "TikTok", "LINE OA", "X",
  "LinkedIn", "Telegram", "Pinterest", "Snapchat", "WeChat", "Douyin", "Weibo", "Xiaohongshu",
  "KakaoTalk", "Naver Blog",
];

const languageNames: Record<string, string> = {
  th: "ไทย",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

type StudioPost = {
  id: string;
  campaignId: string;
  channel: string;
  format: string;
  title: string;
  body: string;
  scheduledAt: string | null;
  status: string;
  createdAt: string | number;
};

type CampaignSummary = {
  id: string;
  brief: string;
  language: string;
  tone: string;
  channels: string[];
  status: string;
  createdAt: string | number;
  posts: StudioPost[];
};

type WorkspaceEntitlement = {
  bundleId: string | null;
  moduleIds: string[];
  connectorIds: string[];
  status: string;
};

const artColors: Record<string, string> = {
  Instagram: "mint",
  Facebook: "blue",
  "LINE OA": "dark",
  TikTok: "blue",
  LinkedIn: "dark",
  YouTube: "mint",
  "WhatsApp Business": "mint",
  Threads: "dark",
  X: "dark",
  Telegram: "blue",
  Pinterest: "dark",
  Snapchat: "mint",
  WeChat: "mint",
  Douyin: "dark",
  Weibo: "blue",
  Xiaohongshu: "dark",
  KakaoTalk: "mint",
  "Naver Blog": "mint",
};

function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function tomorrowIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export default function StudioPage() {
  const [channels, setChannels] = useState(["Instagram", "Facebook", "LINE OA"]);
  const [language, setLanguage] = useState("th");
  const [tone, setTone] = useState("อบอุ่นและมั่นใจ");
  const [brief, setBrief] = useState("เปิดตัว Nirva Media ให้ทีมการตลาดไทยเห็นว่าหนึ่งไอเดียสามารถไปได้ทุกช่องทาง");
  const [generated, setGenerated] = useState(false);
  const [posts, setPosts] = useState<StudioPost[]>([]);
  const [recentCampaigns, setRecentCampaigns] = useState<CampaignSummary[]>([]);
  const [entitlement, setEntitlement] = useState<WorkspaceEntitlement>({
    bundleId: "enterprise-global",
    moduleIds: ["content-studio", "language-engine", "smart-publisher", "market-intelligence", "performance-intelligence", "enterprise-control", "mobile-workspace"],
    connectorIds: ["meta-network", "google-video", "bytedance-global", "line-ecosystem", "china-dedicated", "regional-plus"],
    status: "trial",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/campaigns"), fetch("/api/entitlements")])
      .then(async ([campaignsResponse, entitlementResponse]) => {
        if (!campaignsResponse.ok || !entitlementResponse.ok) throw new Error("โหลด Workspace ไม่สำเร็จ");
        return Promise.all([campaignsResponse.json(), entitlementResponse.json()]);
      })
      .then(([campaignsData, entitlementData]) => {
        if (active) {
          setRecentCampaigns(campaignsData.campaigns ?? []);
          const nextEntitlement = entitlementData.entitlement as WorkspaceEntitlement;
          setEntitlement(nextEntitlement);
          const allowedChannels = channelsForConnectors(nextEntitlement.connectorIds);
          setChannels((current) => current.filter((channel) => allowedChannels.includes(channel)));
        }
      })
      .catch(() => {
        if (active) setError("ยังโหลดประวัติแคมเปญไม่ได้ กรุณาลองใหม่อีกครั้ง");
      });
    return () => { active = false; };
  }, []);

  function toggleChannel(channel: string) {
    setGenerated(false);
    setChannels((current) => current.includes(channel)
      ? current.filter((item) => item !== channel)
      : [...current, channel]);
  }

  async function generateContent() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief, language, tone, channels }),
      });
      if (!response.ok) throw new Error("บันทึกแคมเปญไม่สำเร็จ");
      const data = await response.json();
      const campaign = data.campaign as CampaignSummary;
      setPosts(campaign.posts);
      setGenerated(true);
      setRecentCampaigns((current) => [campaign, ...current.filter((item) => item.id !== campaign.id)].slice(0, 8));
    } catch {
      setError("สร้างและบันทึกคอนเทนต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  function loadCampaign(campaign: CampaignSummary) {
    setBrief(campaign.brief);
    setLanguage(campaign.language);
    setTone(campaign.tone);
    setChannels(campaign.channels);
    setPosts(campaign.posts);
    setGenerated(true);
    setError("");
  }

  async function schedulePost(post: StudioPost) {
    setError("");
    const scheduledAt = tomorrowIso();
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledAt }),
      });
      if (!response.ok) throw new Error("ตั้งเวลาไม่สำเร็จ");
      const data = await response.json();
      setPosts((current) => current.map((item) => item.id === post.id ? data.post : item));
      setRecentCampaigns((current) => current.map((campaign) => ({
        ...campaign,
        posts: campaign.posts.map((item) => item.id === post.id ? data.post : item),
      })));
      const queueResponse = await fetch("/api/publish-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, channel: post.channel, scheduledAt }),
      });
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        if (queueData.job?.status === "blocked_auth") {
          setError("บันทึกเวลาแล้ว แต่ยังรอเชื่อมบัญชีจริงใน Connection Center ก่อนส่งเผยแพร่");
        }
      } else {
        setError("บันทึกเวลาแล้ว แต่ยังเพิ่มงานเข้าคิวเผยแพร่ไม่ได้ กรุณาลองจาก Connection Center");
      }
    } catch {
      setError("ตั้งเวลาโพสต์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }
  }

  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const availableChannels = allChannelOptions.filter((channel) => channelsForConnectors(entitlement.connectorIds).includes(channel));
  const canCreate = entitlement.moduleIds.includes("content-studio");
  const canLocalize = entitlement.moduleIds.includes("language-engine");
  const canPublish = entitlement.moduleIds.includes("smart-publisher");

  return (
    <main className="studio-app">
      <aside className="studio-sidebar">
        <a className="brand studio-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></a>
        <nav>
          <a className="active" href="#campaign"><span>✦</span> Campaign Studio</a>
          <a href="#content"><span>▦</span> Content Library</a>
          <a href="#calendar"><span>□</span> Calendar</a>
          <a href="#analytics"><span>↗</span> Analytics</a>
          <a href="#language"><span>文</span> Language Engine</a>
        </nav>
        <div className="workspace-card"><span>NW</span><div><strong>Nirva Workspace</strong><small>3 collaborators</small></div><b>⌄</b></div>
        <a className="back-site" href="/connections">◎ Connection Center</a>
        <a className="back-site" href="/solutions">∞ Product Fabric</a>
        <a className="back-site" href="/">← กลับเว็บไซต์</a>
      </aside>

      <section className="studio-main" id="campaign">
        <header className="studio-header">
          <div><span className="studio-breadcrumb">WORKSPACE / CAMPAIGNS</span><h1>Campaign Studio</h1><p>เปลี่ยนหนึ่งไอเดียให้พร้อมใช้ในทุกช่องทาง</p></div>
          <div className="header-actions"><button aria-label="การแจ้งเตือน">○</button><span className="avatar">JD</span></div>
        </header>
        <div className="entitlement-strip"><span><i /> {entitlement.status === "active" ? "ACTIVE PRODUCT FABRIC" : "ENTERPRISE TRIAL"}</span><strong>{entitlement.bundleId ?? "Custom Fabric"}</strong><small>{entitlement.moduleIds.length} modules · {entitlement.connectorIds.length} connector families</small><a href="/solutions">จัดการสิทธิ์ →</a></div>

        <div className="studio-layout">
          <section className="brief-panel">
            <div className="panel-heading"><div><span className="step-pill">01</span><h2>Campaign brief</h2></div><span className="autosave"><i /> {saving ? "กำลังบันทึก" : generated ? "บันทึกแล้ว" : "พร้อมบันทึก"}</span></div>

            <label className="field-label" htmlFor="brief">เป้าหมายแคมเปญ</label>
            <textarea id="brief" value={brief} onChange={(event) => { setBrief(event.target.value); setGenerated(false); }} />

            <div className="field-row">
              <div><label className="field-label" htmlFor="language">ภาษาหลัก {!canLocalize && "· ต้องมี Language Engine"}</label><select disabled={!canLocalize} id="language" value={language} onChange={(event) => { setLanguage(event.target.value); setGenerated(false); }}>{Object.entries(languageNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label className="field-label" htmlFor="tone">น้ำเสียง</label><select id="tone" value={tone} onChange={(event) => { setTone(event.target.value); setGenerated(false); }}><option>อบอุ่นและมั่นใจ</option><option>มืออาชีพและกระชับ</option><option>สนุกและเป็นกันเอง</option><option>น่าเชื่อถือและจริงจัง</option></select></div>
            </div>

            <span className="field-label">ช่องทาง</span>
            <div className="channel-picker">
              {availableChannels.map((channel) => <button type="button" key={channel} onClick={() => toggleChannel(channel)} className={channels.includes(channel) ? "selected" : ""}><i>{channels.includes(channel) ? "✓" : "+"}</i>{channel}</button>)}
            </div>
            {availableChannels.length === 0 && <p className="studio-error">แพ็กเกจนี้ยังไม่มี Connector Family กรุณาเพิ่มช่องทางใน Product Fabric</p>}

            <div className="brief-insight"><span>✦</span><div><strong>AI understands your brief</strong><p>{brief.length > 80 ? "ข้อมูลพร้อมสำหรับสร้างหลายรูปแบบ" : "เพิ่มรายละเอียดผู้ชมและข้อเสนอเพื่อผลลัพธ์ที่แม่นยำขึ้น"}</p></div><b>{Math.min(98, 62 + Math.floor(brief.length / 4))}%</b></div>
            {error && <p className="studio-error" role="alert">{error}</p>}
            <button className="generate-button" disabled={!canCreate || saving || !brief.trim() || channels.length === 0} onClick={generateContent}><span>✦</span> {!canCreate ? "ต้องมี AI Content Studio" : saving ? "กำลังสร้างและบันทึก..." : `สร้างคอนเทนต์ ${channels.length} ช่องทาง`} <b>→</b></button>

            {recentCampaigns.length > 0 && (
              <div className="recent-campaigns" id="calendar">
                <div className="recent-campaign-heading"><strong>งานล่าสุด</strong><span>{recentCampaigns.length} แคมเปญ</span></div>
                <div className="recent-campaign-list">
                  {recentCampaigns.slice(0, 4).map((campaign) => (
                    <button type="button" key={campaign.id} onClick={() => loadCampaign(campaign)}>
                      <span>{campaign.brief}</span><small>{campaign.posts.length} ร่าง · {formatDate(campaign.createdAt)}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="output-panel" id="content">
            <div className="panel-heading"><div><span className="step-pill">02</span><h2>Generated content</h2></div>{generated && <span className="result-count">{posts.length} drafts</span>}</div>

            {!generated ? (
              <div className="empty-output"><div className="ai-orb">✦</div><h3>พร้อมเปลี่ยน Brief เป็นคอนเทนต์</h3><p>เลือกช่องทางและกดสร้าง แล้ว AI จะปรับรูปแบบ ความยาว และน้ำเสียงให้แต่ละแพลตฟอร์ม</p><div><span>Brand-safe</span><span>Localized</span><span>Channel-ready</span></div></div>
            ) : (
              <div className="post-list">
                {posts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className={`post-art ${artColors[post.channel] ?? "dark"}`}><span>N</span><small>{post.format}</small></div>
                    <div className="post-content"><div className="post-meta"><strong>{post.channel}</strong><span>{post.format}</span></div><h3>{post.title}</h3><p>{post.body}</p><div className="post-footer"><span>◷ {post.scheduledAt ? formatDate(post.scheduledAt) : "ยังไม่ตั้งเวลา"}</span><button className={post.status === "scheduled" ? "scheduled" : ""} disabled={post.status === "scheduled" || !canPublish} onClick={() => schedulePost(post)}>{post.status === "scheduled" ? "✓ ตั้งเวลาแล้ว" : canPublish ? "ตั้งเวลาโพสต์" : "ต้องมี Publisher"}</button></div></div>
                  </article>
                ))}
                {posts.length === 0 && <div className="empty-output compact"><h3>ยังไม่มีร่างคอนเทนต์</h3><p>เลือกช่องทางอย่างน้อยหนึ่งช่องทาง แล้วสร้างแคมเปญใหม่</p></div>}
              </div>
            )}
          </section>
        </div>

        <footer className="studio-status"><span><i /> Nirva AI connected</span><span>Language: {languageNames[language]}</span><span>{scheduledCount} scheduled</span></footer>
      </section>
    </main>
  );
}
