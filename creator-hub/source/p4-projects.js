/* ---------- projects pane ---------- */
function buildPipeline() {
  $("#pane-pipeline").innerHTML = `
    <div class="bar">
      <div><h2>Projects</h2><p class="sub">Every job from first message to payment.</p></div>
      <div class="actions"><button class="btn primary" id="newProject">New project</button></div>
    </div>
    <div id="followups"></div>
    <div id="exBanner"></div>
    <div class="stats" id="stats"></div>
    <div class="board" id="board" aria-label="Project pipeline"></div>
    <div id="projEditor"></div>`;
}

function renderPipeline() {
  const act = state.projects.filter((p) => ["inquiry", "quoted", "shooting", "editing"].includes(p.status));
  const soon = act.filter((p) => p.due && p.due >= todayISO() && p.due <= addDays(7));
  const owed = state.invoices.filter((i) => i.kind === "invoice" && i.status === "sent");
  const owedBy = {}; owed.forEach((i) => { const c = curOf(i); owedBy[c] = (owedBy[c] || 0) + invBal(i); });
  const owedText = Object.entries(owedBy).map(([c, v]) => money(v, 0, c)).join(" + ") || money(0);
  const late = owed.filter(isOverdue).length;
  $("#stats").innerHTML = `
    <div class="stat"><div class="k">Active jobs</div><div class="v">${act.length}</div></div>
    <div class="stat"><div class="k">In pipeline</div><div class="v">${esc(money(act.reduce((t, p) => t + num(p.value), 0)))}</div></div>
    <div class="stat"><div class="k">Due in 7 days</div><div class="v">${soon.length}</div></div>
    <div class="stat ${late ? "attn" : ""}"><div class="k">${late ? late + " overdue · " : ""}Unpaid</div><div class="v">${esc(owedText)}</div></div>`;
  $("#exBanner").innerHTML = state.examples
    ? `<div class="banner"><span>These are example projects so you can see how it works.</span><button class="btn small" id="clearExamples">Clear examples</button></div>` : "";
  $("#cnt-pipeline").textContent = act.length || "";
  renderFollowUps();

  $("#board").innerHTML = STATUSES.map(([id, label]) => {
    const items = state.projects.filter((p) => p.status === id).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
    const cards = items.map((p) => `
      <button class="card" data-open="${esc(p.id)}" ${ui.projectId === p.id ? 'aria-current="true"' : ""}>
        <span class="t">${esc(p.title || "Untitled project")}</span>
        <span class="c">${esc(p.client || "No client")}</span>
        <span class="m"><span>${esc(fmtDate(p.due))}</span><span class="mono">${esc(money(p.value))}</span></span>
      </button>`).join("");
    return `<div class="col"><header><span>${esc(label)}</span><span class="mono">${items.length}</span></header>${cards || '<div class="empty">Nothing here</div>'}</div>`;
  }).join("");
}

function renderProjectEditor() {
  const host = $("#projEditor");
  const p = state.projects.find((x) => x.id === ui.projectId);
  if (!p) { host.innerHTML = ""; return; }
  const types = [...new Set(state.settings.services.map((s) => s.name))];
  host.innerHTML = `
    <div class="panel">
      <div class="toolbar"><h3>${p.title ? esc(p.title) : "New project"}</h3><span class="spacer"></span>
        <button class="btn small" data-act="mkQuote">Make quote</button>
        <button class="btn small" data-act="mkInvoice">Make invoice</button>
        <button class="btn small quiet" data-act="delProject">Delete</button>
        <button class="btn small" data-act="closeProject">Close</button></div>
      <div class="fields">
        <div class="f wide"><label for="pf-title">Project</label><input id="pf-title" data-f="title" value="${esc(p.title)}" placeholder="e.g. Wedding highlight film"></div>
        <div class="f"><label for="pf-client">Client</label><input id="pf-client" list="clientList" data-f="client" value="${esc(p.client)}" placeholder="Client or company"></div>
        <div class="f"><label for="pf-type">Type of work</label><input id="pf-type" data-f="type" list="typeList" value="${esc(p.type)}" placeholder="Photo shoot, video edit…">
          <datalist id="typeList">${types.map((t) => `<option value="${esc(t)}">`).join("")}</datalist></div>
        <div class="f"><label for="pf-status">Status</label><select id="pf-status" data-f="status">
          ${STATUSES.map(([id, l]) => `<option value="${id}" ${p.status === id ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
        <div class="f"><label for="pf-due">Deadline</label><input id="pf-due" type="date" data-f="due" value="${esc(p.due)}"></div>
        <div class="f"><label for="pf-value">Value (${esc(state.settings.currency)})</label><input id="pf-value" type="number" min="0" step="any" data-f="value" value="${esc(p.value)}"></div>
        <div class="f wide"><label for="pf-notes">Notes</label><textarea id="pf-notes" data-f="notes" placeholder="Locations, shot list, revisions…">${esc(p.notes)}</textarea></div>
      </div>
    </div>`;
}

function openProject(id) {
  ui.projectId = id;
  renderPipeline();
  renderProjectEditor();
  const host = $("#projEditor");
  if (host.firstElementChild) host.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function newProject() {
  const p = { id: uid(), client: "", title: "", type: "", status: "inquiry", due: addDays(14), value: 0, notes: "" };
  state.projects.push(p);
  save();
  openProject(p.id);
  const t = $("#pf-title"); if (t) t.focus();
}

function wirePipeline() {
  const pane = $("#pane-pipeline");
  pane.addEventListener("click", (e) => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.fuCopy !== undefined) {
      const f = (ui.fu || [])[+t.dataset.fuCopy]; if (!f) return;
      navigator.clipboard.writeText(f.msg).then(() => toast("Message copied"), () => toast("Copy was blocked here. Open Message and select the text."));
      return;
    }
    if (t.dataset.fuOpen !== undefined) {
      const f = (ui.fu || [])[+t.dataset.fuOpen]; if (!f) return;
      if (f.doc) { switchTab("invoices"); openInvoice(f.doc); } else if (f.proj) openProject(f.proj);
      return;
    }
    if (t.id === "newProject") return newProject();
    if (t.id === "clearExamples") {
      state = blankState(); save(); ui = { ...ui, projectId: null, invoiceId: null };
      renderAll(); toast("Examples cleared. Your settings were reset too."); return;
    }
    if (t.dataset.open) return openProject(t.dataset.open);
    const p = state.projects.find((x) => x.id === ui.projectId);
    const act = t.dataset.act;
    if (!act || !p) return;
    if (act === "closeProject") { ui.projectId = null; renderPipeline(); renderProjectEditor(); }
    if (act === "delProject") {
      if (t.dataset.sure) {
        state.projects = state.projects.filter((x) => x.id !== p.id);
        ui.projectId = null; save(); renderPipeline(); renderProjectEditor(); toast("Project deleted");
      } else { t.dataset.sure = "1"; t.textContent = "Tap again to delete"; }
    }
    if (act === "mkQuote" || act === "mkInvoice") {
      createDoc(act === "mkQuote" ? "quote" : "invoice", {
        client: p.client, projectId: p.id,
        items: [{ desc: p.title || p.type || "Project", qty: 1, rate: num(p.value) }],
      });
    }
  });
  pane.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.f; if (!f) return;
    const p = state.projects.find((x) => x.id === ui.projectId); if (!p) return;
    p[f] = f === "value" ? num(e.target.value) : e.target.value;
    save(); renderPipeline();
    if (f === "title") { const h = $("#projEditor h3"); if (h) h.textContent = p.title || "New project"; }
  });
}
