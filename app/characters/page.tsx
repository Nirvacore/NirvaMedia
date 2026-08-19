import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { characterPrinciples, characterStatusLabels, nirvaCharacters } from "../../lib/character-system";

export default function CharactersPage() {
  return (
    <main className="character-universe">
      <header className="character-nav">
        <Link className="brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></Link>
        <nav><a href="#founders">Founders</a><a href="#registry">Registry</a><a href="#rules">Shared DNA</a></nav>
        <Link className="nav-cta" href="/studio">เปิด Studio <span>↗</span></Link>
      </header>

      <section className="character-hero">
        <div className="character-hero-copy">
          <span className="character-kicker">NIRVA CHARACTER UNIVERSE · V1</span>
          <h1>ทุกโปรแกรมมี<br /><em>ตัวตนของตัวเอง</em></h1>
          <p>หนึ่งผลิตภัณฑ์ หนึ่งตัวละคร หนึ่งภารกิจ—แตกต่างพอให้จดจำ แต่เชื่อมกันด้วย DNA เดียวทั้ง Ecosystem</p>
          <div className="character-actions"><a href="#registry">ดู Character Registry <span>↓</span></a><Link href="/studio">ดูเดโม่ Nirva Media <span>→</span></Link></div>
          <div className="character-metrics"><div><strong>16</strong><span>Product characters registered</span></div><div><strong>8</strong><span>Founding designs ready</span></div><div><strong>1</strong><span>Demo active today</span></div></div>
        </div>
        <div className="character-media-card"><Image src="/characters/nirva-media-creator-v1.png" width={1254} height={1254} priority unoptimized alt="Nirva Media Creator mascot with rainbow hair, camera, and microphone" /><div><small>05 · CREATOR</small><strong>Nirva Media</strong><span>CREATE · INSPIRE · CONNECT</span></div></div>
      </section>

      <section className="founder-section" id="founders">
        <div className="character-section-heading"><div><span>FOUNDING CHARACTERS</span><h2>ครอบครัวเดียวกัน<br />คนละความสามารถ</h2></div><p>ภาพนี้เป็น Design Direction ของแปดตัวละครชุดแรก ยังไม่ใช่หลักฐานว่าแอปทั้งแปด deploy แล้ว—สถานะจริงแสดงใน Registry ด้านล่าง</p></div>
        <figure className="founder-lineup"><Image src="/characters/nirva-ecosystem-founders-v1.png" width={1774} height={998} unoptimized alt="Eight founding Nirva ecosystem mascots standing together" /><figcaption>Shared proportions · distinct silhouettes · connected product missions</figcaption></figure>
      </section>

      <section className="character-registry-section" id="registry">
        <div className="character-section-heading"><div><span>CHARACTER REGISTRY</span><h2>ตัวละครประจำผลิตภัณฑ์</h2></div><p>สถานะ Demo active ใช้เฉพาะผลิตภัณฑ์ที่มี asset อยู่ใน repository และมีหน้าที่ตรวจได้จริง</p></div>
        <div className="character-grid">
          {nirvaCharacters.map((character, index) => (
            <article className={`character-card ${character.status}`} key={character.id} style={{ "--character-accent": character.accent } as CSSProperties}>
              <div className="character-card-top"><span>{String(index + 1).padStart(2, "0")}</span><b>{characterStatusLabels[character.status]}</b></div>
              <div className="character-symbol">{character.symbol}</div>
              <small>{character.archetype}</small>
              <h3>{character.product}</h3>
              <strong>{character.thaiRole}</strong>
              <p>{character.mission}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="character-rules" id="rules">
        <div><span>SHARED CHARACTER DNA</span><h2>เป็นหนึ่งเดียว<br />โดยไม่เหมือนกันหมด</h2><p>Character System เป็นชั้นอัตลักษณ์ร่วม ไม่ใช่การรวมทุกแอปเป็นก้อนเดียว แต่ทำให้ลูกค้ารู้ทันทีว่าโปรแกรมทั้งหมดอยู่ในโลก Nirva เดียวกัน</p></div>
        <ol>{characterPrinciples.map((principle, index) => <li key={principle}><span>{String(index + 1).padStart(2, "0")}</span><p>{principle}</p></li>)}</ol>
      </section>

      <footer className="character-footer"><Link href="/">← Nirva Media</Link><Link href="/continuity">ดูที่มาของภาพและโค้ด →</Link><p>Nirva Character Universe · Canonical demo reference</p><span>© 2026 Nirvacore</span></footer>
    </main>
  );
}
