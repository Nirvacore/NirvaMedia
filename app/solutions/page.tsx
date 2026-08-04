"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- vinext client runtime currently duplicates React through next/link */

import { useEffect, useState } from "react";
import { connectorCatalog, productBundles, productModules } from "../../lib/product-catalog";

type SavedSolution = {
  id: string;
  name: string;
  bundleId: string | null;
  moduleIds: string[];
  connectorIds: string[];
  createdAt: string | number;
};

const enterpriseBundle = productBundles.find((bundle) => bundle.id === "enterprise-global")!;

function formatDate(value: string | number) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
export default function SolutionsPage() {
  const [solutionName, setSolutionName] = useState("Nirva Global Fabric");
  const [bundleId, setBundleId] = useState<string>(enterpriseBundle.id);
  const [selectedModules, setSelectedModules] = useState<string[]>([...enterpriseBundle.moduleIds]);
  const [selectedConnectors, setSelectedConnectors] = useState<string[]>([...enterpriseBundle.connectorIds]);
  const [savedSolutions, setSavedSolutions] = useState<SavedSolution[]>([]);
  const [activeSolutionId, setActiveSolutionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/solutions"), fetch("/api/entitlements")])
      .then(async ([solutionsResponse, entitlementResponse]) => {
        if (!solutionsResponse.ok || !entitlementResponse.ok) throw new Error();
        return Promise.all([solutionsResponse.json(), entitlementResponse.json()]);
      })
      .then(([solutionsData, entitlementData]) => {
        setSavedSolutions(solutionsData.solutions ?? []);
        setActiveSolutionId(entitlementData.entitlement?.solutionConfigId ?? null);
      })
      .catch(() => setMessage("ยังโหลดชุดโซลูชันหรือสิทธิ์ Workspace เดิมไม่ได้"));
  }, []);

  function applyBundle(id: string) {
    const bundle = productBundles.find((item) => item.id === id);
    if (!bundle) return;
    setBundleId(bundle.id);
    setSelectedModules([...bundle.moduleIds]);
    setSelectedConnectors([...bundle.connectorIds]);
    setSolutionName(`Nirva ${bundle.name}`);
    setMessage("");
  }

  function toggleModule(id: string) {
    setBundleId("custom");
    setSelectedModules((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleConnector(id: string) {
    setBundleId("custom");
    setSelectedConnectors((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function loadSolution(solution: SavedSolution) {
    setSolutionName(solution.name);
    setBundleId(solution.bundleId ?? "custom");
    setSelectedModules(solution.moduleIds);
    setSelectedConnectors(solution.connectorIds);
    setMessage("เปิดชุดโซลูชันแล้ว");
  }

  async function saveSolution() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/solutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: solutionName,
          bundleId: bundleId === "custom" ? null : bundleId,
          moduleIds: selectedModules,
          connectorIds: selectedConnectors,
        }),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      const activationResponse = await fetch("/api/entitlements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ solutionConfigId: data.solution.id }),
      });
      if (!activationResponse.ok) throw new Error();
      setSavedSolutions((current) => [data.solution, ...current].slice(0, 12));
      setActiveSolutionId(data.solution.id);
      setMessage("บันทึกและเปิดใช้ Product Fabric กับ Workspace แล้ว");
    } catch {
      setMessage("บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="solutions-page">
      <header className="solution-nav">
        <a className="brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></a>
        <nav><a href="/">เว็บไซต์</a><a href="/studio">Campaign Studio</a><a className="active" href="/solutions">Product Fabric</a><a href="/connections">Connection Center</a></nav>
        <span className="fabric-status"><i /> ONE CONNECTED CORE</span>
      </header>

      <section className="solution-hero">
        <div><span className="section-kicker light">MODULAR BY DESIGN · LIMITLESS BY CONNECTION</span><h1>ขายแยกได้<br /><em>เชื่อมรวมได้ไร้ขอบเขต</em></h1><p>ทุกโมดูลทำงานบน Brand, Asset, Language, Workflow, Identity และ Data Core เดียวกัน ลูกค้าเริ่มจากหนึ่งส่วนแล้วต่อขยายได้โดยไม่ต้องย้ายระบบใหม่</p></div>
        <div className="fabric-visual" aria-label="Nirva Media connected product fabric">
          <div className="fabric-core"><span>N</span><strong>NIRVA CORE</strong><small>One shared intelligence</small></div>
          {productModules.map((module, index) => <div key={module.id} className={`fabric-node node-${index + 1}`}><span>{module.icon}</span><small>{module.layer}</small></div>)}
        </div>
      </section>

      <section className="bundle-section">
        <div className="solution-heading"><div><span>01</span><h2>เลือกแพ็กเกจเริ่มต้น</h2></div><p>ทุกแพ็กเกจอัปเกรดและเพิ่มโมดูลได้ตลอด</p></div>
        <div className="bundle-grid">
          {productBundles.map((bundle) => <button key={bundle.id} className={bundleId === bundle.id ? "selected" : ""} onClick={() => applyBundle(bundle.id)}><span>{bundle.label}</span><h3>{bundle.name}</h3><p>{bundle.description}</p><small>{bundle.moduleIds.length} modules · {bundle.connectorIds.length} connector families</small></button>)}
        </div>
      </section>

      <section className="fabric-builder">
        <div className="builder-column">
          <div className="solution-heading"><div><span>02</span><h2>โมดูลที่ต้องการ</h2></div><button onClick={() => { setSelectedModules(productModules.map((module) => module.id)); setBundleId("custom"); }}>เลือกทั้งหมด</button></div>
          <div className="module-selector">
            {productModules.map((module) => <button key={module.id} className={selectedModules.includes(module.id) ? "selected" : ""} onClick={() => toggleModule(module.id)}><span>{module.icon}</span><div><small>{module.layer}</small><h3>{module.name}</h3><p>{module.description}</p></div><i>{selectedModules.includes(module.id) ? "✓" : "+"}</i></button>)}
          </div>
        </div>

        <div className="builder-column connector-builder">
          <div className="solution-heading"><div><span>03</span><h2>Connector Families</h2></div><button onClick={() => { setSelectedConnectors(connectorCatalog.map((connector) => connector.id)); setBundleId("custom"); }}>เชื่อมทั้งหมด</button></div>
          <div className="connector-selector">
            {connectorCatalog.map((connector) => <button key={connector.id} className={selectedConnectors.includes(connector.id) ? "selected" : ""} onClick={() => toggleConnector(connector.id)}><div><span>{connector.scope}</span><i>{selectedConnectors.includes(connector.id) ? "✓" : "+"}</i></div><h3>{connector.name}</h3><p>{connector.platforms}</p></button>)}
          </div>
          <div className="shared-core-card"><span>∞</span><div><small>SHARED BY EVERY MODULE</small><h3>One Intelligence Core</h3><p>Identity · Brand · Assets · Language · Workflow · Audit · Analytics</p></div></div>
        </div>
      </section>

      <section className="solution-summary">
        <div><span className="section-kicker light">YOUR NIRVA PRODUCT FABRIC</span><input aria-label="ชื่อชุดโซลูชัน" value={solutionName} onChange={(event) => setSolutionName(event.target.value)} /><p>{selectedModules.length} โมดูล เชื่อมกับ {selectedConnectors.length} Connector Families ผ่านแกนกลางเดียว</p></div>
        <div className="summary-chips">{selectedModules.map((id) => <span key={id}>{productModules.find((module) => module.id === id)?.name}</span>)}</div>
        <button disabled={saving || !solutionName.trim() || selectedModules.length === 0} onClick={saveSolution}>{saving ? "กำลังเปิดใช้..." : "บันทึกและเปิดใช้"}<span>→</span></button>
        {message && <small className="solution-message">{message}</small>}
      </section>

      {savedSolutions.length > 0 && <section className="saved-solutions"><div className="solution-heading"><div><span>04</span><h2>ชุดที่บันทึกไว้</h2></div><p>ชุดที่เปิดใช้จะควบคุมสิทธิ์ใน Campaign Studio</p></div><div>{savedSolutions.map((solution) => <button className={activeSolutionId === solution.id ? "active" : ""} key={solution.id} onClick={() => loadSolution(solution)}><strong>{solution.name}</strong><span>{solution.moduleIds.length} modules · {solution.connectorIds.length} connectors</span><small>{activeSolutionId === solution.id ? "● ใช้งานอยู่ใน Workspace" : formatDate(solution.createdAt)}</small></button>)}</div></section>}

      <footer className="solution-footer"><a className="brand footer-brand" href="/"><span className="brand-mark"><i /><i /><i /></span><span>Nirva<span>Media</span></span></a><p>Start anywhere. Connect everything. Grow without boundaries.</p><a href="/studio">เปิด Campaign Studio →</a></footer>
    </main>
  );
}
