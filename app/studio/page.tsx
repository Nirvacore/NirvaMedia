"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- vinext client runtime currently duplicates React through next/link */

import { useEffect, useState } from "react";
import { channelsForConnectors } from "../../lib/product-catalog";
import { getNirvaLanguage, NIRVA_LANGUAGE_COUNT, NIRVA_LANGUAGES } from "../../lib/nle/languages";

import { canonicalForRegeneration, type StudioCanonical } from "../../lib/mahasunyata/studio";

const allChannelOptions = [
  "Instagram", "Facebook", "WhatsApp Business", "Threads", "YouTube", "TikTok", "LINE OA", "X",
  "LinkedIn", "Telegram", "Pinterest", "Snapchat", "WeChat", "Douyin", "Weibo", "Xiaohongshu",
  "KakaoTalk", "Naver Blog",
];

type StudioPost = {
  canonical?: StudioCanonical | null;
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

type LanguageCapabilities = {
  registry: string;
  curatedStudioCopy: string;
  rtlLayout: string;
  providerTranslation: string;
  translationMemory: string;
};

type TranslationSource = "memory" | "provider" | "unavailable";

type TranslationResult = {
  text: string;
  source: TranslationSource;
  message: string;
  memorySource?: "manual" | "provider";
};

const defaultLanguageCapabilities: LanguageCapabilities = {
  registry: "active",
  curatedStudioCopy: "active",
  rtlLayout: "active",
  providerTranslation: "integration_required",
  translationMemory: "integration_required",
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
  const [languageCapabilities, setLanguageCapabilities] = useState(defaultLanguageCapabilities);
  const [sourceText, setSourceText] = useState("หนึ่งไอเดีย ไปได้ทุกตลาด");
  const [sourceLanguage, setSourceLanguage] = useState("th");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [manualTranslation, setManualTranslation] = useState("");
  const [savingMemory, setSavingMemory] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/campaigns"), fetch("/api/entitlements"), fetch("/api/languages")])
      .then(async ([campaignsResponse, entitlementResponse, languagesResponse]) => {
        if (!campaignsResponse.ok || !entitlementResponse.ok) throw new Error("โหลด Workspace ไม่สำเร็จ");
        return Promise.all([
          campaignsResponse.json(),
          entitlementResponse.json(),
          languagesResponse.ok ? languagesResponse.json() : Promise.resolve(null),
        ]);
      })
      .then(([campaignsData, entitlementData, languagesData]) => {
        if (active) {
          setRecentCampaigns(campaignsData.campaigns ?? []);
          const nextEntitlement = entitlementData.entitlement as WorkspaceEntitlement;
          setEntitlement(nextEntitlement);
          const allowedChannels = channelsForConnectors(nextEntitlement.connectorIds);
          setChannels((current) => current.filter((channel) => allowedChannels.includes(channel)));
          if (languagesData?.capabilities) setLanguageCapabilities(languagesData.capabilities);
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
        body: JSON.stringify({ brief, language, tone, channels, canonical: canonicalForRegeneration(posts) }),
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

  async function transitionPost(post: StudioPost, status: "review" | "approved" | "draft") {
    setError("");
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "เปลี่ยนสถานะไม่สำเร็จ");
      setPosts((current) => current.map((item) => item.id === post.id ? data.post : item));
      setRecentCampaigns((current) => current.map((campaign) => ({
        ...campaign,
        posts: campaign.posts.map((item) => item.id === post.id ? data.post : item),
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เปลี่ยนสถานะไม่สำเร็จ");
    }
  }

  async function translateFreeText() {
    setTranslationResult(null);
    if (!sourceText.trim()) {
      setTranslationResult({ text: "", source: "unavailable", message: "กรุณาใส่ข้อความต้นฉบับก่อนแปล" });
      return;
    }
    if (sourceLanguage === targetLanguage) {
      setTranslationResult({ text: "", source: "unavailable", message: "กรุณาเลือกภาษาปลายทางที่ต่างจากภาษาต้นฉบับ" });
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: sourceText.trim(), sourceLanguage, targetLanguage }),
      });
      const data = await response.json().catch(() => ({}));
      const result = data.translation ?? data.result ?? data;
      const source = ["memory", "provider", "unavailable"].includes(result.source)
        ? result.source as TranslationSource
        : "unavailable";
      const text = result.text ?? result.targetText ?? data.translatedText ?? "";
      const message = result.message ?? data.message ?? data.error ?? (source === "unavailable"
        ? "ยังไม่พบคำแปลใน Memory และ Provider ยังไม่พร้อมใช้งาน"
        : "แปลข้อความเรียบร้อย");

      if (!response.ok || !text) {
        setTranslationResult({ text: "", source: "unavailable", message });
      } else {
        setTranslationResult({ text, source, message, memorySource: result.memorySource });
      }
    } catch {
      setTranslationResult({ text: "", source: "unavailable", message: "ยังติดต่อระบบแปลไม่ได้ กรุณาลองใหม่ภายหลัง" });
    } finally {
      setTranslating(false);
    }
  }

  async function saveManualTranslation() {
    if (!manualTranslation.trim()) return;
    setSavingMemory(true);
    try {
      const response = await fetch("/api/translations/remember", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: sourceText.trim(),
          sourceLanguage,
          targetLanguage,
          translatedText: manualTranslation.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      const result = data.translation ?? data.memory ?? data;
      if (!response.ok) throw new Error(data.error?.message ?? data.error ?? data.message ?? "บันทึก Memory ไม่สำเร็จ");
      setTranslationResult({
        text: result.text ?? result.translatedText ?? manualTranslation.trim(),
        source: "memory",
        memorySource: "manual",
        message: result.message ?? "บันทึกคำแปลที่ตรวจแล้วเข้า Translation Memory เรียบร้อย",
      });
      setManualTranslation("");
    } catch (cause) {
      setTranslationResult({
        text: "",
        source: "unavailable",
        message: cause instanceof Error ? cause.message : "บันทึก Translation Memory ไม่สำเร็จ",
      });
    } finally {
      setSavingMemory(false);
    }
  }

  function swapTranslationLanguages() {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);
    if (translationResult?.text) setSourceText(translationResult.text);
    setTranslationResult(null);
    setManualTranslation("");
  }

  const scheduledCount = posts.filter((post) => post.status === "scheduled").length;
  const availableChannels = allChannelOptions.filter((channel) => channelsForConnectors(entitlement.connectorIds).includes(channel));
  const canCreate = entitlement.moduleIds.includes("content-studio");
  const canLocalize = entitlement.moduleIds.includes("language-engine");
  const canPublish = entitlement.moduleIds.includes("smart-publisher");
  const selectedLanguage = getNirvaLanguage(language) ?? NIRVA_LANGUAGES[0];
  const selectedSourceLanguage = getNirvaLanguage(sourceLanguage) ?? NIRVA_LANGUAGES[0];
  const selectedTargetLanguage = getNirvaLanguage(targetLanguage) ?? NIRVA_LANGUAGES[1];

  return (
    <main className="studio-app">
      <aside className="studio-sidebar">
        <a className="brand studio-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></a>
        <nav>
          <a className="active" href="#campaign"><span>✦</span> Campaign Studio</a>
          <a href="#content"><span>▦</span> Content Library</a>
          <a href="#calendar"><span>□</span> Calendar</a>
          <a href="#analytics"><span>↗</span> Analytics</a>
          <a href="#translation"><span>文</span> Language Engine</a>
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
              <div><label className="field-label" htmlFor="language">ภาษาหลัก · NLE {NIRVA_LANGUAGE_COUNT} ภาษา {!canLocalize && "· ต้องมี Language Engine"}</label><select disabled={!canLocalize} dir={selectedLanguage.rtl ? "rtl" : "ltr"} id="language" value={language} onChange={(event) => { setLanguage(event.target.value); setGenerated(false); }}>{NIRVA_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.nativeName} · {item.name}{item.rtl ? " · RTL" : ""}</option>)}</select></div>
              <div><label className="field-label" htmlFor="tone">น้ำเสียง</label><select id="tone" value={tone} onChange={(event) => { setTone(event.target.value); setGenerated(false); }}><option>อบอุ่นและมั่นใจ</option><option>มืออาชีพและกระชับ</option><option>สนุกและเป็นกันเอง</option><option>น่าเชื่อถือและจริงจัง</option></select></div>
            </div>

            <section className="language-readiness" aria-labelledby="language-readiness-title">
              <div className="language-readiness-heading">
                <div><span>文</span><div><small>LANGUAGE ENGINE STATUS</small><strong id="language-readiness-title">21 ภาษาพร้อมใช้สร้างร่างใน Studio</strong></div></div>
                <b>{selectedLanguage.nativeName} · {selectedLanguage.script}{selectedLanguage.rtl ? " · RTL" : ""}</b>
              </div>
              <div className="language-capability-row">
                <span className={languageCapabilities.registry === "active" ? "ready" : "waiting"}><i /> Language registry</span>
                <span className={languageCapabilities.curatedStudioCopy === "active" ? "ready" : "waiting"}><i /> Curated draft copy</span>
                <span className={languageCapabilities.rtlLayout === "active" ? "ready" : "waiting"}><i /> Arabic &amp; Hebrew RTL</span>
                <span className={languageCapabilities.providerTranslation === "active" ? "ready" : "waiting"}><i /> Provider Translation · {languageCapabilities.providerTranslation === "active" ? "พร้อมใช้" : "รอเชื่อม"}</span>
                <span className={languageCapabilities.translationMemory === "active" ? "ready" : "waiting"}><i /> Translation Memory · {languageCapabilities.translationMemory === "active" ? "พร้อมใช้" : "รอเชื่อม"}</span>
              </div>
              <div className="language-list" aria-label="ภาษาที่รองรับทั้ง 21 ภาษา">
                {NIRVA_LANGUAGES.map((item) => <span className={item.code === language ? "selected" : ""} dir={item.rtl ? "rtl" : "ltr"} key={item.code}>{item.nativeName}<small>{item.code.toUpperCase()}{item.rtl ? " · RTL" : ""}</small></span>)}
              </div>
              <p><strong>พร้อมใช้ตอนนี้:</strong> ร่างข้อความ 21 ภาษา, RTL และ Translation Memory ที่บันทึกคำแปลซึ่งผ่านการตรวจแล้ว · <strong>ยังรอเชื่อม:</strong> การแปลอัตโนมัติผ่าน Provider ต้องมี Credential ก่อนจึงจะนับเป็น Provider-ready</p>
            </section>

            <span className="field-label">ช่องทาง</span>
            <div className="channel-picker">
              {availableChannels.map((channel) => <button type="button" key={channel} onClick={() => toggleChannel(channel)} className={channels.includes(channel) ? "selected" : ""}><i>{channels.includes(channel) ? "✓" : "+"}</i>{channel}</button>)}
            </div>
            {availableChannels.length === 0 && <p className="studio-error">แพ็กเกจนี้ยังไม่มี Connector Family กรุณาเพิ่มช่องทางใน Product Fabric</p>}

            <div className="brief-insight"><span>✦</span><div><strong>Brief readiness</strong><p>{brief.length > 80 ? "ข้อมูลพร้อมสำหรับสร้างร่างหลายรูปแบบ" : "เพิ่มรายละเอียดผู้ชมและข้อเสนอเพื่อให้ Brief ชัดเจนขึ้น"}</p></div><b>{Math.min(98, 62 + Math.floor(brief.length / 4))}%</b></div>
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
              <div className="empty-output"><div className="ai-orb">✦</div><h3>พร้อมเปลี่ยน Brief เป็นคอนเทนต์</h3><p>เลือกภาษาและช่องทางเพื่อสร้างร่างที่ใช้ภาษาเป้าหมาย พร้อมรูปแบบสำหรับแต่ละแพลตฟอร์ม</p><div><span>21 languages</span><span>RTL-ready</span><span>Channel format</span></div></div>
            ) : (
              <div className="post-list">
                {posts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className={`post-art ${artColors[post.channel] ?? "dark"}`}><span>N</span><small>{post.format}</small></div>
                    <div className="post-content" lang={selectedLanguage.code} dir={selectedLanguage.rtl ? "rtl" : "ltr"}>
                      <div className="post-meta"><strong>{post.channel}</strong><span>{post.format}</span><b>{post.status}</b></div>
                      <h3>{post.title}</h3><p>{post.body}</p>
                      <div className="post-footer">
                        <span>◷ {post.scheduledAt ? formatDate(post.scheduledAt) : "ยังไม่ตั้งเวลา"}</span>
                        {post.status === "draft" && <button onClick={() => transitionPost(post, "review")}>ส่งตรวจ</button>}
                        {post.canonical && <p role="note">รอตรวจความหมายโดยผู้รับผิดชอบ / Pending trusted semantic review — {post.canonical.concept_id} v{post.canonical.source_concept_version}</p>}
                        {post.status === "review" && <button disabled={!!post.canonical} onClick={() => transitionPost(post, "approved")}>อนุมัติ</button>}
                        {post.status === "approved" && <button disabled={!canPublish || !!post.canonical} onClick={() => schedulePost(post)}>{canPublish ? "ตั้งเวลาโพสต์" : "ต้องมี Publisher"}</button>}
                        {post.status === "scheduled" && <button className="scheduled" disabled>✓ ตั้งเวลาแล้ว</button>}
                      </div>
                    </div>
                  </article>
                ))}
                {posts.length === 0 && <div className="empty-output compact"><h3>ยังไม่มีร่างคอนเทนต์</h3><p>เลือกช่องทางอย่างน้อยหนึ่งช่องทาง แล้วสร้างแคมเปญใหม่</p></div>}
              </div>
            )}
          </section>
        </div>

        <section className="translation-workbench" id="translation">
          <div className="translation-heading">
            <div><span className="step-pill">03</span><div><small>LANGUAGE ENGINE · MEMORY FIRST</small><h2>แปลข้อความอิสระ</h2><p>ตรวจ Translation Memory ก่อน และเรียก Provider เฉพาะเมื่อระบบยืนยันว่ามี Credential พร้อมใช้งาน</p></div></div>
            <div className="translation-truth"><i /> Provider status: <strong>{languageCapabilities.providerTranslation === "active" ? "พร้อมใช้" : "ยังรอเชื่อม"}</strong></div>
          </div>

          <div className="translation-grid">
            <div className="translation-pane">
              <div className="translation-pane-top">
                <label htmlFor="source-language">ภาษาต้นฉบับ</label>
                <select id="source-language" value={sourceLanguage} onChange={(event) => { setSourceLanguage(event.target.value); setTranslationResult(null); setManualTranslation(""); }}>
                  {NIRVA_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.nativeName} · {item.name}</option>)}
                </select>
              </div>
              <textarea
                id="translation-source"
                aria-label="ข้อความต้นฉบับสำหรับแปล"
                lang={selectedSourceLanguage.code}
                dir={selectedSourceLanguage.rtl ? "rtl" : "ltr"}
                value={sourceText}
                onChange={(event) => { setSourceText(event.target.value); setTranslationResult(null); setManualTranslation(""); }}
                placeholder="พิมพ์หรือวางข้อความที่ต้องการแปล"
              />
              <small>{sourceText.length} ตัวอักษร · {selectedSourceLanguage.script}{selectedSourceLanguage.rtl ? " · RTL" : ""}</small>
            </div>

            <button className="translation-swap" type="button" aria-label="สลับภาษาต้นฉบับและปลายทาง" onClick={swapTranslationLanguages}>⇄</button>

            <div className="translation-pane result-pane">
              <div className="translation-pane-top">
                <label htmlFor="target-language">ภาษาปลายทาง</label>
                <select id="target-language" value={targetLanguage} onChange={(event) => { setTargetLanguage(event.target.value); setTranslationResult(null); setManualTranslation(""); }}>
                  {NIRVA_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.nativeName} · {item.name}</option>)}
                </select>
              </div>
              <div className={`translation-output ${translationResult?.source ?? "idle"}`} lang={selectedTargetLanguage.code} dir={selectedTargetLanguage.rtl ? "rtl" : "ltr"} aria-live="polite">
                {translating ? <span className="translation-loading">กำลังตรวจ Memory และความพร้อมของ Provider…</span> : translationResult?.text ? <p>{translationResult.text}</p> : <span>{translationResult?.message ?? "คำแปลจะแสดงที่นี่ พร้อมระบุแหล่งที่มาอย่างชัดเจน"}</span>}
              </div>
              <div className="translation-source-state">
                {translationResult ? <span className={translationResult.source}><i /> Source: {translationResult.source}{translationResult.memorySource ? `/${translationResult.memorySource}` : ""}</span> : <span><i /> ยังไม่มีผลลัพธ์</span>}
                {translationResult?.message && translationResult.text && <small>{translationResult.message}</small>}
              </div>
            </div>
          </div>

          {translationResult?.source === "unavailable" && (
            <div className="manual-memory-panel">
              <div className="manual-memory-intro"><span>✓</span><div><small>HUMAN-VERIFIED FALLBACK</small><h3>เพิ่มคำแปลที่ตรวจแล้วเข้า Memory</h3><p>เมื่อยังไม่มี Provider ผู้ตรวจภาษาสามารถบันทึกคำแปลที่อนุมัติแล้ว เพื่อให้ข้อความเดียวกันถูกนำกลับมาใช้เป็น <strong>memory/manual</strong> ในครั้งต่อไป</p></div></div>
              <div className="manual-memory-editor">
                <label htmlFor="manual-translation">คำแปลที่ตรวจแล้ว · {selectedTargetLanguage.nativeName}</label>
                <textarea
                  id="manual-translation"
                  lang={selectedTargetLanguage.code}
                  dir={selectedTargetLanguage.rtl ? "rtl" : "ltr"}
                  value={manualTranslation}
                  onChange={(event) => setManualTranslation(event.target.value)}
                  placeholder="ใส่คำแปลที่ผู้ตรวจภาษาอนุมัติแล้ว"
                />
                <div><small>ระบบจะบันทึกเฉพาะข้อความที่ผู้ใช้กรอก ไม่สร้างคำแปลแทน</small><button type="button" disabled={savingMemory || !manualTranslation.trim()} onClick={saveManualTranslation}>{savingMemory ? "กำลังบันทึก…" : "บันทึก Translation Memory"}<b>＋</b></button></div>
              </div>
            </div>
          )}

          <div className="translation-actions">
            <div>
              <span className={languageCapabilities.translationMemory === "active" ? "active" : "pending"}><i /> Translation Memory {languageCapabilities.translationMemory === "active" ? "พร้อมค้นหา" : "รอเปิดใช้"}</span>
              <span className={languageCapabilities.providerTranslation === "active" ? "active" : "pending"}><i /> Provider {languageCapabilities.providerTranslation === "active" ? "Credential พร้อม" : "ไม่มี Credential"}</span>
            </div>
            <button type="button" disabled={!canLocalize || translating || !sourceText.trim()} onClick={translateFreeText}>{!canLocalize ? "ต้องมี Language Engine" : translating ? "กำลังแปล…" : "ตรวจ Memory และแปล"}<b>→</b></button>
          </div>

          <p className="translation-disclaimer"><strong>ความจริงของระบบ:</strong> Source = <b>memory</b> หมายถึงใช้คำแปลที่บันทึกไว้, <b>provider</b> หมายถึง API ยืนยันการแปลจาก Provider ที่มี Credential, และ <b>unavailable</b> หมายถึงยังไม่มีคำแปล—ระบบจะไม่สร้างคำตอบจำลองขึ้นมาแทน</p>
        </section>

        <footer className="studio-status"><span><i /> Nirva NLE registry connected · Claude NMD rules active</span><a href="/continuity">Source continuity</a><span>Language: {selectedLanguage.nativeName} · {selectedLanguage.name}{selectedLanguage.rtl ? " · RTL" : ""}</span><span>{scheduledCount} scheduled</span></footer>
      </section>
    </main>
  );
}
