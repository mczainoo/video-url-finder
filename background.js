importScripts("common.js");

// tabId -> Map<dedupeKey, {url, ext, source}>
const videosByTab = new Map();

function getTabMap(tabId) {
  if (!videosByTab.has(tabId)) videosByTab.set(tabId, new Map());
  return videosByTab.get(tabId);
}

function addUrl(tabId, url, source) {
  if (tabId < 0 || !isVideoUrl(url)) return;
  const map = getTabMap(tabId);
  const key = dedupeKey(url);
  if (!map.has(key)) {
    map.set(key, { url, ext: extensionOf(url), source });
    updateBadge(tabId);
  }
}

function updateBadge(tabId) {
  const count = getTabMap(tabId).size;
  chrome.action.setBadgeText({ tabId, text: count ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#4F46E5" });
}

// Catch network requests for media files / playlists that never show up as
// plain <a>/<video> tags in the DOM (e.g. lazy-loaded or XHR-fetched sources).
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId >= 0) addUrl(details.tabId, details.url, "network");
  },
  { urls: ["<all_urls>"] }
);

// Reset the list when the top-level page navigates to a new document.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId === 0) {
    videosByTab.set(details.tabId, new Map());
    updateBadge(details.tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => videosByTab.delete(tabId));

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_VIDEOS") {
    const tabId = message.tabId;
    (async () => {
      let domResults = [];
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId },
          files: ["content.js"],
        });
        domResults = result || [];
      } catch (err) {
        // Injection fails on restricted pages (chrome://, Web Store, etc.) - that's fine,
        // we still return whatever the network listener already captured.
      }

      const map = getTabMap(tabId);
      for (const url of domResults) addUrl(tabId, url, "page");

      sendResponse({ videos: Array.from(map.values()) });
    })();
    return true; // keep the message channel open for the async sendResponse
  }
});
