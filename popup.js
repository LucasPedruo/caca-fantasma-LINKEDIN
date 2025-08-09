const $ = (s) => document.querySelector(s);
const statusEl = $("#status");
const btnGo = $("#go");
const btnStart = $("#start");
const btnStop = $("#stop");

const TARGET_BASE = "https://www.linkedin.com/mynetwork/invite-connect/connections";

function isConnectionsUrl(u = "") {
  return typeof u === "string" && u.startsWith(TARGET_BASE);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function waitTabComplete(tabId) {
  return new Promise((resolve) => {
    const onUpdated = (id, info, tab) => {
      if (id === tabId && info.status === "complete" && isConnectionsUrl(tab?.url)) {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve(tab);
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

async function robustSendMessage(tabId, payload, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const res = await new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, payload, (resp) => {
        if (chrome.runtime.lastError) return resolve(null);
        resolve(resp);
      });
    });
    if (res) return res;
    await sleep(200 + i * 150);
  }
  return null;
}

async function findConnectionsTab() {
  const tabs = await chrome.tabs.query({
    url: [TARGET_BASE, `${TARGET_BASE}/`]
  });
  return tabs?.[0] ?? null;
}

btnGo?.addEventListener("click", async () => {
  statusEl.textContent = "Verificando abas...";
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (isConnectionsUrl(active?.url)) {
    statusEl.textContent = "Você já está na página de Conexões.";
    return;
  }
  const existing = await findConnectionsTab();
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true });
    statusEl.textContent = "Foquei a aba de Conexões.";
    return;
  }
  const resp = await chrome.runtime.sendMessage({ action: "openConnectionsTab" });
  if (resp?.ok && resp.tabId) {
    statusEl.textContent = "Abrindo Conexões...";
    await waitTabComplete(resp.tabId);
    statusEl.textContent = "Página aberta.";
  } else {
    statusEl.textContent = "Não consegui abrir a página de Conexões.";
  }
});

btnStart?.addEventListener("click", async () => {
  statusEl.textContent = "Preparando...";

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  let targetTabId = null;

  if (isConnectionsUrl(active?.url)) {
    targetTabId = active.id;
  } else {
    const existing = await findConnectionsTab();
    if (existing) {
      await chrome.tabs.update(existing.id, { active: true });
      targetTabId = existing.id;
    } else {
      const resp = await chrome.runtime.sendMessage({ action: "openConnectionsTab" });
      if (!resp?.ok || !resp.tabId) {
        statusEl.textContent = "Não consegui abrir a página de Conexões.";
        return;
      }
      targetTabId = resp.tabId;
      if (!resp.alreadyOpen) {
        statusEl.textContent = "Carregando Conexões...";
        await waitTabComplete(targetTabId);
      }
    }
  }

  statusEl.textContent = "Conectando ao content...";
  let res = await robustSendMessage(targetTabId, { action: "startCleaning" });

  if (!res) {
    try {
      await chrome.scripting.executeScript({ target: { tabId: targetTabId }, files: ["content.js"] });
      await sleep(300);
      res = await robustSendMessage(targetTabId, { action: "startCleaning" });
    } catch (_) {
    }
  }

  statusEl.textContent = res ? "Limpando... (clique em Parar para interromper)" :
    "Não consegui conectar ao content. Recarregue a aba e tente de novo.";
})

btnStop?.addEventListener("click", async () => {
  statusEl.textContent = "Parando...";

  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  let tabId = isConnectionsUrl(active?.url) ? active.id : null;

  if (!tabId) {
    const { lastCleanerTabId } = await chrome.storage.local.get("lastCleanerTabId");
    if (lastCleanerTabId) tabId = lastCleanerTabId;
  }

  if (!tabId) {
    const any = await findConnectionsTab();
    tabId = any?.id ?? null;
  }

  if (tabId) {
    const res = await robustSendMessage(tabId, { action: "stopCleaning" });
    if (res) {
      statusEl.textContent = "Processo parado.";
      return;
    }
  }

  const tabs = await getConnectionsTabs();
  let stopped = false;
  for (const t of tabs) {
    const r = await robustSendMessage(t.id, { action: "stopCleaning" });
    if (r) { stopped = true; break; }
  }

  statusEl.textContent = stopped
    ? "Processo parado."
    : "Nada para parar (content não ativo).";
});
