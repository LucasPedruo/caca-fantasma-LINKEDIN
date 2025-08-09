

const CONNECTIONS_URL = "https://www.linkedin.com/mynetwork/invite-connect/connections/";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.action === "openConnectionsTab") {
    chrome.tabs.query({
      url: [
        "https://www.linkedin.com/mynetwork/invite-connect/connections",
        "https://www.linkedin.com/mynetwork/invite-connect/connections/"
      ]
    }, (tabs) => {
      const existing = tabs?.[0];
      if (existing) {
        chrome.tabs.update(existing.id, { active: true }, () => {
          sendResponse({ ok: true, tabId: existing.id, alreadyOpen: true });
        });
        return;
      }

      chrome.tabs.create({ url: CONNECTIONS_URL, active: true }, (created) => {
        sendResponse({ ok: true, tabId: created?.id ?? null, alreadyOpen: false });
      });
    });

    return true; 
  }
});
