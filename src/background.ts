const STORAGE_KEY_DEFAULT_ZOOM = 'defaultZoom';
const newlyCreatedTabIds = new Set<number>();

const applyDefaultZoomToTab = (tabId: number) => {
  chrome.storage.local.get([STORAGE_KEY_DEFAULT_ZOOM], (result) => {
    const zoom = result[STORAGE_KEY_DEFAULT_ZOOM];
    if (typeof zoom === 'number' && Number.isFinite(zoom)) {
      chrome.tabs.setZoom(tabId, zoom);
    }
  });
};

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.id) {
    return;
  }
  newlyCreatedTabIds.add(tab.id);
  applyDefaultZoomToTab(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status !== 'complete') {
    return;
  }
  if (!newlyCreatedTabIds.has(tabId)) {
    return;
  }
  applyDefaultZoomToTab(tabId);
  newlyCreatedTabIds.delete(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  newlyCreatedTabIds.delete(tabId);
});

// インストール時や起動時にも既存のタブに適用したい場合はここで処理する
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([STORAGE_KEY_DEFAULT_ZOOM], (result) => {
    const zoom = result[STORAGE_KEY_DEFAULT_ZOOM] || 1.0;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.setZoom(tab.id, zoom);
        }
      });
    });
  });
});
