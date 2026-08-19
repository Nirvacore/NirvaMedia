import Image from "next/image";
import Link from "next/link";
import completeSource from "../../docs/complete-source-manifest.json";
import registry from "../../docs/source-provenance-registry.json";
import { CompleteSourceExplorer } from "./CompleteSourceExplorer";

const statusLabels: Record<string, string> = {
  "preserved-upstream": "เก็บต้นฉบับ",
  "preserved-in-product": "เก็บในโปรเจกต์",
  "adapted-active": "นำมาใช้จริง",
  "preserved-reference": "ภาพอ้างอิง",
  "demo-active": "เดโม่ใช้งาน",
  "design-ready": "แบบพร้อมต่อยอด",
  "active-deployed": "ระบบที่เผยแพร่แล้ว",
};

const imageFileName = (imagePath: string) => imagePath.split("/").at(-1) ?? imagePath;

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
        <div><strong>{completeSource.totals.files}</strong><span>Claude files preserved</span><strong>{completeSource.totals.images}</strong><span>original images</span><strong>{registry.sources.length}</strong><span>provenance records</span></div>
      </header>

      <section className="complete-source-section">
        <div className="complete-source-heading">
          <span>COMPLETE UPSTREAM · COMMIT 12B7034</span>
          <h2>โครงสร้าง Claude<br /><em>ขึ้นครบทุกไฟล์แล้ว</em></h2>
          <p>ต้นฉบับทั้งชุดถูกเก็บแบบ read-only ใน GitHub พร้อม checksum รายไฟล์ เลือกหมวดหรือค้นหาชื่อไฟล์เพื่อดูโครงสร้างจริงได้ทันที</p>
          <code>ROOT SHA256 · {completeSource.integrity.rootChecksum}</code>
        </div>
        <CompleteSourceExplorer categories={completeSource.categories} files={completeSource.files} />
      </section>

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
        <div><span>UNIFIED IMAGE VAULT · {completeSource.totals.images + 3} FILES</span><h2>ภาพทุกฝ่ายอยู่ครบ<br />และรู้ว่าใครสร้าง</h2><p>Claude 10 ภาพ · Jidlada 1 ภาพต้นแบบ · Codex 2 ภาพต่อยอด ทุกไฟล์อยู่บน GitHub พร้อม checksum และไม่เขียนทับกัน</p></div>
        <div className="artifact-gallery">
          {completeSource.images.map((image) => {
            const fileName = imageFileName(image.path);
            return (
              <figure className={fileName.includes("screenshot-wide") ? "artifact-wide" : ""} key={image.path}>
                <Image src={`/upstream/claude-icons/${fileName}`} width={512} height={512} unoptimized alt={`Claude original ${fileName}`} />
                <figcaption><strong>CLAUDE</strong>{fileName}<code>{image.sha256.slice(0, 10)}</code></figcaption>
              </figure>
            );
          })}
          <figure className="artifact-wide"><Image src="/characters/nirva-media-creator-dna-source.jpg" width={1254} height={1254} unoptimized alt="Jidlada Nirva Media Creator DNA reference" /><figcaption><strong>JIDLADA</strong>nirva-media-creator-dna-source.jpg</figcaption></figure>
          <figure><Image src="/characters/nirva-media-creator-v1.png" width={1024} height={1536} unoptimized alt="Codex Nirva Media Creator" /><figcaption><strong>CODEX</strong>nirva-media-creator-v1.png</figcaption></figure>
          <figure className="artifact-wide"><Image src="/characters/nirva-ecosystem-founders-v1.png" width={1536} height={1024} unoptimized alt="Codex Nirva ecosystem founders" /><figcaption><strong>CODEX</strong>nirva-ecosystem-founders-v1.png</figcaption></figure>
        </div>
      </section>

      <footer className="continuity-footer"><Link href="/">← Nirva Media</Link><p>Registry API: <a href="/api/source-provenance">/api/source-provenance</a></p></footer>
    </main>
  );
}
