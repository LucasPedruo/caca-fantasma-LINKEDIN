console.log("[Cleaner] content.js injetado em", location.href);

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout = 5000, step = 120) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try {
      const v = fn();
      if (v) return v;
    } catch {}
    await delay(step);
  }
  return null;
}

function isVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const style = window.getComputedStyle(el);
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 &&
         rect.top < window.innerHeight && rect.left < window.innerWidth &&
         style.visibility !== "hidden" && style.display !== "none" && style.opacity !== "0";
}

let hud, hudMsg;
function ensureHud() {
  if (hud) return;
  hud = document.createElement("div");
  hud.style.cssText = `
    position:fixed; z-index:999999; right:12px; bottom:12px;
    background:#0a66c2; color:#fff; padding:10px 12px; border-radius:10px;
    font: 12px/1.4 system-ui, Arial; box-shadow:0 6px 20px rgba(0,0,0,.2);
  `;
  hudMsg = document.createElement("div");
  hud.appendChild(hudMsg);
  document.body.appendChild(hud);
}
function updateHud(msg) { ensureHud(); hudMsg.textContent = msg; }

function getListRoot() {
  return (
    document.querySelector(".scaffold-finite-scroll__content") ||
    document.querySelector('div[role="list"]') ||
    document.body
  );
}

function safeClick(el) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + Math.min(rect.width - 1, Math.max(1, rect.width / 2));
  const cy = rect.top + Math.min(rect.height - 1, Math.max(1, rect.height / 2));
  const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
  el.dispatchEvent(new MouseEvent("mousemove", opts));
  el.dispatchEvent(new MouseEvent("mouseover", opts));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  el.dispatchEvent(new MouseEvent("click", opts));
}

async function getFirstActionTrigger() {
  const root = getListRoot();

  const find = () => {
    const specific = root.querySelector('button.artdeco-dropdown__trigger.mn-connection-card__dropdown-trigger');
    if (specific && isVisible(specific)) return specific;

    const triggers = root.querySelectorAll('button.artdeco-dropdown__trigger, button[aria-label]');
    for (const b of triggers) {
      const label = (b.getAttribute("aria-label") || "").toLowerCase();
      if ((label.includes("mais ações") || label.includes("mais acoes") || label.includes("more actions")) && isVisible(b)) {
        return b;
      }
    }
    return null;
  };

  let btn = find();
  let attempts = 0;
  while (!btn && attempts < 30) {
    const nextCard = root.querySelector("li.mn-connection-card, .mn-connection-card");
    if (nextCard) nextCard.scrollIntoView({ behavior: "instant", block: "center" });
    window.scrollBy(0, 300);
    await delay(160);
    btn = find();
    attempts++;
  }

  return btn || null;
}

function findRemoveItemNear(trigger) {
  const candidates = [...document.querySelectorAll('button,[role="menuitem"],[role="button"],a,.artdeco-dropdown__item')].filter(isVisible);
  const matchers = [
    (t) => /remov[ea]r? a? conex[aã]o/.test(t),   
    (t) => t === "remover" || t === "remove",
    (t) => t.includes("remove connection"),
  ];

  const tRect = trigger.getBoundingClientRect();
  const tcx = tRect.left + tRect.width / 2, tcy = tRect.top + tRect.height / 2;
  let best = null, bestD = Infinity;
  for (const el of candidates) {
    const txt = (el.textContent || "").trim().toLowerCase();
    if (!matchers.some(fn => fn(txt))) continue;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(cx - tcx, cy - tcy);
    if (d < bestD) {
      best = el;
      bestD = d;
    }
  }
  if (!best) return null;
  return best.closest('button,[role="menuitem"],[role="button"],a,.artdeco-dropdown__item') || best;
}

let removedCount = 0;
let running = false;

async function removeOne() {
  if (!/^https:\/\/www\.linkedin\.com\/mynetwork\/invite-connect\/connections\/?/.test(location.href)) {
    updateHud("Abra a página de Conexões.");
    return false;
  }

  const trigger = await getFirstActionTrigger();
  if (!trigger) {
    updateHud("Nenhuma conexão visível (ainda). Vou tentar de novo…");
    return false;
  }

  trigger.scrollIntoView({ behavior: "instant", block: "center" });
  await delay(100);

  safeClick(trigger);
  await delay(250);

  let removeItem = findRemoveItemNear(trigger);
  if (!removeItem) {
    safeClick(trigger);
    await delay(280);
    removeItem = findRemoveItemNear(trigger);
  }
  if (!removeItem) {
    updateHud("Dropdown aberto, mas não localizei 'Remover conexão'.");
    return false;
  }

  removeItem.scrollIntoView({ behavior: "instant", block: "center" });
  await delay(60);
  safeClick(removeItem);
  await delay(280);

  const confirmBtn = await waitFor(() => {
    const byData = document.querySelector('[data-view-name="connections-remove"]');
    if (byData && isVisible(byData)) return byData;
    const byAttr = document.querySelector('.artdeco-modal__actionbar [data-test-dialog-primary-btn]');
    if (byAttr && isVisible(byAttr)) return byAttr;
    const buttons = [...document.querySelectorAll('dialog[open] button, .artdeco-modal__actionbar button, dialog[open] [role="button"]')].filter(isVisible);
    return buttons.find((b) => {
      const t = (b.textContent || "").trim().toLowerCase();
      return t === "remover" || t === "remove" || /confirmar|confirm/i.test(t);
    });
  }, 7000);

  if (!confirmBtn) {
    updateHud("Modal aberta, mas sem botão de confirmação.");
    return false;
  }
  safeClick(confirmBtn);

  await delay(1100);
  removedCount += 1;

  window.scrollBy(0, 700);
  await delay(200);
  window.scrollBy(0, -250);

  updateHud(`Conexão removida. Total: ${removedCount}`);
  return true;
}

async function loop() {
  running = true;
  updateHud("Iniciando limpeza…");
  while (running) {
    const ok = await removeOne();
    await delay(ok ? 600 : 900);
  }
  updateHud(`Parado. Removidas: ${removedCount}`);
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.action === "startCleaning") {
    if (!running) {
      removedCount = 0;
      loop().catch((e) => console.error("[Cleaner] erro no loop:", e));
    }
    sendResponse({ ok: true, running: true });
    return true;
  }
  if (msg?.action === "stopCleaning") {
    running = false;
    sendResponse({ ok: true, running: false });
    return true;
  }
});
