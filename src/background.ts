chrome.tabs.onCreated.addListener((tab) => {
  chrome.storage.local.get(['defaultZoom'], (result) => {
    if (result.defaultZoom && tab.id) {
      chrome.tabs.setZoom(tab.id, result.defaultZoom);
    }
  });
});

// インストール時や起動時にも既存のタブに適用したい場合はここで処理する
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['defaultZoom'], (result) => {
    const zoom = result.defaultZoom || 1.0;
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.setZoom(tab.id, zoom);
        }
      });
    });
  });
});
