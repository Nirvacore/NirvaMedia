"use client";

import { useMemo, useState } from "react";

const channelOptions = ["Instagram", "Facebook", "LINE OA", "TikTok", "LinkedIn", "YouTube"];

const languageNames: Record<string, string> = {
  th: "ไทย",
  en: "English",
  ja: "日本語",
  zh: "中文",
};

export default function StudioPage() {
  const [channels, setChannels] = useState(["Instagram", "Facebook", "LINE OA"]);
  const [language, setLanguage] = useState("th");
  const [tone, setTone] = useState("อบอุ่นและมั่นใจ");
  const [brief, setBrief] = useState("เปิดตัว Nirva Media ให้ทีมการตลาดไทยเห็นว่าหนึ่งไอเดียสามารถไปได้ทุกช่องทาง");
  const [generated, setGenerated] = useState(false);
  const [scheduled, setScheduled] = useState<string[]>([]);

  const posts = useMemo(() => [
    {
      channel: "Instagram",
      format: "Carousel · 4:5",
      title: "หนึ่งไอเดีย ไปได้ทุกที่",
      body: `เปลี่ยนไอเดียเดียวให้เป็นคอนเทนต์ครบทุกช่องทาง ด้วยน้ำเสียงแบบ${tone} และพร้อมใช้งานในภาษา${languageNames[language]}`,
      time: "วันนี้ 18:30",
      color: "mint",
    },
    {
      channel: "Facebook",
      format: "Feed post · 1:1",
      title: "ทีมของคุณไม่ควรเริ่มใหม่ทุกแพลตฟอร์ม",
      body: "Nirva Media ช่วยสร้าง ปรับภาษา ตั้งเวลา และเรียนรู้จากผลลัพธ์ทั้งหมดในพื้นที่เดียว",
      time: "พรุ่งนี้ 09:00",
      color: "blue",
    },
    {
      channel: "LINE OA",
      format: "Broadcast · Card",
      title: "พบกับ Content OS สำหรับทีมไทย",
      body: "สร้างครั้งเดียว ปรับให้เข้ากับผู้ชมแต่ละกลุ่ม และส่งต่อได้ทั่วโลก",
      time: "พรุ่งนี้ 12:00",
      color: "dark",
    },
  ].filter((post) => channels.includes(post.channel)), [channels, language, tone]);

  function toggleChannel(channel: string) {
    setGenerated(false);
    setChannels((current) => current.includes(channel)
      ? current.filter((item) => item !== channel)
      : [...current, channel]);
  }

  function schedulePost(channel: string) {
    setScheduled((current) => current.includes(channel) ? current : [...current, channel]);
  }

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
        <a className="back-site" href="/">← กลับเว็บไซต์</a>
      </aside>

      <section className="studio-main" id="campaign">
        <header className="studio-header">
          <div><span className="studio-breadcrumb">WORKSPACE / CAMPAIGNS</span><h1>Campaign Studio</h1><p>เปลี่ยนหนึ่งไอเดียให้พร้อมใช้ในทุกช่องทาง</p></div>
          <div className="header-actions"><button aria-label="การแจ้งเตือน">○</button><span className="avatar">JD</span></div>
        </header>

        <div className="studio-layout">
          <section className="brief-panel">
            <div className="panel-heading"><div><span className="step-pill">01</span><h2>Campaign brief</h2></div><span className="autosave"><i /> บันทึกแล้ว</span></div>

            <label className="field-label" htmlFor="brief">เป้าหมายแคมเปญ</label>
            <textarea id="brief" value={brief} onChange={(event) => { setBrief(event.target.value); setGenerated(false); }} />

            <div className="field-row">
              <div><label className="field-label" htmlFor="language">ภาษาหลัก</label><select id="language" value={language} onChange={(event) => { setLanguage(event.target.value); setGenerated(false); }}>{Object.entries(languageNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div><label className="field-label" htmlFor="tone">น้ำเสียง</label><select id="tone" value={tone} onChange={(event) => { setTone(event.target.value); setGenerated(false); }}><option>อบอุ่นและมั่นใจ</option><option>มืออาชีพและกระชับ</option><option>สนุกและเป็นกันเอง</option><option>น่าเชื่อถือและจริงจัง</option></select></div>
            </div>

            <span className="field-label">ช่องทาง</span>
            <div className="channel-picker">
              {channelOptions.map((channel) => <button key={channel} onClick={() => toggleChannel(channel)} className={channels.includes(channel) ? "selected" : ""}><i>{channels.includes(channel) ? "✓" : "+"}</i>{channel}</button>)}
            </div>

            <div className="brief-insight"><span>✦</span><div><strong>AI understands your brief</strong><p>{brief.length > 80 ? "ข้อมูลพร้อมสำหรับสร้างหลายรูปแบบ" : "เพิ่มรายละเอียดผู้ชมและข้อเสนอเพื่อผลลัพธ์ที่แม่นยำขึ้น"}</p></div><b>{Math.min(98, 62 + Math.floor(brief.length / 4))}%</b></div>
            <button className="generate-button" disabled={!brief.trim() || channels.length === 0} onClick={() => setGenerated(true)}><span>✦</span> สร้างคอนเทนต์ {channels.length} ช่องทาง <b>→</b></button>
          </section>

          <section className="output-panel" id="content">
            <div className="panel-heading"><div><span className="step-pill">02</span><h2>Generated content</h2></div>{generated && <span className="result-count">{posts.length} drafts</span>}</div>

            {!generated ? (
              <div className="empty-output"><div className="ai-orb">✦</div><h3>พร้อมเปลี่ยน Brief เป็นคอนเทนต์</h3><p>เลือกช่องทางและกดสร้าง แล้ว AI จะปรับรูปแบบ ความยาว และน้ำเสียงให้แต่ละแพลตฟอร์ม</p><div><span>Brand-safe</span><span>Localized</span><span>Channel-ready</span></div></div>
            ) : (
              <div className="post-list">
                {posts.map((post) => (
                  <article className="post-card" key={post.channel}>
                    <div className={`post-art ${post.color}`}><span>N</span><small>{post.format}</small></div>
                    <div className="post-content"><div className="post-meta"><strong>{post.channel}</strong><span>{post.format}</span></div><h3>{post.title}</h3><p>{post.body}</p><div className="post-footer"><span>◷ {post.time}</span><button className={scheduled.includes(post.channel) ? "scheduled" : ""} onClick={() => schedulePost(post.channel)}>{scheduled.includes(post.channel) ? "✓ ตั้งเวลาแล้ว" : "ตั้งเวลาโพสต์"}</button></div></div>
                  </article>
                ))}
                {posts.length === 0 && <div className="empty-output compact"><h3>ยังไม่มีช่องทางที่รองรับในตัวอย่างนี้</h3><p>เลือก Instagram, Facebook หรือ LINE OA เพื่อสร้างร่างคอนเทนต์</p></div>}
              </div>
            )}
          </section>
        </div>

        <footer className="studio-status"><span><i /> Nirva AI connected</span><span>Language: {languageNames[language]}</span><span>{scheduled.length} scheduled</span></footer>
      </section>
    </main>
  );
}
