const $ = (s) => document.querySelector(s);
const statusEl = $("#status");
const TARGET = "https://www.linkedin.com/mynetwork/invite-connect/connections"; // sem barra final para evitar mismatch

async function waitTabComplete(tabId) {
  return new Promise((resolve) => {
    const onUpdated = (id, info, tab) => {
      if (id === tabId && info.status === "complete" && tab.url?.startsWith(TARGET)) {
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
    await new Promise((r) => setTimeout(r, 400 + i * 150));
  }
  return null;
}

$("#go").addEventListener("click", async () => {
  statusEl.textContent = "Abrindo Conexões...";
  const resp = await chrome.runtime.sendMessage({ action: "openConnectionsTab" });
  if (!resp?.ok) {
    statusEl.textContent = "Não consegui abrir a página de Conexões.";
    return;
  }
  statusEl.textContent = "Página aberta.";
});

$("#start").addEventListener("click", async () => {
  statusEl.textContent = "Abrindo Conexões...";
  const resp = await chrome.runtime.sendMessage({ action: "openConnectionsTab" });
  if (!resp?.ok) {
    statusEl.textContent = "Não consegui abrir a página de Conexões.";
    return;
  }
  let tabId = resp.tabId;

  const tab = await waitTabComplete(tabId);

  statusEl.textContent = "Preparando...";

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  } catch (e) {
  }

  const res = await robustSendMessage(tabId, { action: "startCleaning" });
  if (!res) {
    statusEl.textContent = "Não consegui conectar ao content. Recarregue a página e tente de novo.";
    return;
  }
  statusEl.textContent = res.ok ? "Rodando..." : "Falhou ao iniciar.";
});

$("#stop").addEventListener("click", async () => {
  const tabs = await chrome.tabs.query({ url: ["*://www.linkedin.com/mynetwork/invite-connect/connections*", "*://www.linkedin.com/mynetwork/invite-connect/connections"] });
  const tabId = tabs?.[0]?.id;
  if (!tabId) {
    statusEl.textContent = "Nada para parar (aba não encontrada).";
    return;
  }
  const res = await robustSendMessage(tabId, { action: "stopCleaning" });
  statusEl.textContent = res ? "Processo parado." : "Nada para parar (content não ativo).";
});
