/* ---------- settings pane ---------- */
function renderSettings() {
  const s = state.settings;
  const fld = (id, label, key, type = "text", wide = false, ph = "") =>
    `<div class="f ${wide ? "wide" : ""}"><label for="${id}">${label}</label><input id="${id}" type="${type}" data-s="${key}" value="${esc(s[key])}" placeholder="${esc(ph)}"></div>`;
  $("#pane-settings").innerHTML = `
    <div class="bar"><div><h2>Settings</h2><p class="sub">Your details appear on every quote and invoice.</p></div></div>
    <div class="panel">
      <h3>Your business</h3>
      <div class="fields">
        ${fld("st-brand", "Brand or your name", "brand")}
        ${fld("st-email", "Email", "email", "text", false, "you@studio.com")}
        ${fld("st-phone", "Phone", "phone")}
        ${fld("st-addr", "Location", "address")}
        ${fld("st-cur", "Currency code", "currency", "text", false, "LKR")}
        ${fld("st-ni", "Next invoice number", "nextInv", "number")}
        ${fld("st-nq", "Next quote number", "nextQuo", "number")}
        ${fld("st-valid", "Rates valid until", "validUntil", "text", false, "31 Dec 2026")}
        ${fld("st-dep", "Deposit to confirm a job (%)", "depositPct", "number")}
        <div class="f wide"><label for="st-pay">Payment details (shown on quotes and invoices)</label><textarea id="st-pay" data-s="paymentInfo" placeholder="Bank name, account name, account number, branch">${esc(s.paymentInfo)}</textarea></div>
        <div class="f wide"><label for="st-terms">Default notes and terms</label><textarea id="st-terms" data-s="terms">${esc(s.terms)}</textarea></div>
      </div>
    </div>
    <div class="panel">
      <h3>Services and rates</h3>
      <div class="list" id="svcList">${svcGroups(s.services)}</div>
      <datalist id="catList">${[...new Set(s.services.map((v) => v.cat).filter(Boolean))].map((c) => `<option value="${esc(c)}">`).join("")}</datalist>
      <div><button class="btn small" data-act="addSvc">Add service</button></div>
    </div>
    <div class="panel">
      <h3>Backup</h3>
      <p class="muted">${store.mode === "db" ? "Your data is saved to your account." : "Your data lives on this device only. Save a backup file now and then, and use Restore to move it to another phone or computer."}</p>
      <div class="toolbar"><button class="btn small" data-act="backup">Save backup</button><button class="btn small" data-act="restore">Restore from backup</button><input type="file" id="restoreFile" accept="application/json,.json" hidden></div>
    </div>`;
}

function svcGroups(list) {
  if (!list.length) return '<div class="empty">No services yet.</div>';
  const groups = {};
  list.forEach((v) => { (groups[v.cat || "Other"] = groups[v.cat || "Other"] || []).push(v); });
  return '<div class="svc head"><span>Service</span><span>LKR</span><span>USD</span><span>Category</span><span></span></div>' + Object.entries(groups).map(([cat, items]) => `<h4 class="grp">${esc(cat)}</h4>` + items.map((v) => `
    <div class="svc" data-sv="${esc(v.id)}">
      <input aria-label="Service name" data-k="name" value="${esc(v.name)}" placeholder="Service">
      <input aria-label="LKR rate" type="number" min="0" step="any" data-k="rate" value="${esc(v.rate)}">
      <input aria-label="USD rate" type="number" min="0" step="any" data-k="usd" value="${esc(v.usd)}">
      <input aria-label="Category" list="catList" data-k="cat" value="${esc(v.cat)}" placeholder="Category">
      <button class="btn small quiet" data-act="delSvc" aria-label="Remove service">✕</button>
    </div>`).join("")).join("");
}

function wireSettings() {
  const pane = $("#pane-settings");
  pane.addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.s) {
      const k = t.dataset.s;
      state.settings[k] = ["nextInv", "nextQuo"].includes(k) ? Math.max(1, Math.round(num(t.value))) : k === "depositPct" ? Math.min(100, Math.max(0, num(t.value))) : t.value;
      save(); renderPipeline(); renderInvList(); renderEstimate(); if (t.dataset.s === "brand") brandName();
    } else if (t.dataset.k) {
      const v = state.settings.services.find((x) => x.id === t.closest("[data-sv]").dataset.sv);
      if (v) { v[t.dataset.k] = ["rate", "usd"].includes(t.dataset.k) ? num(t.value) : t.value; save(); renderEstimate(); if (t.dataset.k === "cat") renderChips(); }
    }
  });
  pane.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.act === "addSvc") { state.settings.services.push({ id: uid(), cat: "Other", name: "", rate: 0, usd: 0, note: "" }); save(); renderSettings(); }
    if (b.dataset.act === "backup") {
      const d = new Date(), stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      saveBlob(new Blob([JSON.stringify(state)], { type: "application/json" }), "creator-hub-backup-" + stamp + ".json", "Backup saved");
    }
    if (b.dataset.act === "restore") $("#restoreFile").click();
    if (b.dataset.act === "delSvc") {
      const id = b.closest("[data-sv]").dataset.sv;
      state.settings.services = state.settings.services.filter((x) => x.id !== id); save(); renderSettings();
    }
  });
}

pane_restore();
function pane_restore() {
  $("#pane-settings").addEventListener("change", async (e) => {
    if (e.target.id !== "restoreFile" || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data || !data.settings || !Array.isArray(data.projects)) throw new Error("bad file");
      if (!confirm("Replace everything in this app with the backup?")) { e.target.value = ""; return; }
      adopt(data); save(); buildEstimate(); renderAll(); toast("Backup restored");
    } catch (err) { toast("That file is not a Creator Hub backup."); e.target.value = ""; }
  });
}

function brandName() {
  const n = state.settings.brand;
  $("#brandName").textContent = n && n !== "Your Studio Name" ? n : "Creator Hub";
}

/* ---------- PDF ---------- */
async function savePdf(inv) {
  const lib = window.jspdf;
  if (!lib) { toast("The PDF tool did not load. Use Copy text instead."); return; }
  const s = state.settings, doc = new lib.jsPDF({ unit: "mm", format: "a4" });
  const L = 18, R = 192; let y = 22;
  const cur = (n) => curOf(inv) + " " + num(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); try { doc.addImage(LOGO_BLACK, "PNG", L, 14, 19, 19); } catch (e) { /* logo is optional */ }
  doc.text(s.brand || "Your Studio", L + 23, y);
  doc.setFontSize(20); doc.text(inv.kind === "quote" ? "QUOTE" : "INVOICE", R, y, { align: "right" });
  y += 7; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
  [s.address, s.email, s.phone].filter(Boolean).forEach((t) => { doc.text(String(t), L + 23, y); y += 5; });
  doc.text(docNo(inv.kind, inv.no), R, 29, { align: "right" });
  doc.text("Date: " + fmtDate(inv.date), R, 34, { align: "right" });
  doc.text((inv.kind === "quote" ? "Valid until: " : "Due: ") + fmtDate(inv.due), R, 39, { align: "right" });
  y = Math.max(y, 46) + 6; doc.setTextColor(0);
  doc.setFont("helvetica", "bold"); doc.text("Bill to", L, y); y += 5;
  doc.setFont("helvetica", "normal"); doc.text(inv.client || "-", L, y); if (inv.email) { y += 5; doc.text(inv.email, L, y); }
  y += 12; doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("DESCRIPTION", L, y); doc.text("QTY", 118, y, { align: "right" }); doc.text("RATE", 152, y, { align: "right" }); doc.text("AMOUNT", R, y, { align: "right" });
  y += 2; doc.setDrawColor(180); doc.line(L, y, R, y); y += 6; doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  inv.items.forEach((it) => {
    const lines = doc.splitTextToSize(it.desc || "-", 80);
    if (y + lines.length * 5 > 270) { doc.addPage(); y = 22; }
    doc.text(lines, L, y);
    doc.text(String(it.qty), 118, y, { align: "right" }); doc.text(cur(it.rate), 152, y, { align: "right" });
    doc.text(cur(num(it.qty) * num(it.rate)), R, y, { align: "right" }); y += lines.length * 5 + 2;
  });
  y += 2; doc.line(L, y, R, y); y += 7;
  const tot = (label, val, bold) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.text(label, 140, y); doc.text(val, R, y, { align: "right" }); y += 6; };
  tot("Subtotal", cur(invTotal(inv)));
  if (num(inv.taxPct)) tot("Tax (" + inv.taxPct + "%)", cur(invTax(inv)));
  if (num(inv.discount)) tot("Discount", "-" + cur(inv.discount));
  doc.setFontSize(12); tot("Total", cur(invGrand(inv)), true); doc.setFontSize(10);
  if (inv.kind === "invoice" && invPaid(inv) > 0) {
    tot("Paid", "-" + cur(invPaid(inv)));
    doc.setFontSize(12); tot("Balance due", cur(invBal(inv)), true); doc.setFontSize(10);
  }
  if (inv.kind === "quote" && num(s.depositPct) > 0) {
    doc.setFont("helvetica", "normal"); doc.setTextColor(90);
    doc.text("To confirm: " + s.depositPct + "% deposit (" + cur(invGrand(inv) * num(s.depositPct) / 100) + ")", R, y, { align: "right" });
    y += 6; doc.setTextColor(0);
  }
  const block = (title, text) => {
    const ls = doc.splitTextToSize(text, R - L);
    if (y + 10 + ls.length * 5 > 280) { doc.addPage(); y = 22; }
    y += 5; doc.setFont("helvetica", "bold"); doc.setTextColor(0); doc.text(title, L, y); y += 5;
    doc.setFont("helvetica", "normal"); doc.setTextColor(90); doc.text(ls, L, y); y += ls.length * 5;
  };
  if (s.paymentInfo) block("Payment details", s.paymentInfo);
  if (inv.notes) block("Notes", inv.notes);
  await deliverPdf(doc, docNo(inv.kind, inv.no) + ".pdf");
}

async function saveBlob(blob, filename, okMsg) {
  let dl = null;
  try { dl = window.claude && window.claude.use ? await window.claude.use("downloads") : null; } catch (e) { dl = null; }
  if (dl) {
    try { await dl.save({ filename, data: blob }); toast(okMsg); }
    catch (err) { if (!err || err.code !== "declined") toast("Could not save the file here."); }
    return;
  }
  try {
    const a = document.createElement("a"), url = URL.createObjectURL(blob);
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000); toast(okMsg);
  } catch (e) { toast("Could not save the file here."); }
}
const deliverPdf = (doc, filename) => saveBlob(doc.output("blob"), filename, "PDF ready");

/* ---------- price list PDF (current price list: local LKR or international USD) ---------- */
async function savePriceList() {
  const lib = window.jspdf;
  if (!lib) { toast("The PDF tool did not load. Try again in a moment."); return; }
  const intl = isIntl(), cur = intl ? "USD" : (state.settings.currency || "LKR");
  const price = (v) => (intl ? num(v.usd) : num(v.rate));
  const fmt = (n) => cur + " " + num(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const s = state.settings, doc = new lib.jsPDF({ unit: "mm", format: "a4" });
  const L = 18, R = 192, BOTTOM = 280, line = intl ? [10, 118, 180] : [253, 102, 4];
  let y = 22;
  const ensure = (h) => { if (y + h > BOTTOM) { doc.addPage(); y = 22; } };

  try { doc.addImage(LOGO_BLACK, "PNG", L, 14, 19, 19); } catch (e) { /* logo is optional */ }
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(0);
  doc.text(s.brand || "Your Studio", L + 23, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
  let hy = y + 7;
  [s.address, s.email, s.phone].filter(Boolean).forEach((t) => { doc.text(String(t), L + 23, hy); hy += 5; });
  doc.setFont("helvetica", "bold"); doc.setFontSize(20); doc.setTextColor(0); doc.text("RATE CARD", R, y, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
  doc.text("Prices in " + cur, R, 29, { align: "right" });
  if (s.validUntil) doc.text("Valid until " + s.validUntil, R, 34, { align: "right" });
  y = Math.max(hy, 42) + 8; doc.setTextColor(0);

  const heading = (t) => {
    ensure(26); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0);
    doc.text(t.toUpperCase(), L, y); y += 2; doc.setDrawColor(line[0], line[1], line[2]); doc.setLineWidth(0.6); doc.line(L, y, R, y); y += 7;
  };
  const row = (name, val, note, shade) => {
    const ls = doc.splitTextToSize(name, 128), h = ls.length * 5 + (note ? 4 : 0) + 3;
    ensure(h);
    if (shade) { doc.setFillColor(244, 245, 245); doc.rect(L, y - 4, R - L, h, "F"); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(0); doc.text(ls, L + 2, y);
    doc.setFont("helvetica", "bold"); doc.text(val, R - 2, y, { align: "right" });
    if (note) { doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(110); doc.text(note, L + 2, y + ls.length * 5 - 1); }
    y += h;
  };

  const pk = s.services.filter((v) => v.pkg);
  if (pk.length) {
    heading("Packages");
    pk.forEach((p) => {
      const inc = doc.splitTextToSize((p.inc || []).join("; "), 128);
      ensure(inc.length * 4 + 14);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0);
      doc.text(p.name, L + 2, y); doc.text(fmt(price(p)), R - 2, y, { align: "right" }); y += 5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(100); doc.text(inc, L + 2, y);
      y += inc.length * 4 + 2; doc.setDrawColor(222); doc.setLineWidth(0.2); doc.line(L, y, R, y); y += 6;
    });
    y += 2;
  }
  const cats = []; s.services.filter((v) => !v.pkg).forEach((v) => { const c = v.cat || "Other"; if (!cats.includes(c)) cats.push(c); });
  cats.forEach((c) => {
    heading(c);
    s.services.filter((v) => !v.pkg && (v.cat || "Other") === c).forEach((v, i) => row(v.name, fmt(price(v)), v.note, i % 2 === 1));
    y += 5;
  });
  if (intl) { ensure(12); doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(110); doc.text("International prices are in US dollars.", L, y); }

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
    doc.text((s.brand || "") + "  |  Rate card" + (s.validUntil ? "  |  Valid until " + s.validUntil : "") + "  |  Page " + i + " of " + n, 105, 290, { align: "center" });
  }
  const base = String(s.brand || "Rate-Card").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  await deliverPdf(doc, base + "-Rate-Card-" + cur + ".pdf");
}

/* ---------- tabs and boot ---------- */
function switchTab(name) {
  ui.tab = name;
  document.querySelectorAll(".tab").forEach((t) => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  ["estimate", "pipeline", "calendar", "clients", "invoices", "settings"].forEach((n) => { $("#pane-" + n).hidden = n !== name; });
  if ($("#estBar")) renderEstimate();
  if (name === "clients" && $("#clientRows")) renderClients();
  if (name === "calendar") renderCalendar();
}

function renderAll() {
  brandName();
  renderEstimate();
  renderClientList(); renderClients();
  renderPipeline(); renderProjectEditor();
  renderCalendar(); renderPostEditor();
  renderInvList(); renderInvEditor();
  renderSettings();
}

document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));
wireEstimate(); wirePipeline(); wireCalendar(); wireClients(); wireInvoices(); wireSettings();
$("#brandLogo").src = LOGO_ORANGE;
$("#pane-estimate").innerHTML = '<div class="empty">Loading your rate card…</div>';

(async function boot() {
  await Promise.race([initStore(), new Promise((r) => setTimeout(r, 6000))]);
  if (!state) { const saved = lsRead(); if (!adopt(saved)) state = exampleState(); store.mode = store.mode === "db" ? "db" : "local"; setNote("Saved in this browser only."); }
  buildEstimate(); buildPipeline(); buildCalendar(); buildClients(); buildInvoices();
  renderAll();
})();
