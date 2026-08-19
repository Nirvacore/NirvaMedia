import Image from "next/image";
import Link from "next/link";
import registry from "../../docs/source-provenance-registry.json";

const statusLabels: Record<string, string> = {
  "preserved-upstream": "เก็บต้นฉบับ",
  "preserved-in-product": "เก็บในโปรเจกต์",
  "adapted-active": "นำมาใช้จริง",
  "preserved-reference": "ภาพอ้างอิง",
  "demo-active": "เดโม่ใช้งาน",
  "design-ready": "แบบพร้อมต่อยอด",
  "active-deployed": "ระบบที่เผยแพร่แล้ว",
};

export default function ContinuityPage() {
  return (
    <main className="continuity-page">
      <nav className="continuity-nav">
        <Link className="brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></Link>
        <div><a href="/studio">Studio</a><a href="/characters">Characters</a><a className="active" href="/continuity">Source Continuity</a></div>
      </nav>

      <header className="continuity-hero">
        <span>SOURCE CONTINUITY · CLAUDE × CODEX × JIDLADA</span>
        <h1>ไม่เริ่มใหม่<br /><em>แต่ต่อของเดิมให้ใช้ได้จริง</em></h1>
        <p>หน้ากลางนี้บอกแหล่งที่มาของโค้ด ภาพ และการตัดสินใจทุกชิ้น พร้อมแยกว่าสิ่งใดเป็นต้นฉบับ สิ่งใดถูกนำมาใช้ผ่าน adapter และสิ่งใดขึ้นเดโม่แล้ว</p>
        <div><strong>{registry.sources.length}</strong><span>source records</span><strong>1</strong><span>Claude module active</span><strong>3</strong><span>creators connected</span></div>
      </header>

      <section className="continuity-section">
        <div className="continuity-heading"><span>PROVENANCE REGISTRY</span><h2>งานทั้งหมดอยู่ในสายเดียวกัน</h2><p>ตรวจย้อนกลับได้ด้วย repository, commit, path และ checksum</p></div>
        <div className="continuity-grid">
          {registry.sources.map((source, index) => (
            <article key={source.id}>
              <div><span>{String(index + 1).padStart(2, "0")}</span><b>{statusLabels[source.status] ?? source.status}</b></div>
              <small>{source.creator} · {source.kind}</small>
              <h3>{source.id}</h3>
              <p>{"runtimeTruth" in source && source.runtimeTruth
                ? source.runtimeTruth
                : `ใช้ใน ${"usedBy" in source && source.usedBy ? source.usedBy.join(", ") : "registry"}`}</p>
              {"commit" in source && source.commit && <code>{source.commit.slice(0, 12)}</code>}
              {"localPath" in source && <footer>{source.localPath}</footer>}
            </article>
          ))}
        </div>
      </section>

      <section className="continuity-flow">
        <div><span>CLAUDE</span><strong>Preserved source</strong><p>Media rules, Studio OS, NLE, SDKs, tests</p></div>
        <i>→</i>
        <div><span>ADAPTER</span><strong>Verified reuse</strong><p>Platform constraints and status workflow</p></div>
        <i>→</i>
        <div><span>CODEX</span><strong>Active product</strong><p>D1 persistence, connectors, 21-language UI, deployment</p></div>
      </section>

      <section className="continuity-artifacts">
        <div><span>ORIGINAL CLAUDE ARTIFACTS</span><h2>ภาพเดิมถูกเก็บไว้ครบ ไม่วาดทับ</h2><p>Screenshot และ PWA icon ด้านล่างเป็นไฟล์ byte-for-byte จาก source commit `12b7034` ส่วนภาพตัวละครใหม่ยังแยก provenance เป็นงาน Codex ที่ต่อจาก DNA ของผู้ใช้</p></div>
        <figure className="artifact-wide"><Image src="/upstream/claude-icons/screenshot-wide.png" width={1280} height={720} unoptimized alt="Original Claude Nirva dashboard wide screenshot" /><figcaption>Claude upstream · screenshot-wide.png</figcaption></figure>
        <figure className="artifact-narrow"><Image src="/upstream/claude-icons/screenshot-narrow.png" width={375} height={812} unoptimized alt="Original Claude Nirva dashboard mobile screenshot" /><figcaption>Claude upstream · screenshot-narrow.png</figcaption></figure>
        <figure className="artifact-icon"><Image src="/upstream/claude-icons/icon-512x512.png" width={512} height={512} unoptimized alt="Original Claude Nirva PWA application icon" /><figcaption>Claude upstream · icon-512x512.png</figcaption></figure>
      </section>

      <footer className="continuity-footer"><Link href="/">← Nirva Media</Link><p>Registry API: <a href="/api/source-provenance">/api/source-provenance</a></p></footer>
    </main>
  );
}
