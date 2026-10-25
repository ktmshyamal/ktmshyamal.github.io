/* ---------- follow-ups: things to chase, each with a message ready to copy ---------- */
function followUps() {
  const t = todayISO(), out = [], brand = state.settings.brand || "";
  const gap = (iso) => Math.round((new Date(t + "T00:00:00") - new Date(iso + "T00:00:00")) / 86400000);
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");
  const who = (n) => String(n || "there").replace(/^Example · /, "");
  state.invoices.forEach((i) => {
    const no = docNo(i.kind, i.no);
    if (i.kind === "invoice" && i.status === "sent" && i.due && i.due < t) {
      const d = gap(i.due);
      out.push({ rank: 0, sev: "bad", label: "Overdue", title: `${no} · ${i.client || "No client"}`, sub: `${plural(d, "day")} late · ${dm(i, invBal(i), 2)} due`, doc: i.id, client: i.client,
        msg: `Hi ${who(i.client)}, a friendly reminder that invoice ${no} for ${dm(i, invBal(i), 2)} was due on ${fmtDate(i.due)}. Could you let me know when I can expect payment? Thank you!\n${brand}` });
    }
    if (i.kind === "quote" && i.status === "sent" && i.date && gap(i.date) >= 3) {
      out.push({ rank: 2, sev: "info", label: "Quote", title: `${no} · ${i.client || "No client"}`, sub: `Sent ${plural(gap(i.date), "day")} ago · ${dm(i, invGrand(i), 2)}`, doc: i.id, client: i.client,
        msg: `Hi ${who(i.client)}, I wanted to check if you had a chance to look at quote ${no} (${dm(i, invGrand(i), 2)}). Happy to adjust anything or answer questions. Looking forward to working together!\n${brand}` });
    }
  });
  state.projects.forEach((p) => {
    const active = ["inquiry", "quoted", "shooting", "editing"].includes(p.status);
    const name = p.title || "Untitled project";
    if (active && p.due && p.due < t) {
      out.push({ rank: 0, sev: "bad", label: "Late", title: `${name} · ${p.client || "No client"}`, sub: `Deadline passed ${plural(gap(p.due), "day")} ago`, proj: p.id, client: p.client,
        msg: `Hi ${who(p.client)}, a quick update on "${name}". I'm finishing the last parts and will send it over shortly. Thank you for your patience!\n${brand}` });
    } else if (active && p.due && p.due <= addDays(3)) {
      const d = -gap(p.due);
      out.push({ rank: 1, sev: "warn", label: "Due soon", title: `${name} · ${p.client || "No client"}`, sub: d <= 0 ? "Due today" : `Due in ${plural(d, "day")}`, proj: p.id, client: p.client, msg: "" });
    }
    if (p.status === "delivered" && !state.invoices.some((i) => i.kind === "invoice" && (i.projectId === p.id || (i.client && i.client === p.client)))) {
      out.push({ rank: 1, sev: "warn", label: "No invoice", title: `${name} · ${p.client || "No client"}`, sub: "Delivered, but no invoice made yet", proj: p.id, client: p.client, msg: "" });
    }
  });
  return out.sort((a, b) => a.rank - b.rank);
}

function renderFollowUps() {
  const host = $("#followups"); if (!host) return;
  const list = ui.fu = followUps();
  if (!list.length) { host.innerHTML = '<div class="banner ok">Nothing to chase today. Overdue invoices, unanswered quotes and close deadlines will show up here.</div>'; return; }
  host.innerHTML = `<div class="panel"><h3>Follow-ups <span class="mono">${list.length}</span></h3><div class="list">${list.map((f, n) => `
    <div class="fu">
      <div class="fu-main"><span class="pill ${f.sev}">${esc(f.label)}</span><div class="fu-t">${esc(f.title)}</div><div class="b">${esc(f.sub)}</div>
        ${f.msg ? `<details><summary>Message</summary><div class="fumsg">${esc(f.msg).replace(/\n/g, "<br>")}</div></details>` : ""}</div>
      <div class="fu-act">${f.msg && waLink((clientByName(f.client) || {}).phone, f.msg) ? `<a class="btn small primary" href="${esc(waLink((clientByName(f.client) || {}).phone, f.msg))}" target="_blank" rel="noopener">WhatsApp</a>` : ""}${f.msg ? `<button class="btn small" data-fu-copy="${n}">Copy message</button>` : ""}<button class="btn small" data-fu-open="${n}">Open</button></div>
    </div>`).join("")}</div></div>`;
}
