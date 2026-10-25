/* ---------- core: helpers, state, storage ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const isoLocal = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const todayISO = () => isoLocal(new Date());
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocal(d); };
const fmtDate = (iso) => {
  if (!iso) return "No date";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};
const num = (v) => { const n = parseFloat(v); return isFinite(n) ? n : 0; };

const STATUSES = [
  ["inquiry", "Inquiry"], ["quoted", "Quoted"], ["shooting", "Shooting"],
  ["editing", "Editing"], ["delivered", "Delivered"], ["paid", "Paid"],
];
const statusLabel = (id) => (STATUSES.find((s) => s[0] === id) || [0, id])[1];

let state = null;          // the whole app record
let ui = { tab: "estimate", cat: "all", q: "", view: "services", projectId: null, invoiceId: null, kind: "all" };
let store = { mode: "none", doc: null, lastJson: "", busy: false, again: false, timer: 0 };

const money = (n, d = 0, cur) => {
  cur = cur || state.settings.currency || "LKR";
  return cur + " " + num(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
};
const curOf = (inv) => inv.currency || state.settings.currency || "LKR";
const dm = (inv, n, d = 0) => money(n, d, curOf(inv));
const invTotal = (inv) => (inv.items || []).reduce((t, it) => t + num(it.qty) * num(it.rate), 0);
const invTax = (inv) => invTotal(inv) * (num(inv.taxPct) / 100);
const invGrand = (inv) => invTotal(inv) + invTax(inv) - num(inv.discount);
const invPaid = (inv) => (inv.payments || []).reduce((t, p) => t + num(p.amount), 0);
const invBal = (inv) => (inv.status === "paid" ? 0 : Math.max(0, invGrand(inv) - invPaid(inv)));
const isOverdue = (inv) => inv.kind === "invoice" && inv.status === "sent" && inv.due && inv.due < todayISO() && invBal(inv) > 0;
const docNo = (kind, n) => (kind === "quote" ? "QUO-" : "INV-") + String(n).padStart(4, "0");

/* ---------- storage: shared db when available, browser storage as fallback ---------- */
const LS_KEY = "creator-hub-v1";
function lsRead() { try { const v = localStorage.getItem(LS_KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
function lsWrite(json) { try { localStorage.setItem(LS_KEY, json); } catch (e) { /* storage may be blocked */ } }

function setNote(text) { const n = $("#syncNote"); if (n) n.textContent = text; }

function adopt(data) {
  if (!data || !data.settings) return false;
  state = data;
  if (!Array.isArray(state.projects)) state.projects = [];
  if (!Array.isArray(state.invoices)) state.invoices = [];
  if (!Array.isArray(state.settings.services)) state.settings.services = [];
  if (!state.settings.rateCardV) {
    state.settings.services = rateCardServices();
    if (!state.settings.brand || state.settings.brand === "Your Studio Name") state.settings.brand = "Artslab Creatives";
    state.settings.rateCardV = 2;
  } else if (state.settings.rateCardV < 2) {
    state.settings.services = mergeRateCard(state.settings.services); state.settings.rateCardV = 2;
  }
  state.estimate = Object.assign(newEstimate(), state.estimate || {});
  if (!state.estimate.qty) state.estimate.qty = {};
  const S = state.settings;
  if (S.paymentInfo == null) S.paymentInfo = "";
  if (S.depositPct == null) S.depositPct = 50;
  if (!S.validUntil) S.validUntil = "31 Dec 2026";
  if (!Array.isArray(state.clients)) state.clients = [];
  if (!Array.isArray(state.posts)) state.posts = [];
  return true;
}

async function initStore() {
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (e) { db = null; }
  if (db) {
    try {
      store.mode = "db";
      store.doc = db.doc("hub/state");
      await new Promise((resolve) => {
        let first = true;
        store.doc.onSnapshot((snap) => {
          const d = snap.exists ? snap.data() : null;
          const incoming = d && d.json ? d.json : "";
          if (first) {
            first = false;
            if (incoming) { try { adopt(JSON.parse(incoming)); store.lastJson = incoming; } catch (e) { /* ignore bad data */ } }
            resolve();
          } else if (incoming && incoming !== store.lastJson && !snap.metadata.hasPendingWrites && !store.busy && !store.dirty) {
            try { adopt(JSON.parse(incoming)); store.lastJson = incoming; renderAll(); } catch (e) { /* ignore */ }
          }
        }, () => { store.mode = "local"; if (first) { first = false; resolve(); } });
      });
      setNote("Saved to your account. Open this page on any device to see the same data.");
    } catch (e) { store.mode = "local"; }
  }
  if (store.mode !== "db") {
    store.mode = "local";
    const saved = lsRead();
    if (saved) adopt(saved);
    setNote(window.claude ? "Saved in this browser only. Sign in to claude.ai to keep it across devices." : "Saved on this device only. Use Settings > Save backup.");
  }
  if (!state) state = exampleState();
}

function save() {
  clearTimeout(store.timer);
  store.dirty = true;
  store.timer = setTimeout(flush, 350);
}
async function flush() {
  store.dirty = false;
  if (store.busy) { store.again = true; return; }
  store.busy = true;
  const json = JSON.stringify(state);
  try {
    lsWrite(json);
    if (store.mode === "db" && store.doc) { await store.doc.set({ json }); store.lastJson = json; }
  } catch (e) {
    setNote("Could not save to your account. Changes are kept in this browser.");
  }
  store.busy = false;
  if (store.again) { store.again = false; flush(); }
}

let toastTimer = 0;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}
