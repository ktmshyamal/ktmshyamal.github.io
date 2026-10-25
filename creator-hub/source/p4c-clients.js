/* ---------- clients ---------- */
function waLink(phone, text) {
  let d = String(phone || "").replace(/[^\d+]/g, "").replace(/\+/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "94" + d.slice(1);
  else if (d.length === 9) d = "94" + d;
  if (d.length < 10) return "";
  return "https://wa.me/" + d + (text ? "?text=" + encodeURIComponent(text) : "");
}
const sameName = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
const clientByName = (n) => (String(n || "").trim() ? state.clients.find((c) => sameName(c.name, n)) : null);

function renderClientList() {
  const dl = $("#clientList"); if (!dl) return;
  dl.innerHTML = state.clients.filter((c) => c.name).map((c) => `<option value="${esc(c.name)}">`).join("");
}

function clientStats(c) {
  const projects = state.projects.filter((p) => sameName(p.client, c.name));
  const docs = state.invoices.filter((i) => sameName(i.client, c.name));
  const by = {};
  docs.filter((d) => d.kind === "invoice" && d.status === "sent").forEach((d) => { const k = curOf(d); by[k] = (by[k] || 0) + invBal(d); });
  const owedText = Object.entries(by).filter(([, v]) => v > 0).map(([k, v]) => money(v, 0, k)).join(" + ");
  return { projects, docs, owedText: owedText ? owedText + " owed" : "" };
}

function unlistedNames() {
  const names = new Map();
  [...state.projects, ...state.invoices].forEach((x) => {
    const n = String(x.client || "").trim();
    if (n && !clientByName(n) && !names.has(n.toLowerCase())) names.set(n.toLowerCase(), n);
  });
  return [...names.values()];
}

function buildClients() {
  $("#pane-clients").innerHTML = `
    <div class="bar">
      <div><h2>Clients</h2><p class="sub">Contact details, history and what each client owes.</p></div>
      <div class="actions"><button class="btn primary" id="newClient">New client</button></div>
    </div>
    <div id="clientBanner"></div>
    <div class="split"><div class="list" id="clientRows"></div><div id="clientEditor"></div></div>`;
}

function renderClientRows() {
  if (!$("#clientRows")) return;
  const un = unlistedNames();
  $("#clientBanner").innerHTML = un.length
    ? `<div class="banner"><span>${un.length} client name${un.length === 1 ? "" : "s"} in your projects and invoices ${un.length === 1 ? "is" : "are"} not saved here yet.</span><button class="btn small" id="importClients">Add ${un.length === 1 ? "it" : "them"}</button></div>` : "";
  const rows = state.clients.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => {
    const st = clientStats(c);
    return `<button class="row" data-client="${esc(c.id)}" ${ui.clientId === c.id ? 'aria-current="true"' : ""}>
      <span class="a">${esc(c.name || "Unnamed client")}</span><span class="r mono">${esc(st.owedText)}</span>
      <span class="b">${esc(c.phone || c.email || "No contact details yet")}</span><span class="r b">${st.projects.length} project${st.projects.length === 1 ? "" : "s"}</span></button>`;
  });
  $("#clientRows").innerHTML = rows.join("") || '<div class="empty">No clients yet. Add one, or save the names you already use.</div>';
}

function renderClientEditor() {
  const host = $("#clientEditor"); if (!host) return;
  const c = state.clients.find((x) => x.id === ui.clientId);
  if (!c) { host.innerHTML = '<div class="panel"><div class="empty">Pick a client on the left, or add a new one.</div></div>'; return; }
  const st = clientStats(c), wa = waLink(c.phone);
  host.innerHTML = `
    <div class="panel">
      <div class="toolbar"><h3>${esc(c.name || "New client")}</h3><span class="spacer"></span>
        ${wa ? `<a class="btn small primary" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>` : '<span class="muted">Add a phone number for WhatsApp</span>'}
        <button class="btn small" data-cact="estimate">Estimate</button>
        <button class="btn small" data-cact="invoice">New invoice</button>
        <button class="btn small quiet" data-cact="del">Delete</button></div>
      <div class="fields">
        <div class="f wide"><label for="cl-name">Name or company</label><input id="cl-name" data-c="name" data-old="${esc(c.name)}" value="${esc(c.name)}"></div>
        <div class="f"><label for="cl-phone">Phone or WhatsApp</label><input id="cl-phone" data-c="phone" value="${esc(c.phone)}" placeholder="077 123 4567"></div>
        <div class="f"><label for="cl-email">Email</label><input id="cl-email" data-c="email" value="${esc(c.email)}" placeholder="name@company.com"></div>
        <div class="f wide"><label for="cl-notes">Notes</label><textarea id="cl-notes" data-c="notes" placeholder="Preferences, how they like to be contacted, payment habits…">${esc(c.notes)}</textarea></div>
      </div>
      <div class="list"><h4 class="grp">Projects</h4>
        ${st.projects.map((p) => `<button class="row" data-cproj="${esc(p.id)}"><span class="a">${esc(p.title || "Untitled project")}</span><span class="r"><span class="pill">${esc(statusLabel(p.status))}</span></span><span class="b">${esc(fmtDate(p.due))}</span><span class="r b mono">${esc(money(p.value))}</span></button>`).join("") || '<div class="empty">No projects yet.</div>'}
        <h4 class="grp">Quotes and invoices</h4>
        ${st.docs.map((d) => `<button class="row" data-cdoc="${esc(d.id)}"><span class="a mono">${esc(docNo(d.kind, d.no))}</span><span class="r">${invStatusPill(d)}</span><span class="b">${esc(fmtDate(d.date))}</span><span class="r b mono">${esc(dm(d, invGrand(d)))}</span></button>`).join("") || '<div class="empty">None yet.</div>'}
      </div>
    </div>`;
}

function renderClients() { renderClientRows(); renderClientEditor(); }

function wireClients() {
  const pane = $("#pane-clients");
  const cur = () => state.clients.find((x) => x.id === ui.clientId);
  pane.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "newClient") {
      const c = { id: uid(), name: "", phone: "", email: "", notes: "" };
      state.clients.push(c); ui.clientId = c.id; save(); renderClients();
      const n = $("#cl-name"); if (n) n.focus(); return;
    }
    if (b.id === "importClients") {
      unlistedNames().forEach((n) => state.clients.push({ id: uid(), name: n, phone: "", email: "", notes: "" }));
      save(); renderClients(); renderClientList(); toast("Client names saved"); return;
    }
    if (b.dataset.client) { ui.clientId = b.dataset.client; renderClients(); return; }
    if (b.dataset.cproj) { switchTab("pipeline"); openProject(b.dataset.cproj); return; }
    if (b.dataset.cdoc) { switchTab("invoices"); openInvoice(b.dataset.cdoc); return; }
    const c = cur(); const a = b.dataset.cact; if (!c || !a) return;
    if (a === "estimate") {
      state.estimate.client = c.name; save(); switchTab("estimate");
      const el = $("#estClient"); if (el) el.value = c.name;
    }
    if (a === "invoice") createDoc("invoice", { client: c.name, currency: state.settings.currency });
    if (a === "del") {
      if (b.dataset.sure) { state.clients = state.clients.filter((x) => x.id !== c.id); ui.clientId = null; save(); renderClients(); renderClientList(); toast("Client deleted"); }
      else { b.dataset.sure = "1"; b.textContent = "Tap again to delete"; }
    }
  });
  pane.addEventListener("input", (e) => {
    const t = e.target; const c = cur(); if (!c || !t.dataset.c) return;
    c[t.dataset.c] = t.value; save();
    if (t.dataset.c === "name") { const h = $("#clientEditor h3"); if (h) h.textContent = c.name || "New client"; renderClientRows(); renderClientList(); }
  });
  pane.addEventListener("change", (e) => {
    const t = e.target; const c = cur(); if (!c || !t.dataset.c) return;
    if (t.dataset.c === "name") {
      const old = (t.dataset.old || "").trim(), nw = c.name.trim();
      if (old && nw && !sameName(old, nw)) {
        state.projects.forEach((p) => { if (sameName(p.client, old)) p.client = nw; });
        state.invoices.forEach((i) => { if (sameName(i.client, old)) i.client = nw; });
        if (sameName(state.estimate.client, old)) { state.estimate.client = nw; const el = $("#estClient"); if (el) el.value = nw; }
      }
      t.dataset.old = nw;
    }
    save(); renderClientEditor(); renderClientRows(); renderClientList();
  });
}
