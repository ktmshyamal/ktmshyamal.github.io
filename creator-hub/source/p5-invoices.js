/* ---------- invoices & quotes pane ---------- */
function buildInvoices() {
  $("#pane-invoices").innerHTML = `
    <div class="bar">
      <div><h2>Invoices &amp; quotes</h2><p class="sub">Build a document, save it as a PDF, track who has paid.</p></div>
      <div class="actions">
        <button class="btn" id="newQuote">New quote</button>
        <button class="btn primary" id="newInvoice">New invoice</button>
      </div>
    </div>
    <div class="split">
      <div>
        <div class="toolbar" style="margin-bottom:8px">
          <label class="sr" for="kindFilter" style="position:absolute;left:-9999px">Show</label>
          <select id="kindFilter" class="btn">
            <option value="all">All documents</option><option value="invoice">Invoices</option><option value="quote">Quotes</option>
          </select>
        </div>
        <div class="list" id="invList"></div>
      </div>
      <div id="invEditor"></div>
    </div>`;
}

function invStatusPill(inv) {
  if (isOverdue(inv)) return '<span class="pill bad">Overdue</span>';
  if (inv.kind === "invoice" && inv.status !== "paid" && invPaid(inv) > 0) return '<span class="pill warn">Part paid</span>';
  const map = { draft: ["", "Draft"], sent: ["info", "Sent"], paid: ["good", "Paid"] };
  const m = map[inv.status] || ["", inv.status];
  if (inv.kind === "quote" && inv.status === "paid") return '<span class="pill good">Accepted</span>';
  return `<span class="pill ${m[0]}">${esc(m[1])}</span>`;
}

function renderInvList() {
  const docs = state.invoices
    .filter((i) => ui.kind === "all" || i.kind === ui.kind)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.no - a.no);
  $("#invList").innerHTML = docs.map((i) => `
    <button class="row" data-inv="${esc(i.id)}" ${ui.invoiceId === i.id ? 'aria-current="true"' : ""}>
      <span class="a">${esc(i.client || "No client")}</span><span class="r mono">${esc(dm(i, invGrand(i)))}</span>
      <span class="b mono">${esc(docNo(i.kind, i.no))} · ${esc(fmtDate(i.date))}${curOf(i) === "USD" ? ' <span class="pill intl">USD</span>' : ""}</span><span class="r">${invStatusPill(i)}</span>
    </button>`).join("") || '<div class="empty">No documents yet. Start with New invoice or New quote.</div>';
  const open = state.invoices.filter((i) => i.kind === "invoice" && i.status !== "paid").length;
  $("#cnt-invoices").textContent = open || "";
}

function createDoc(kind, seed = {}) {
  const s = state.settings;
  const no = kind === "quote" ? s.nextQuo++ : s.nextInv++;
  const doc = {
    id: uid(), kind, no, status: "draft", client: seed.client || "", email: (clientByName(seed.client) || {}).email || "", date: todayISO(),
    due: addDays(kind === "quote" ? 14 : 14), taxPct: 0, discount: num(seed.discount), notes: s.terms || "",
    items: seed.items && seed.items.length ? seed.items : [{ desc: "", qty: 1, rate: 0 }], projectId: seed.projectId || "", currency: seed.currency || s.currency || "LKR",
  };
  state.invoices.push(doc);
  save();
  switchTab("invoices");
  openInvoice(doc.id);
}

function openInvoice(id) {
  ui.invoiceId = id;
  renderInvList();
  renderInvEditor();
  const host = $("#invEditor");
  if (host.firstElementChild && window.innerWidth < 760) host.scrollIntoView({ block: "start", behavior: "smooth" });
}

function itemRows(inv) {
  return inv.items.map((it, i) => `
    <tr data-i="${i}">
      <td><input aria-label="Description" data-it="desc" value="${esc(it.desc)}" placeholder="What you did"></td>
      <td><input class="q" aria-label="Quantity" type="number" min="0" step="any" data-it="qty" value="${esc(it.qty)}"></td>
      <td><input class="p" aria-label="Rate" type="number" min="0" step="any" data-it="rate" value="${esc(it.rate)}"></td>
      <td class="tot mono" data-line>${esc(num(it.qty * it.rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}</td>
      <td><button class="btn small quiet" data-act="delItem" data-i="${i}" aria-label="Remove line">✕</button></td>
    </tr>`).join("");
}

function totalsHtml(inv) {
  const d = 2;
  return `<span>Subtotal</span><span class="mono">${esc(dm(inv, invTotal(inv), d))}</span>
    ${num(inv.taxPct) ? `<span>Tax (${esc(inv.taxPct)}%)</span><span class="mono">${esc(dm(inv, invTax(inv), d))}</span>` : ""}
    ${num(inv.discount) ? `<span>Discount</span><span class="mono">−${esc(dm(inv, inv.discount, d))}</span>` : ""}
    <span class="grand">Total</span><span class="grand mono">${esc(dm(inv, invGrand(inv), d))}</span>${inv.kind === "invoice" && invPaid(inv) > 0 ? `<span>Paid</span><span class="mono">−${esc(dm(inv, invPaid(inv), d))}</span><span class="grand">Balance due</span><span class="grand mono">${esc(dm(inv, invBal(inv), d))}</span>` : ""}`;
}

function renderInvEditor() {
  const host = $("#invEditor");
  const inv = state.invoices.find((x) => x.id === ui.invoiceId);
  if (!inv) { host.innerHTML = '<div class="panel"><div class="empty">Pick a document on the left, or create a new one.</div></div>'; return; }
  const q = inv.kind === "quote";
  host.innerHTML = `
    <div class="panel">
      <div class="toolbar">
        <h3 class="mono">${esc(docNo(inv.kind, inv.no))}</h3>${invStatusPill(inv)}<span class="spacer"></span>
        <button class="btn small primary" data-act="pdf">Save PDF</button>
        <button class="btn small" data-act="copy">Copy text</button>
        ${q && inv.status !== "paid" ? '<button class="btn small" data-act="toInvoice">Turn into invoice</button>' : ""}
        <button class="btn small quiet" data-act="delInv">Delete</button>
      </div>
      <div class="fields">
        <div class="f"><label for="if-client">Bill to</label><input id="if-client" list="clientList" data-f="client" value="${esc(inv.client)}" placeholder="Client name"></div>
        <div class="f"><label for="if-email">Client email</label><input id="if-email" data-f="email" value="${esc(inv.email)}" placeholder="name@company.com"></div>
        <div class="f"><label for="if-status">Status</label><select id="if-status" data-f="status">
          <option value="draft" ${inv.status === "draft" ? "selected" : ""}>Draft</option>
          <option value="sent" ${inv.status === "sent" ? "selected" : ""}>Sent</option>
          <option value="paid" ${inv.status === "paid" ? "selected" : ""}>${q ? "Accepted" : "Paid"}</option></select></div>
        <div class="f"><label for="if-date">Date</label><input id="if-date" type="date" data-f="date" value="${esc(inv.date)}"></div>
        <div class="f"><label for="if-due">${q ? "Valid until" : "Due date"}</label><input id="if-due" type="date" data-f="due" value="${esc(inv.due)}"></div>
      </div>
      <div class="tablewrap"><table class="items"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th style="text-align:right">Amount</th><th></th></tr></thead>
        <tbody id="itemBody">${itemRows(inv)}</tbody></table></div>
      <div class="toolbar">
        <button class="btn small" data-act="addItem">Add line</button>
        <select class="btn small" id="svcPick" aria-label="Add a saved service">
          <option value="">Add saved service…</option>
          ${[...new Set(state.settings.services.map((s) => s.cat || "Other"))].map((c) => `<optgroup label="${esc(c)}">${state.settings.services.filter((s) => (s.cat || "Other") === c).map((s) => `<option value="${esc(s.id)}">${esc(s.name)} · ${esc(curOf(inv) === "USD" ? s.usd : s.rate)}</option>`).join("")}</optgroup>`).join("")}
        </select>
      </div>
      <div class="fields">
        <div class="f"><label for="if-tax">Tax %</label><input id="if-tax" type="number" min="0" step="any" data-f="taxPct" value="${esc(inv.taxPct)}"></div>
        <div class="f"><label for="if-disc">Discount (${esc(curOf(inv))})</label><input id="if-disc" type="number" min="0" step="any" data-f="discount" value="${esc(inv.discount)}"></div>
        <div class="f wide"><label for="if-notes">Notes and terms</label><textarea id="if-notes" data-f="notes">${esc(inv.notes)}</textarea></div>
      </div>
      <div class="totals" id="totals">${totalsHtml(inv)}</div>
      <div id="payBox"></div>
    </div>`;
  renderPayBox(inv);
}

function refreshTotals(inv) {
  $("#totals").innerHTML = totalsHtml(inv);
  renderPayBox(inv);
  renderInvList(); renderPipeline();
}

function docText(inv) {
  const s = state.settings;
  const lines = [`${inv.kind === "quote" ? "QUOTE" : "INVOICE"} ${docNo(inv.kind, inv.no)}`, s.brand, "", `Bill to: ${inv.client}`, `Date: ${fmtDate(inv.date)}`, `${inv.kind === "quote" ? "Valid until" : "Due"}: ${fmtDate(inv.due)}`, ""];
  inv.items.forEach((it) => lines.push(`${it.desc} — ${it.qty} × ${it.rate} = ${(num(it.qty) * num(it.rate)).toFixed(2)}`));
  lines.push("", `Total: ${dm(inv, invGrand(inv), 2)}`);
  if (inv.kind === "invoice" && invPaid(inv) > 0) lines.push(`Paid: ${dm(inv, invPaid(inv), 2)}`, `Balance due: ${dm(inv, invBal(inv), 2)}`);
  if (s.paymentInfo) lines.push("", "Payment details:", s.paymentInfo);
  if (inv.notes) lines.push("", inv.notes);
  return lines.join("\n");
}

function wireInvoices() {
  const pane = $("#pane-invoices");
  const cur = () => state.invoices.find((x) => x.id === ui.invoiceId);
  pane.addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "newInvoice") return createDoc("invoice");
    if (b.id === "newQuote") return createDoc("quote");
    if (b.dataset.inv) return openInvoice(b.dataset.inv);
    const inv = cur(); const act = b.dataset.act; if (!inv || !act) return;
    if (act === "addItem") { inv.items.push({ desc: "", qty: 1, rate: 0 }); save(); $("#itemBody").innerHTML = itemRows(inv); refreshTotals(inv); }
    if (act === "delItem") {
      inv.items.splice(+b.dataset.i, 1); if (!inv.items.length) inv.items.push({ desc: "", qty: 1, rate: 0 });
      save(); $("#itemBody").innerHTML = itemRows(inv); refreshTotals(inv);
    }
    if (act === "delInv") {
      if (b.dataset.sure) { state.invoices = state.invoices.filter((x) => x.id !== inv.id); ui.invoiceId = null; save(); renderInvList(); renderInvEditor(); renderPipeline(); toast("Deleted"); }
      else { b.dataset.sure = "1"; b.textContent = "Tap again to delete"; }
    }
    if (act === "copy") {
      try { await navigator.clipboard.writeText(docText(inv)); toast("Copied to clipboard"); }
      catch (err) { toast("Copy was blocked here. Use Save PDF instead."); }
    }
    if (act === "toInvoice") {
      createDoc("invoice", { client: inv.client, items: JSON.parse(JSON.stringify(inv.items)), projectId: inv.projectId, currency: curOf(inv) });
      const n = cur(); if (n) { n.discount = inv.discount; n.taxPct = inv.taxPct; n.email = inv.email; save(); renderInvEditor(); refreshTotals(n); }
      inv.status = "paid"; save(); renderInvList();
    }
    if (act === "pdf") savePdf(inv);
    if (act === "addPay" || act === "deposit") addPayment(inv, act === "deposit");
    if (act === "delPay") { (inv.payments || []).splice(+b.dataset.i, 1); afterPay(inv, true); }
  });
  pane.addEventListener("input", (e) => {
    const inv = cur(); if (!inv) return; const t = e.target;
    if (t.dataset.f) {
      inv[t.dataset.f] = ["taxPct", "discount"].includes(t.dataset.f) ? num(t.value) : t.value; save(); refreshTotals(inv);
      if (t.dataset.f === "client" && !inv.email) { const c = clientByName(inv.client); if (c && c.email) { inv.email = c.email; const em = $("#if-email"); if (em) em.value = c.email; } }
    }
    else if (t.dataset.it) {
      const tr = t.closest("tr"); const it = inv.items[+tr.dataset.i];
      it[t.dataset.it] = t.dataset.it === "desc" ? t.value : num(t.value);
      tr.querySelector("[data-line]").textContent = (num(it.qty) * num(it.rate)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      save(); refreshTotals(inv);
    }
  });
  pane.addEventListener("change", (e) => {
    const t = e.target; const inv = cur();
    if (t.id === "kindFilter") { ui.kind = t.value; renderInvList(); }
    if (t.dataset.f === "status" && inv) { save(); renderInvList(); renderPipeline(); renderInvEditor(); }
    if (t.id === "svcPick" && inv && t.value) {
      const s = state.settings.services.find((x) => x.id === t.value);
      if (s) {
        const empty = inv.items.length === 1 && !inv.items[0].desc && !num(inv.items[0].rate);
        const line = { desc: s.pkg && s.inc ? s.name + " — " + s.inc.join(", ") : s.name, qty: 1, rate: num(curOf(inv) === "USD" ? s.usd : s.rate) };
        if (empty) inv.items[0] = line; else inv.items.push(line);
        save(); $("#itemBody").innerHTML = itemRows(inv); refreshTotals(inv); t.value = "";
      }
    }
  });
}
