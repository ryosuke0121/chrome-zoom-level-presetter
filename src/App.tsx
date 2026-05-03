import React, { useState, useEffect } from 'react';

const DEFAULT_PRESETS = [0.8, 1.0, 1.25, 1.5, 2.0];

const App: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    // 現在のタブのズームレベルを取得
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.getZoom(tabId, (zoom) => {
          setZoomLevel(zoom);
        });
      }
    });
  }, []);

  const changeZoom = (level: number) => {
    // 全てのタブ（あるいはデフォルト設定）に適用する代わりに、
    // 要望は「すべてのページへ適応」なので、ブラウザのズーム設定を変更するか、
    // すべてのタブをループして設定するか。
    // chrome.settingsPrivate は一般の拡張機能では使えないため、
    // 現在はアクティブなタブのズームを変更し、かつ設定を保存する形にするか、
    // あるいは chrome.tabs.setZoom を全タブに実行する。
    
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.setZoom(tab.id, level);
        }
      });
    });
    setZoomLevel(level);
    
    // 将来的に新しく開くタブにも適用するために storage に保存
    chrome.storage.local.set({ defaultZoom: level });
  };

  return (
    <div style={{ padding: '16px', minWidth: '200px', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 16px 0' }}>ズーム設定</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        {DEFAULT_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => changeZoom(preset)}
            style={{
              padding: '8px',
              backgroundColor: zoomLevel === preset ? '#007bff' : '#f8f9fa',
              color: zoomLevel === preset ? '#fff' : '#333',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {Math.round(preset * 100)}%
          </button>
        ))}
      </div>
      <div style={{ marginTop: '16px', fontSize: '12px', color: '#666' }}>
        現在のズーム: {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default App;
