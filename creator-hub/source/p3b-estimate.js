/* ---------- estimate pane: services and packages, local (LKR) or international (USD) ---------- */
const isIntl = () => state.estimate.market === "intl";
const curNow = () => (isIntl() ? "USD" : state.settings.currency || "LKR");
const priceOf = (s) => (isIntl() ? num(s.usd) : num(s.rate));
const mny = (n, d = 0) => money(n, d, curNow());
const discNow = () => num(isIntl() ? state.estimate.discountUsd : state.estimate.discount);
const estQty = () => state.estimate.qty;
const svcById = (id) => state.settings.services.find((s) => s.id === id);
function estLines() {
  return Object.entries(estQty()).map(([id, q]) => ({ s: svcById(id), q })).filter((l) => l.s && l.q > 0);
}
const estSubtotal = () => estLines().reduce((t, l) => t + l.q * priceOf(l.s), 0);
const estTotal = () => Math.max(0, estSubtotal() - discNow());
const lineDesc = (s) => (s.pkg && s.inc ? s.name + " — " + s.inc.join(", ") : s.name);
function separateTotal(s) {
  return (s.lines || []).reduce((t, [n, q]) => { const x = state.settings.services.find((v) => v.name === n); return t + (x ? q * priceOf(x) : 0); }, 0);
}

const LOCAL_NOTE = `<summary>Local market check (Sri Lanka)</summary><ul class="refs">
  <li>Static post LKR 8,500, or LKR 30,000 for five. Carousel LKR 5,500 per slide. <a href="https://www.echtsocial.com/post/social-media-post-design-marketing-prices-in-sri-lanka" target="_blank" rel="noopener">Echt Social</a></li>
  <li>Logo packages LKR 20,000–40,000. <a href="https://graphics.lk/pricing/logo-design-packages-in-sri-lanka/" target="_blank" rel="noopener">Graphics.lk</a>. Freelance logos LKR 10,000–50,000. <a href="https://lankawebsites.com/blog/freelancing/graphic-design-freelancing-in-sri-lanka-from-canva-to-professional-projects-rates" target="_blank" rel="noopener">Lankawebsites</a></li>
  <li>Drone, 3 hours, LKR 30,000 (2024 price). <a href="https://dronephotography.lk/drone-photography-pricing/" target="_blank" rel="noopener">Dronephotography.lk</a></li>
  <li>Sri Lankan designer day rates LKR 25,000–53,000+. <a href="https://twine.net/find/designers/lk" target="_blank" rel="noopener">Twine</a></li>
  <li class="muted">Checked 25 Oct 2026. Few local studios publish prices, so treat these as a guide.</li></ul>`;
const INTL_NOTE = `<summary>Marketplace price check (international)</summary><ul class="refs">
  <li>Canva post packs on Fiverr: $55 for 5 designs, $75 for 5 plus 2 carousels (one seller). <a href="https://fiverr.com/pmrockey/create-your-canva-posts" target="_blank" rel="noopener">Fiverr</a></li>
  <li>Logos on Fiverr range from $5 up to a few hundred dollars. 99designs logo contests: $249–$1,050. <a href="https://ddiy.co/99designs-pricing/" target="_blank" rel="noopener">99designs pricing</a></li>
  <li>Brand identity gigs start at $10 (stationery), $75 (logo and kit), up to $795 for vetted pros. <a href="https://block.fiverr.com/gigs/corporate-identity" target="_blank" rel="noopener">Fiverr</a></li>
  <li>Video editing averages about $102 per project. <a href="https://block.fiverr.com/hire/music-video-editing" target="_blank" rel="noopener">Fiverr</a></li>
  <li>Freelance motion graphics $500–$2,000 per project. <a href="https://advids.co/pricing/how-much-motion-graphics-video-creation-cost" target="_blank" rel="noopener">Advids</a></li>
  <li>A Sri Lankan studio sells motion videos at $80–$290 and AI videos at $65–$550 to overseas clients. <a href="https://www.xuraglobal.com/video-production-pricing-srilanka/" target="_blank" rel="noopener">Xura Global</a></li>
  <li>Product photo editing on Fiverr: $5–$50 per image. <a href="https://fash.com/costs/photo-editing-cost" target="_blank" rel="noopener">Fash</a></li>
  <li class="muted">Checked 25 Oct 2026. Your USD prices are set from these points, or from your LKR rate converted at 332 where no data was found. Edit any of them in Settings.</li></ul>`;

function buildEstimate() {
  $("#pane-estimate").innerHTML = `
    <div class="bar">
      <div><h2>Estimate a job</h2><p class="sub" id="estSub"></p></div>
      <div class="actions">
        <div class="seg" id="mktSeg" role="group" aria-label="Price list">
          <button data-mkt="local">Local · LKR</button><button data-mkt="intl">International · USD</button></div>
        <button class="btn" id="priceListBtn">Price list PDF</button>
      </div>
    </div>
    <div class="est">
      <div class="est-main">
        <div class="panel" id="briefBox" hidden>
          <div class="f wide"><label for="briefText">Describe the job and get suggestions (optional)</label>
            <textarea id="briefText" placeholder="e.g. A cafe needs a logo, 10 Instagram posts and a 30 second promo video"></textarea></div>
          <div class="toolbar"><button class="btn small primary" id="briefGo">Suggest services</button><span class="muted" id="briefMsg"></span></div>
          <div id="briefWhy"></div>
        </div>
        <div class="seg wide" id="viewSeg" role="group" aria-label="What to show">
          <button data-view="services">Services</button><button data-view="packages">Packages</button></div>
        <details class="note" id="marketNote"></details>
        <div id="svcTools">
          <div class="searchrow"><label class="sr" for="svcSearch">Search services</label>
            <input id="svcSearch" type="search" placeholder="Search services, e.g. logo, drone, carousel"></div>
          <div class="chips" id="catChips" role="group" aria-label="Category"></div>
        </div>
        <div id="catalog"></div>
      </div>
      <aside class="est-side" id="estPanel">
        <div class="panel">
          <h3>Your estimate <span class="pill intl" id="estCurPill" hidden>USD</span></h3>
          <div class="f"><label for="estClient">Client</label><input id="estClient" list="clientList" placeholder="Client or company" value="${esc(state.estimate.client)}"></div>
          <div id="estLines"></div>
          <div class="f"><label for="estDisc" id="estDiscLabel">Discount</label><input id="estDisc" type="number" min="0" step="any" placeholder="0"></div>
          <div class="totals" id="estTotals"></div>
          <div class="toolbar">
            <button class="btn primary" data-est="quote">Make quote</button>
            <button class="btn" data-est="invoice">Make invoice</button>
            <button class="btn quiet" data-est="clear">Clear</button>
          </div>
        </div>
      </aside>
    </div>
    <div class="estbar" id="estBar" hidden>
      <div><div class="k">Estimate</div><div class="v mono" id="estBarTotal"></div></div>
      <button class="btn primary" id="estReview">Review</button>
    </div>`;
  renderChips();
  window.claude && window.claude.use && window.claude.use("sample")
    .then((s) => { if (s) $("#briefBox").hidden = false; }).catch(() => {});
}

function renderChips() {
  const cats = ["all", ...RATE_CARD.map((c) => c[0])];
  const extra = [...new Set(state.settings.services.filter((s) => !s.pkg).map((s) => s.cat).filter((c) => c && !cats.includes(c)))];
  $("#catChips").innerHTML = [...cats, ...extra].map((c) =>
    `<button class="chip" data-cat="${esc(c)}" aria-pressed="${ui.cat === c}">${c === "all" ? "All" : esc(c)}</button>`).join("");
}

function stepper(id, q) {
  return q > 0
    ? `<div class="step"><button data-q="-1" data-id="${esc(id)}" aria-label="Remove one">−</button><span class="mono">${q}</span><button data-q="1" data-id="${esc(id)}" aria-label="Add one">+</button></div>`
    : `<button class="btn small" data-q="1" data-id="${esc(id)}">Add</button>`;
}

function renderCatalog() {
  const host = $("#catalog");
  if (ui.view === "packages") {
    const pk = state.settings.services.filter((s) => s.pkg);
    host.innerHTML = '<div class="pkgrid">' + pk.map((s) => {
      const sep = separateTotal(s), price = priceOf(s), on = estQty()[s.id] > 0;
      const save = sep > price ? Math.round((1 - price / sep) * 100) : 0;
      return `<article class="pkg ${on ? "on" : ""}">
        <header><h3>${esc(s.name)}</h3><div class="pk-price mono">${esc(mny(price))}</div></header>
        <ul>${(s.inc || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        ${save ? `<div class="pk-save">Bought separately ${esc(mny(sep))}. Saves ${save}%.</div>` : ""}
        <div class="pk-ref">${esc((isIntl() ? s.refIntl : s.refLocal) || "")}</div>
        <div class="sctl">${stepper(s.id, estQty()[s.id] || 0)}</div></article>`;
    }).join("") + "</div>";
    return;
  }
  const q = ui.q.trim().toLowerCase();
  const list = state.settings.services.filter((s) => !s.pkg &&
    (ui.cat === "all" || s.cat === ui.cat) && (!q || s.name.toLowerCase().includes(q) || (s.cat || "").toLowerCase().includes(q)));
  const groups = {};
  list.forEach((s) => { (groups[s.cat || "Other"] = groups[s.cat || "Other"] || []).push(s); });
  host.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <section class="cat"><h3>${esc(cat)}</h3>
      ${items.map((s) => `<div class="srow ${estQty()[s.id] > 0 ? "on" : ""}">
        <div class="sname">${esc(s.name)}${s.note ? `<small>${esc(s.note)}</small>` : ""}</div>
        <div class="sprice mono">${esc(mny(priceOf(s)))}</div>
        <div class="sctl">${stepper(s.id, estQty()[s.id] || 0)}</div></div>`).join("")}
    </section>`).join("") || '<div class="empty">No services match. Try a different word or category.</div>';
}

function applyMode() {
  const intl = isIntl();
  $("#pane-estimate").classList.toggle("intl", intl);
  $("#estBar").classList.toggle("intl", intl);
  $("#estCurPill").hidden = !intl;
  document.querySelectorAll("#mktSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mkt === state.estimate.market)));
  document.querySelectorAll("#viewSeg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === ui.view)));
  $("#estSub").textContent = intl
    ? "International prices in USD for clients abroad, like marketplace buyers. Shown in light blue."
    : "Tap what the client needs. The total updates as you go.";
  if (ui.noteMkt !== state.estimate.market) { $("#marketNote").innerHTML = intl ? INTL_NOTE : LOCAL_NOTE; ui.noteMkt = state.estimate.market; }
  $("#svcTools").hidden = ui.view !== "services";
  $("#estDiscLabel").textContent = "Discount (" + curNow() + ")";
  const d = discNow(); const inp = $("#estDisc");
  if (document.activeElement !== inp) inp.value = d || "";
}

function renderEstimate() {
  if (!$("#estBar")) return;
  applyMode();
  renderCatalog();
  const lines = estLines();
  $("#estLines").innerHTML = lines.length ? lines.map((l) => `
    <div class="eline"><div class="en">${esc(l.s.name)}</div>
      <div class="ec">${stepper(l.s.id, l.q)}<span class="mono">${esc(mny(l.q * priceOf(l.s)))}</span></div></div>`).join("")
    : '<div class="empty">Nothing added yet. Pick services or a package.</div>';
  const d = discNow();
  $("#estTotals").innerHTML = `<span>Subtotal</span><span class="mono">${esc(mny(estSubtotal()))}</span>
    ${d ? `<span>Discount</span><span class="mono">−${esc(mny(d))}</span>` : ""}
    <span class="grand">Total</span><span class="grand mono">${esc(mny(estTotal()))}</span>`;
  const bar = $("#estBar");
  bar.hidden = !lines.length || ui.tab !== "estimate";
  $("#estBarTotal").textContent = mny(estTotal());
  document.body.classList.toggle("has-bar", !bar.hidden);
}

const estToItems = () => estLines().map((l) => ({ desc: lineDesc(l.s), qty: l.q, rate: priceOf(l.s) }));

async function suggestServices() {
  const text = $("#briefText").value.trim();
  const msg = $("#briefMsg"); const why = $("#briefWhy");
  if (!text) { msg.textContent = "Write a short description first."; return; }
  let sample = null;
  try { sample = await window.claude.use("sample"); } catch (e) { sample = null; }
  if (!sample) { msg.textContent = "Suggestions are not available in this view."; return; }
  const catalog = state.settings.services.map((s) => `${s.id} | ${s.name}${s.pkg ? " (package)" : ""} | ${curNow()} ${priceOf(s)}`).join("\n");
  msg.textContent = "Thinking…"; $("#briefGo").disabled = true;
  try {
    const out = await sample.json(
      `You help a creative studio price a job from its rate card. Pick the services or packages that fit this client brief.\n\nBRIEF:\n${text}\n\nRATE CARD (id | name | price):\n${catalog}\n\nReturn ONLY a JSON array, at most 10 items, each {"id": string from the rate card, "qty": whole number 1-50, "reason": short sentence}. Use only ids from the rate card. Prefer a package when it covers most of the brief, and do not also add the items it already contains. Pick the closest tier (for example video length). Do not invent services.`,
      { modelTier: "quick" });
    const picks = (Array.isArray(out) ? out : []).filter((p) => p && svcById(p.id));
    if (!picks.length) { msg.textContent = "No match found. Try adding more detail."; }
    else {
      picks.forEach((p) => { estQty()[p.id] = Math.min(50, Math.max(1, Math.round(num(p.qty)) || 1)); });
      save(); renderEstimate();
      why.innerHTML = '<ul class="why">' + picks.map((p) => `<li><b>${esc(svcById(p.id).name)}</b> — ${esc(p.reason || "")}</li>`).join("") + "</ul>";
      msg.textContent = "Added to your estimate. Adjust anything you like.";
    }
  } catch (e) {
    msg.textContent = e && e.code === "not_granted" ? "Suggestions need your permission to run." : "Could not get suggestions. Pick services by hand.";
  }
  $("#briefGo").disabled = false;
}

function wireEstimate() {
  const pane = $("#pane-estimate");
  pane.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "priceListBtn") return savePriceList();
    if (b.dataset.mkt) { state.estimate.market = b.dataset.mkt; save(); renderEstimate(); return; }
    if (b.dataset.view) { ui.view = b.dataset.view; renderEstimate(); return; }
    if (b.dataset.q) {
      const id = b.dataset.id; const n = Math.max(0, (estQty()[id] || 0) + (+b.dataset.q));
      if (n) estQty()[id] = n; else delete estQty()[id];
      save(); renderEstimate(); return;
    }
    if (b.dataset.cat) { ui.cat = b.dataset.cat; renderChips(); renderCatalog(); return; }
    if (b.id === "briefGo") return suggestServices();
    if (b.id === "estReview") return $("#estPanel").scrollIntoView({ behavior: "smooth", block: "start" });
    const a = b.dataset.est; if (!a) return;
    if (a === "clear") {
      state.estimate = Object.assign(newEstimate(), { market: state.estimate.market }); save();
      $("#estClient").value = ""; $("#briefWhy").innerHTML = ""; renderEstimate(); return;
    }
    if (!estLines().length) { toast("Add at least one service first."); return; }
    createDoc(a, { client: state.estimate.client, items: estToItems(), discount: discNow(), currency: curNow() });
    toast(a === "quote" ? "Quote created. You can still edit it." : "Invoice created. You can still edit it.");
  });
  pane.addEventListener("input", (e) => {
    const t = e.target;
    if (t.id === "svcSearch") { ui.q = t.value; renderCatalog(); }
    if (t.id === "estClient") { state.estimate.client = t.value; save(); }
    if (t.id === "estDisc") { state.estimate[isIntl() ? "discountUsd" : "discount"] = num(t.value); save(); renderEstimate(); }
  });
}
