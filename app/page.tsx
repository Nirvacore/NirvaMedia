"use client";

import { useState } from "react";

const channels = ["Facebook", "Instagram", "WhatsApp", "LINE", "YouTube", "TikTok", "WeChat", "Douyin", "X", "LinkedIn", "Telegram", "KakaoTalk"];

const marketRegions = ["เอเชีย", "อเมริกา", "ยุโรป", "ตะวันออกกลาง", "แอฟริกา"];

const priorityMarkets = [
  { region: "เอเชีย", flag: "🇹🇭", country: "ไทย", platforms: ["LINE", "Facebook", "TikTok", "YouTube", "Instagram"] },
  { region: "เอเชีย", flag: "🇯🇵", country: "ญี่ปุ่น", platforms: ["LINE", "YouTube", "X", "Instagram", "TikTok"] },
  { region: "เอเชีย", flag: "🇨🇳", country: "จีน", platforms: ["WeChat", "Douyin", "Weibo", "Xiaohongshu", "Bilibili"] },
  { region: "เอเชีย", flag: "🇰🇷", country: "เกาหลีใต้", platforms: ["KakaoTalk", "YouTube", "Instagram", "Naver Blog", "TikTok"] },
  { region: "เอเชีย", flag: "🇮🇳", country: "อินเดีย", platforms: ["WhatsApp", "YouTube", "Instagram", "Facebook", "Telegram"] },
  { region: "เอเชีย", flag: "🇮🇩", country: "อินโดนีเซีย", platforms: ["WhatsApp", "TikTok", "YouTube", "Instagram", "Facebook"] },
  { region: "เอเชีย", flag: "🇹🇼", country: "ไต้หวัน", platforms: ["LINE", "YouTube", "Facebook", "Instagram", "TikTok"] },
  { region: "อเมริกา", flag: "🇺🇸", country: "สหรัฐฯ", platforms: ["YouTube", "Facebook", "Instagram", "TikTok", "LinkedIn"] },
  { region: "อเมริกา", flag: "🇨🇦", country: "แคนาดา", platforms: ["YouTube", "Facebook", "Instagram", "TikTok", "LinkedIn"] },
  { region: "อเมริกา", flag: "🇧🇷", country: "บราซิล", platforms: ["WhatsApp", "Instagram", "YouTube", "Facebook", "TikTok"] },
  { region: "อเมริกา", flag: "🇲🇽", country: "เม็กซิโก", platforms: ["WhatsApp", "Facebook", "YouTube", "Instagram", "TikTok"] },
  { region: "ยุโรป", flag: "🇬🇧", country: "สหราชอาณาจักร", platforms: ["YouTube", "WhatsApp", "Facebook", "Instagram", "TikTok"] },
  { region: "ยุโรป", flag: "🇩🇪", country: "เยอรมนี", platforms: ["WhatsApp", "YouTube", "Instagram", "Facebook", "TikTok"] },
  { region: "ยุโรป", flag: "🇫🇷", country: "ฝรั่งเศส", platforms: ["YouTube", "WhatsApp", "Facebook", "Instagram", "TikTok"] },
  { region: "ยุโรป", flag: "🇪🇸", country: "สเปน", platforms: ["WhatsApp", "Instagram", "YouTube", "TikTok", "Facebook"] },
  { region: "ตะวันออกกลาง", flag: "🇦🇪", country: "UAE", platforms: ["WhatsApp", "Instagram", "YouTube", "Facebook", "TikTok"] },
  { region: "ตะวันออกกลาง", flag: "🇸🇦", country: "ซาอุดีอาระเบีย", platforms: ["WhatsApp", "YouTube", "Snapchat", "Instagram", "TikTok"] },
  { region: "ตะวันออกกลาง", flag: "🇹🇷", country: "ตุรกี", platforms: ["Instagram", "WhatsApp", "YouTube", "Facebook", "TikTok"] },
  { region: "แอฟริกา", flag: "🇳🇬", country: "ไนจีเรีย", platforms: ["WhatsApp", "Facebook", "YouTube", "Instagram", "TikTok"] },
  { region: "แอฟริกา", flag: "🇿🇦", country: "แอฟริกาใต้", platforms: ["WhatsApp", "Facebook", "YouTube", "Instagram", "TikTok"] },
  { region: "แอฟริกา", flag: "🇪🇬", country: "อียิปต์", platforms: ["Facebook", "WhatsApp", "YouTube", "Instagram", "TikTok"] },
];

const connectorFamilies = [
  { name: "Meta Network", platforms: "Facebook · Instagram · WhatsApp Business · Threads", reach: "ใช้ซ้ำได้ 13 ตลาด", action: "เชื่อมก่อน", tone: "mint" },
  { name: "Google Video", platforms: "YouTube · Shorts", reach: "ใช้ได้ทุกภูมิภาค", action: "เชื่อมก่อน", tone: "blue" },
  { name: "ByteDance Global", platforms: "TikTok", reach: "ใช้ซ้ำได้ 17 ตลาด", action: "เชื่อมก่อน", tone: "pink" },
  { name: "LINE Ecosystem", platforms: "LINE OA · Messaging · Broadcast", reach: "ไทย · ญี่ปุ่น · ไต้หวัน", action: "เชื่อมภูมิภาค", tone: "green" },
  { name: "China Stack", platforms: "WeChat · Douyin · Weibo · Xiaohongshu", reach: "ต้องแยกบัญชีในจีน", action: "ชุดเฉพาะจีน", tone: "red" },
  { name: "Regional Plus", platforms: "Kakao · Naver · Telegram · Snapchat · X · LinkedIn", reach: "เติมช่องว่างรายตลาด", action: "เชื่อมตามลำดับ", tone: "dark" },
];

const features = [
  { icon: "✦", title: "AI Content Studio", text: "เปลี่ยนไอเดียเดียวให้เป็นข้อความ ภาพ วิดีโอ เสียง และซับไตเติลที่พร้อมใช้" },
  { icon: "◎", title: "Smart Publisher", text: "ปรับรูปแบบ ตั้งเวลา และเผยแพร่คอนเทนต์ไปทุกช่องทางจากพื้นที่เดียว" },
  { icon: "文", title: "Language Engine", text: "แปลและปรับบริบท น้ำเสียง วัฒนธรรม และรูปแบบการสื่อสารมากกว่า 100 ภาษา" },
  { icon: "↗", title: "Performance Intelligence", text: "ดูผลลัพธ์แบบรวม วิเคราะห์สิ่งที่ได้ผล และส่งข้อมูลกลับไปให้ AI พัฒนารอบต่อไป" },
  { icon: "⌘", title: "Workflow Automation", text: "สร้างแคมเปญ ปฏิทินคอนเทนต์ และขั้นตอนอนุมัติที่ทำงานต่อเนื่องอัตโนมัติ" },
  { icon: "◫", title: "One Asset Library", text: "รวมแบรนด์ ไฟล์ ต้นฉบับ และเวอร์ชันทั้งหมดให้ทีมค้นหาและนำกลับมาใช้ได้ง่าย" },
];

const flow = [
  ["01", "รับไอเดีย", "Idea + Knowledge"],
  ["02", "สร้างด้วย AI", "Text · Image · Video"],
  ["03", "ปรับให้เข้ากับช่องทาง", "Format + Language"],
  ["04", "เผยแพร่และเรียนรู้", "Publish + Analytics"],
];

export default function Home() {
  const [activeChannel, setActiveChannel] = useState("Instagram");
  const [activeRegion, setActiveRegion] = useState("เอเชีย");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main>
      <header className="nav-shell">
        <a className="brand" href="#top" aria-label="Nirva Media home">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>Nirva<span>Media</span></span>
        </a>

        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="เปิดเมนู" aria-expanded={menuOpen}>☰</button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"} aria-label="เมนูหลัก">
          <a href="#product">ผลิตภัณฑ์</a>
          <a href="/solutions">แพ็กเกจ</a>
          <a href="/connections">การเชื่อมต่อ</a>
          <a href="#global">ตลาดทั่วโลก</a>
          <a href="#workflow">วิธีทำงาน</a>
          <a href="#language">ภาษา</a>
          <a href="#contact">สำหรับองค์กร</a>
        </nav>
        <a className="nav-cta" href="/studio">เปิด Studio <span>↗</span></a>
      </header>

      <section className="hero" id="top">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <div className="hero-copy">
          <div className="eyebrow"><span /> AI Content Operating System</div>
          <h1>หนึ่งไอเดีย<br /><em>ไปได้ทุกที่</em></h1>
          <p className="hero-lead">สร้าง ปรับภาษา เผยแพร่ และวิเคราะห์คอนเทนต์ทุกช่องทางด้วย AI บนพื้นที่ทำงานเดียว</p>
          <div className="hero-actions">
            <a className="button primary" href="/studio">เปิด Campaign Studio <span>→</span></a>
            <a className="button ghost" href="#workflow"><span className="play">▶</span> ดูวิธีทำงาน</a>
          </div>
          <div className="hero-proof">
            <div><strong>100+</strong><span>ภาษาและบริบท</span></div>
            <div><strong>30+</strong><span>ช่องทางเผยแพร่</span></div>
            <div><strong>1</strong><span>พื้นที่ทำงานเดียว</span></div>
          </div>
        </div>

        <div className="studio-wrap" id="demo">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="studio-card">
            <div className="studio-top">
              <div><span className="live-dot" /> Campaign Studio</div>
              <span>•••</span>
            </div>
            <div className="campaign-title">
              <div className="campaign-art"><span>N</span></div>
              <div><small>กำลังสร้างแคมเปญ</small><h3>Tomorrow, simplified.</h3></div>
              <span className="status">พร้อมใช้</span>
            </div>
            <div className="channel-tabs" role="tablist" aria-label="เลือกช่องทางตัวอย่าง">
              {channels.slice(0, 4).map((channel) => (
                <button key={channel} onClick={() => setActiveChannel(channel)} className={activeChannel === channel ? "active" : ""}>{channel}</button>
              ))}
            </div>
            <div className="preview-pane">
              <div className="preview-copy">
                <span className="preview-label">ตัวอย่างสำหรับ {activeChannel}</span>
                <h4>เปลี่ยนหนึ่งความคิด<br />ให้เล่าได้ทั่วโลก</h4>
                <p>AI ปรับความยาว น้ำเสียง และรูปแบบให้เหมาะกับผู้ชมของแต่ละช่องทางโดยอัตโนมัติ</p>
                <div className="tag-row"><span>#NirvaMedia</span><span>#CreateOnce</span></div>
              </div>
              <div className="preview-visual">
                <div className="visual-ring"><span>✦</span></div>
                <span className="visual-note note-one">TH → EN</span>
                <span className="visual-note note-two">9:16</span>
              </div>
            </div>
            <div className="studio-bottom">
              <span><b>✓</b> ปรับภาษาแล้ว</span>
              <span><b>✓</b> ตรวจแบรนด์แล้ว</span>
              <button>ตั้งเวลาโพสต์ <span>→</span></button>
            </div>
          </div>
          <div className="floating-chip chip-one"><span>↗</span><div><small>Engagement</small><strong>+28.4%</strong></div></div>
          <div className="floating-chip chip-two"><span>文</span><div><small>Language</small><strong>100+ languages</strong></div></div>
        </div>
      </section>

      <section className="channel-strip" aria-label="ช่องทางที่รองรับ">
        <span>เผยแพร่จากที่เดียวไปยัง</span>
        <div>{channels.map((channel) => <b key={channel}>{channel}</b>)}</div>
      </section>

      <section className="global-atlas section" id="global">
        <div className="section-heading atlas-heading">
          <div><span className="section-kicker">GLOBAL CONNECTION ATLAS</span><h2>หนึ่งระบบเชื่อมต่อ<br /><em>ไปได้ครบรอบโลก</em></h2></div>
          <p>เลือกตลาดแล้วดู 5 ช่องทางที่ควรเตรียมก่อน โดยจัดลำดับจากการเข้าถึงผู้ชม ความเหมาะกับแบรนด์ และความพร้อมของระบบเผยแพร่</p>
        </div>

        <div className="region-tabs" role="tablist" aria-label="เลือกภูมิภาค">
          {marketRegions.map((region) => <button key={region} role="tab" aria-selected={activeRegion === region} className={activeRegion === region ? "active" : ""} onClick={() => setActiveRegion(region)}>{region}</button>)}
        </div>

        <div className="market-grid">
          {priorityMarkets.filter((market) => market.region === activeRegion).map((market) => (
            <article className="market-card" key={market.country}>
              <div className="market-title"><span>{market.flag}</span><div><small>PRIORITY MARKET</small><h3>{market.country}</h3></div></div>
              <ol>{market.platforms.map((platform, index) => <li key={platform}><span>{index + 1}</span><strong>{platform}</strong></li>)}</ol>
            </article>
          ))}
        </div>

        <div className="connector-section">
          <div className="connector-intro"><span className="section-kicker">CONNECT ONCE, EXPAND SMARTER</span><h3>อันไหนเหมือนกัน<br />รวมไปทางเดียวกัน</h3><p>เราแบ่งเป็น Connector Family เพื่อใช้ระบบสิทธิ์ ไฟล์ สถานะ และข้อมูลวิเคราะห์ร่วมกัน ลดการสร้างงานซ้ำ แต่ยังแยกแพลตฟอร์มที่มีกฎเฉพาะประเทศอย่างถูกต้อง</p></div>
          <div className="connector-grid">
            {connectorFamilies.map((family) => <article className={`connector-card ${family.tone}`} key={family.name}><div><span>{family.action}</span><small>{family.reach}</small></div><h4>{family.name}</h4><p>{family.platforms}</p></article>)}
          </div>
        </div>

        <div className="global-plan">
          <strong>แผนเชื่อมที่คุ้มที่สุด</strong>
          <div><span>01</span><p><b>Global Core</b>Meta + YouTube + TikTok ครอบคลุมตลาดส่วนใหญ่</p></div>
          <div><span>02</span><p><b>Asia Messaging</b>เพิ่ม LINE สำหรับไทย ญี่ปุ่น ไต้หวัน และ Kakao สำหรับเกาหลี</p></div>
          <div><span>03</span><p><b>China Dedicated</b>แยก WeChat, Douyin, Weibo และ Xiaohongshu เป็นชุดจีน</p></div>
        </div>
        <p className="atlas-note">Nirva Priority Map 2026 เป็นคำแนะนำเชิงกลยุทธ์ ไม่ใช่อันดับจำนวนผู้ใช้เพียงอย่างเดียว · อ้างอิงแนวโน้มจาก <a href="https://datareportal.com/reports/digital-2025-global-overview-report" target="_blank" rel="noreferrer">DataReportal</a> และข้อมูลการเชื่อมต่อจากเอกสารของแต่ละแพลตฟอร์ม</p>
      </section>

      <section className="section features-section" id="product">
        <div className="section-heading">
          <div><span className="section-kicker">ONE INTELLIGENT WORKSPACE</span><h2>ทุกอย่างที่ทีมคอนเทนต์ต้องใช้<br /><em>เชื่อมอยู่ในระบบเดียว</em></h2></div>
          <p>ลดงานซ้ำระหว่างทีม เครื่องมือ และแพลตฟอร์ม ให้ทุกขั้นตอนต่อเนื่องตั้งแต่ไอเดียแรกจนถึงผลลัพธ์จริง</p>
        </div>
        <div className="feature-grid">
          {features.map((feature, index) => (
            <article className={index === 2 ? "feature-card accent-card" : "feature-card"} key={feature.title}>
              <span className="feature-icon">{feature.icon}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <a href="#workflow" aria-label={`อ่านเกี่ยวกับ ${feature.title}`}>ดูรายละเอียด <span>↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div className="workflow-copy">
          <span className="section-kicker light">FROM IDEA TO IMPACT</span>
          <h2>สร้างครั้งเดียว<br /><em>เติบโตได้ทุกช่องทาง</em></h2>
          <p>เวิร์กโฟลว์เดียวที่ทำให้ AI ทีม และข้อมูลผลลัพธ์ทำงานร่วมกันอย่างต่อเนื่อง</p>
          <a className="button light-button" href="#contact">วางระบบให้ทีมของคุณ <span>→</span></a>
        </div>
        <div className="flow-list">
          {flow.map(([num, title, desc], index) => (
            <div className="flow-item" key={num}>
              <span className="flow-number">{num}</span>
              <div><h3>{title}</h3><p>{desc}</p></div>
              <span className="flow-symbol">{index === flow.length - 1 ? "↻" : "↓"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="language-section section" id="language">
        <div className="language-orb"><span>สวัสดี</span><span>Hello</span><span>こんにちは</span><span>Bonjour</span><span>مرحبا</span><div>文</div></div>
        <div className="language-copy">
          <span className="section-kicker">NIRVA LANGUAGE ENGINE</span>
          <h2>ไม่ใช่แค่แปลภาษา<br /><em>แต่เข้าใจผู้คน</em></h2>
          <p>Nirva Language Engine เข้าใจบริบท วัฒนธรรม สำเนียง น้ำเสียง เวลา สกุลเงิน และรูปแบบการสื่อสาร เพื่อให้แบรนด์ของคุณเป็นธรรมชาติในทุกตลาด</p>
          <div className="language-stats"><div><strong>100+</strong><span>ภาษา</span></div><div><strong>200+</strong><span>ประเทศและภูมิภาค</span></div></div>
        </div>
      </section>

      <section className="final-cta" id="contact">
        <span className="section-kicker light">BUILD WHAT&apos;S NEXT</span>
        <h2>คอนเทนต์ของคุณ<br /><em>พร้อมไปได้ไกลกว่าเดิม</em></h2>
        <p>เริ่มสร้างระบบสื่อที่เรียนรู้ เติบโต และสื่อสารกับผู้คนทั่วโลกไปพร้อมกับธุรกิจของคุณ</p>
        <div className="hero-actions centered"><a className="button white" href="/solutions">จัด Product Fabric <span>→</span></a><a className="button outline-light" href="mailto:hello@nirva.one">คุยกับทีม Nirva</a></div>
      </section>

      <footer>
        <div className="brand footer-brand"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></div>
        <p>สร้างครั้งเดียว ใช้ได้ทั่วโลก</p>
        <span>© 2026 Nirvacore. Built for every language.</span>
      </footer>
    </main>
  );
}
