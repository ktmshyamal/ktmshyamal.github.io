/* ---------- payments received on an invoice ---------- */
function renderPayBox(inv) {
  const box = $("#payBox"); if (!box) return;
  if (inv.kind !== "invoice") { box.innerHTML = ""; return; }
  const pays = inv.payments || [], pct = num(state.settings.depositPct);
  box.innerHTML = `<div class="pays"><h4 class="grp">Payments received</h4>
    ${pays.map((p, i) => `<div class="pay"><span>${esc(fmtDate(p.date))}${p.note ? " · " + esc(p.note) : ""}</span>
      <span class="mono">${esc(dm(inv, p.amount, 2))} <button class="btn small quiet" data-act="delPay" data-i="${i}" aria-label="Remove payment">✕</button></span></div>`).join("")
      || '<div class="empty">No payments recorded yet.</div>'}
    <div class="payform">
      <div class="f"><label for="pay-amt">Amount (${esc(curOf(inv))})</label><input id="pay-amt" type="number" min="0" step="any"></div>
      <div class="f"><label for="pay-date">Date</label><input id="pay-date" type="date" value="${esc(todayISO())}"></div>
      <div class="f"><label for="pay-note">Note</label><input id="pay-note" placeholder="Bank transfer, cash…"></div>
    </div>
    <div class="toolbar"><button class="btn small primary" data-act="addPay">Record payment</button>
      ${pct > 0 ? `<button class="btn small" data-act="deposit">Record ${esc(pct)}% deposit (${esc(dm(inv, invGrand(inv) * pct / 100, 2))})</button>` : ""}</div></div>`;
}

function afterPay(inv, removed) {
  const rem = invGrand(inv) - invPaid(inv);
  if (rem <= 0 && invGrand(inv) > 0) inv.status = "paid";
  else if (removed && inv.status === "paid") inv.status = "sent";
  else if (inv.status === "draft" && invPaid(inv) > 0) inv.status = "sent";
  save(); renderInvEditor(); refreshTotals(inv);
}

function addPayment(inv, deposit) {
  let amt, note = "";
  if (deposit) { amt = Math.round(invGrand(inv) * num(state.settings.depositPct)) / 100; note = state.settings.depositPct + "% deposit"; }
  else { amt = num($("#pay-amt").value); note = $("#pay-note").value.trim(); }
  if (!(amt > 0)) { toast("Enter an amount first."); return; }
  const date = (!deposit && $("#pay-date").value) || todayISO();
  (inv.payments = inv.payments || []).push({ id: uid(), date, amount: amt, note });
  afterPay(inv, false);
  toast("Payment recorded");
}
