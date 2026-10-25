/* ---------- content calendar: posts, shoots, ideas, with client deadlines overlaid ---------- */
const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "LinkedIn", "Other"];
const FORMATS = ["Post", "Carousel", "Reel", "Story", "Video", "Shoot"];
const POST_STATUS = [["idea", "Idea"], ["planned", "Planned"], ["shot", "Shot"], ["edited", "Edited"], ["scheduled", "Scheduled"], ["posted", "Posted"]];
const POST_PILL = { idea: "", planned: "info", shot: "warn", edited: "warn", scheduled: "info", posted: "good" };
const postStatusLabel = (id) => (POST_STATUS.find((s) => s[0] === id) || [0, id])[1];
const monthStart = (iso) => iso.slice(0, 7) + "-01";
const shiftMonth = (iso, k) => isoLocal(new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + k, 1));
const monthLabel = (iso) => new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const activeDeadline = (p) => p.due && p.status !== "paid";

function buildCalendar() {
  ui.calMonth = ui.calMonth || monthStart(todayISO());
  ui.calDay = ui.calDay || todayISO();
  $("#pane-calendar").innerHTML = `
    <div class="bar">
      <div><h2>Content calendar</h2><p class="sub">Plan posts and shoots, and see client deadlines next to them.</p></div>
      <div class="actions"><button class="btn primary" id="newPost">New post</button></div>
    </div>
    <div id="calNudge"></div>
    <div class="stats" id="calStats"></div>
    <div class="cal-head">
      <h3 id="calTitle"></h3>
      <div class="actions"><button class="btn small" id="calPrev" aria-label="Previous month">←</button><button class="btn small" id="calToday">Today</button><button class="btn small" id="calNext" aria-label="Next month">→</button></div>
    </div>
    <div class="cal" id="calGrid" role="grid" aria-label="Month"></div>
    <div id="dayPanel"></div>
    <div id="ideaBox"></div>
    <div id="postEditor"></div>`;
  window.claude && window.claude.use && window.claude.use("sample").then((s) => { ui.hasSample = !!s; renderPostEditor(); }).catch(() => {});
}

const postRow = (p) => `<button class="row" data-post="${esc(p.id)}" ${ui.postId === p.id ? 'aria-current="true"' : ""}>
  <span class="a">${esc(p.title || "Untitled post")}</span><span class="r"><span class="pill ${POST_PILL[p.status] || ""}">${esc(postStatusLabel(p.status))}</span></span>
  <span class="b">${esc(p.platform)} · ${esc(p.format)}${p.client ? " · " + esc(p.client) : ""}</span><span class="r b">${p.date ? esc(fmtDate(p.date)) : "No date"}</span></button>`;

function renderCalendar() {
  if (!$("#calGrid")) return;
  const today = todayISO(), ms = ui.calMonth, y = +ms.slice(0, 4), m = +ms.slice(5, 7) - 1;
  const posts = state.posts, dated = posts.filter((p) => p.date);
  const upcoming = dated.filter((p) => p.date >= today && p.date <= addDays(7) && p.status !== "idea" && p.status !== "posted").length;
  $("#calNudge").innerHTML = upcoming ? "" : '<div class="banner"><span>Nothing planned for the next 7 days. Add a post, or give one of your ideas a date.</span></div>';
  const inMonth = dated.filter((p) => p.date.slice(0, 7) === ms.slice(0, 7));
  $("#calStats").innerHTML = `
    <div class="stat"><div class="k">Planned in ${esc(new Date(y, m, 1).toLocaleDateString("en-GB", { month: "short" }))}</div><div class="v">${inMonth.filter((p) => !["posted", "idea"].includes(p.status)).length}</div></div>
    <div class="stat"><div class="k">Posted</div><div class="v">${inMonth.filter((p) => p.status === "posted").length}</div></div>
    <div class="stat"><div class="k">Ideas waiting</div><div class="v">${posts.filter((p) => p.status === "idea" || !p.date).length}</div></div>`;
  $("#calTitle").textContent = monthLabel(ms);

  const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate(), rows = Math.ceil((offset + days) / 7);
  const byDate = {}, due = {};
  dated.forEach((p) => { (byDate[p.date] = byDate[p.date] || []).push(p); });
  state.projects.filter(activeDeadline).forEach((p) => { (due[p.due] = due[p.due] || []).push(p); });
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => `<div class="dow">${d}</div>`).join("");
  let cells = "";
  for (let i = 0; i < rows * 7; i++) {
    const d = new Date(y, m, 1 - offset + i), iso = isoLocal(d), ps = byDate[iso] || [], ds = due[iso] || [];
    const chips = ps.map((p) => `<span class="chipc" data-p="${esc(p.platform)}" ${p.status === "posted" ? 'data-done="1"' : ""}>${esc(p.title || "Untitled")}</span>`)
      .concat(ds.map((p) => `<span class="chipc due">Due · ${esc(p.title || p.client || "project")}</span>`));
    cells += `<button class="day ${d.getMonth() !== m ? "out" : ""} ${iso === today ? "today" : ""}" data-day="${iso}" ${ui.calDay === iso ? 'aria-current="true"' : ""} aria-label="${esc(fmtDate(iso))}, ${chips.length} item${chips.length === 1 ? "" : "s"}">
      <span class="n">${d.getDate()}</span><span class="chipwrap">${chips.slice(0, 3).join("")}</span>${chips.length > 3 ? `<span class="more">+${chips.length - 3}</span>` : ""}</button>`;
  }
  $("#calGrid").innerHTML = dow + cells;
  renderDayPanel(); renderIdeas();
}

function renderDayPanel() {
  const iso = ui.calDay; if (!iso) return;
  const ps = state.posts.filter((p) => p.date === iso), ds = state.projects.filter((p) => activeDeadline(p) && p.due === iso);
  $("#dayPanel").innerHTML = `<div class="panel"><div class="toolbar"><h3>${esc(fmtDate(iso))}</h3><span class="spacer"></span><button class="btn small primary" data-cal="addDay">Add post on this day</button></div>
    <div class="list">${ps.map(postRow).join("")}
      ${ds.map((p) => `<button class="row" data-proj="${esc(p.id)}"><span class="a">Deadline · ${esc(p.title || "Untitled project")}</span><span class="r"><span class="pill warn">${esc(statusLabel(p.status))}</span></span><span class="b">${esc(p.client || "No client")}</span><span class="r b mono">${esc(money(p.value))}</span></button>`).join("")}
      ${ps.length || ds.length ? "" : '<div class="empty">Nothing planned for this day.</div>'}</div></div>`;
}

function renderIdeas() {
  const ideas = state.posts.filter((p) => !p.date);
  $("#ideaBox").innerHTML = ideas.length ? `<div class="panel"><h3>Ideas without a date <span class="mono">${ideas.length}</span></h3><div class="list">${ideas.map(postRow).join("")}</div></div>` : "";
}

function renderPostEditor() {
  const host = $("#postEditor"); if (!host) return;
  const p = state.posts.find((x) => x.id === ui.postId);
  if (!p) { host.innerHTML = ""; return; }
  const opt = (list, val) => list.map((v) => { const [id, label] = Array.isArray(v) ? v : [v, v]; return `<option value="${esc(id)}" ${val === id ? "selected" : ""}>${esc(label)}</option>`; }).join("");
  host.innerHTML = `<div class="panel">
    <div class="toolbar"><h3>${esc(p.title || "New post")}</h3><span class="spacer"></span>
      <button class="btn small" data-pa="copy">Copy caption</button><button class="btn small" data-pa="dup">Repeat next week</button>
      <button class="btn small quiet" data-pa="del">Delete</button><button class="btn small" data-pa="close">Close</button></div>
    <div class="fields">
      <div class="f wide"><label for="po-title">Title</label><input id="po-title" data-pf="title" value="${esc(p.title)}" placeholder="e.g. Sigiriya sunrise reel"></div>
      <div class="f"><label for="po-date">Date</label><input id="po-date" type="date" data-pf="date" value="${esc(p.date)}"></div>
      <div class="f"><label for="po-plat">Platform</label><select id="po-plat" data-pf="platform">${opt(PLATFORMS, p.platform)}</select></div>
      <div class="f"><label for="po-fmt">Format</label><select id="po-fmt" data-pf="format">${opt(FORMATS, p.format)}</select></div>
      <div class="f"><label for="po-stat">Status</label><select id="po-stat" data-pf="status">${opt(POST_STATUS, p.status)}</select></div>
      <div class="f"><label for="po-client">Client (optional)</label><input id="po-client" list="clientList" data-pf="client" value="${esc(p.client)}" placeholder="Leave empty for your own brand"></div>
      <div class="f wide"><label for="po-cap">Caption <span class="muted" id="capCount"></span></label><textarea id="po-cap" data-pf="caption" rows="4" placeholder="Write the caption here">${esc(p.caption)}</textarea></div>
      <div class="f wide"><label for="po-tags">Hashtags</label><input id="po-tags" data-pf="hashtags" value="${esc(p.hashtags)}" placeholder="#srilanka #travel"></div>
      <div class="f wide"><label for="po-notes">Notes, shot list, location</label><textarea id="po-notes" data-pf="notes">${esc(p.notes)}</textarea></div>
    </div>
    ${ui.hasSample ? '<div class="toolbar"><button class="btn small" data-pa="ai">Suggest a caption and hashtags</button><span class="muted" id="aiMsg"></span></div>' : ""}
    <div id="sugBox"></div></div>`;
  updateCapCount(p);
}

function updateCapCount(p) {
  const el = $("#capCount"); if (!el) return;
  const lim = { Instagram: 2200, TikTok: 2200, Facebook: 63206, YouTube: 5000, LinkedIn: 3000 }[p.platform];
  el.textContent = (p.caption || "").length + (lim ? " / " + lim.toLocaleString("en-US") : "");
}

function openPost(id) {
  ui.postId = id;
  const p = state.posts.find((x) => x.id === id);
  if (p && p.date) { ui.calDay = p.date; ui.calMonth = monthStart(p.date); }
  renderCalendar(); renderPostEditor();
  const h = $("#postEditor"); if (h && h.firstElementChild) h.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function newPost(date) {
  const p = { id: uid(), date: date === undefined ? (ui.calDay || todayISO()) : date, title: "", platform: ui.lastPlatform || "Instagram", format: "Post", status: "planned", client: "", caption: "", hashtags: "", notes: "" };
  state.posts.push(p); save(); openPost(p.id);
  const t = $("#po-title"); if (t) t.focus();
}

async function suggestCaption(p) {
  const msg = $("#aiMsg"), box = $("#sugBox");
  if (!p.title && !p.notes) { if (msg) msg.textContent = "Add a title or notes first."; return; }
  let sample = null;
  try { sample = await window.claude.use("sample"); } catch (e) { sample = null; }
  if (!sample) { if (msg) msg.textContent = "Suggestions are not available in this view."; return; }
  if (msg) msg.textContent = "Thinking…";
  try {
    const out = await sample.json(
      `Write a social media caption for a creative studio in Sri Lanka.\nBrand: ${state.settings.brand || "a creative studio"}\nPlatform: ${p.platform}\nFormat: ${p.format}\nTitle: ${p.title}\nNotes: ${p.notes}\n${p.client ? "This is for a client: " + p.client + "\n" : ""}\nReturn ONLY JSON: {"caption": string of 1 to 3 short sentences with a call to action, "hashtags": array of 6 to 10 relevant hashtags each starting with #}. Keep it natural, no more than one emoji.`,
      { modelTier: "quick" });
    const cap = String((out && out.caption) || "").trim(), tags = (Array.isArray(out && out.hashtags) ? out.hashtags : []).map(String).filter((t) => t.startsWith("#")).slice(0, 12).join(" ");
    if (!cap) { if (msg) msg.textContent = "No suggestion came back. Try adding more detail."; return; }
    ui.sug = { id: p.id, cap, tags };
    if (box) box.innerHTML = `<div class="sug"><div>${esc(cap)}</div><div class="muted">${esc(tags)}</div><div class="toolbar"><button class="btn small primary" data-pa="useSug">Use this</button></div></div>`;
    if (msg) msg.textContent = "";
  } catch (e) {
    if (msg) msg.textContent = e && e.code === "not_granted" ? "Suggestions need your permission to run." : "Could not get a suggestion. Write it by hand.";
  }
}

function wireCalendar() {
  const pane = $("#pane-calendar");
  const cur = () => state.posts.find((x) => x.id === ui.postId);
  pane.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "newPost") return newPost();
    if (b.id === "calPrev" || b.id === "calNext") { ui.calMonth = shiftMonth(ui.calMonth, b.id === "calPrev" ? -1 : 1); renderCalendar(); return; }
    if (b.id === "calToday") { ui.calMonth = monthStart(todayISO()); ui.calDay = todayISO(); renderCalendar(); return; }
    if (b.dataset.day) { ui.calDay = b.dataset.day; ui.calMonth = monthStart(b.dataset.day); renderCalendar(); return; }
    if (b.dataset.cal === "addDay") return newPost(ui.calDay);
    if (b.dataset.post) return openPost(b.dataset.post);
    if (b.dataset.proj) { switchTab("pipeline"); openProject(b.dataset.proj); return; }
    const p = cur(); const a = b.dataset.pa; if (!p || !a) return;
    if (a === "close") { ui.postId = null; renderCalendar(); renderPostEditor(); }
    if (a === "copy") {
      const text = [p.caption, p.hashtags].filter(Boolean).join("\n\n");
      if (!text) { toast("Write a caption first."); return; }
      navigator.clipboard.writeText(text).then(() => toast("Caption copied"), () => toast("Copy was blocked here. Select the text and copy it."));
    }
    if (a === "dup") {
      const base = p.date || todayISO(), d = new Date(base + "T00:00:00"); d.setDate(d.getDate() + 7);
      const c = Object.assign({}, p, { id: uid(), date: isoLocal(d), status: "planned" });
      state.posts.push(c); save(); openPost(c.id); toast("Copied to next week");
    }
    if (a === "del") {
      if (b.dataset.sure) { state.posts = state.posts.filter((x) => x.id !== p.id); ui.postId = null; save(); renderCalendar(); renderPostEditor(); toast("Post deleted"); }
      else { b.dataset.sure = "1"; b.textContent = "Tap again to delete"; }
    }
    if (a === "ai") suggestCaption(p);
    if (a === "useSug" && ui.sug && ui.sug.id === p.id) {
      p.caption = ui.sug.cap; p.hashtags = ui.sug.tags; save(); renderPostEditor(); renderCalendar(); toast("Caption added");
    }
  });
  pane.addEventListener("input", (e) => {
    const f = e.target.dataset && e.target.dataset.pf; if (!f) return;
    const p = cur(); if (!p) return;
    p[f] = e.target.value; save();
    if (f === "title") { const h = $("#postEditor h3"); if (h) h.textContent = p.title || "New post"; }
    if (f === "platform") ui.lastPlatform = p.platform;
    if (f === "caption" || f === "platform") updateCapCount(p);
    if (["title", "date", "platform", "status", "client"].includes(f)) {
      if (f === "date" && p.date) { ui.calDay = p.date; ui.calMonth = monthStart(p.date); }
      renderCalendar();
    }
  });
}
