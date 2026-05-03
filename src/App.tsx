import React, { useState, useEffect } from 'react';

const DEFAULT_PRESETS = [0.8, 1.0, 1.25, 1.5, 2.0];
const MIN_PERCENT = 25;
const MAX_PERCENT = 500;
const STORAGE_KEYS = {
  defaultZoom: 'defaultZoom',
  presets: 'zoomPresets'
} as const;

const normalizePresets = (values: number[]): number[] => {
  const filtered = values.filter((value) => Number.isFinite(value) && value >= 0.25 && value <= 5);
  const unique = Array.from(new Set(filtered.map((value) => Number(value.toFixed(2)))));
  return unique.sort((a, b) => a - b);
};

const App: React.FC = () => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [presets, setPresets] = useState<number[]>(DEFAULT_PRESETS);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [newPresetPercent, setNewPresetPercent] = useState<string>('');
  const [settingsError, setSettingsError] = useState<string>('');

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEYS.presets], (result) => {
      const storedPresets = result[STORAGE_KEYS.presets];
      if (Array.isArray(storedPresets)) {
        const normalized = normalizePresets(storedPresets.map((value) => Number(value)));
        if (normalized.length > 0) {
          setPresets(normalized);
        }
      }
    });

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
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.setZoom(tab.id, level);
        }
      });
    });
    setZoomLevel(level);

    // 将来的に新しく開くタブにも適用するために storage に保存
    chrome.storage.local.set({ [STORAGE_KEYS.defaultZoom]: level });
  };

  const resetZoom = () => {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.setZoom(tab.id, 0);
        }
      });
    });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.getZoom(tabId, (zoom) => {
          setZoomLevel(zoom);
        });
      }
    });

    chrome.storage.local.remove(STORAGE_KEYS.defaultZoom);
  };

  const savePresets = (nextPresets: number[]) => {
    setPresets(nextPresets);
    chrome.storage.local.set({ [STORAGE_KEYS.presets]: nextPresets });
  };

  const addPreset = () => {
    const percent = Number(newPresetPercent);
    if (!Number.isFinite(percent)) {
      setSettingsError('数値を入力してください。');
      return;
    }

    if (percent < MIN_PERCENT || percent > MAX_PERCENT) {
      setSettingsError(`${MIN_PERCENT}〜${MAX_PERCENT} の範囲で入力してください。`);
      return;
    }

    const normalizedLevel = Number((percent / 100).toFixed(2));
    if (presets.includes(normalizedLevel)) {
      setSettingsError('同じプリセットは既に存在します。');
      return;
    }

    const nextPresets = normalizePresets([...presets, normalizedLevel]);
    savePresets(nextPresets);
    setNewPresetPercent('');
    setSettingsError('');
  };

  const removePreset = (presetToDelete: number) => {
    const nextPresets = presets.filter((preset) => preset !== presetToDelete);
    if (nextPresets.length === 0) {
      setSettingsError('最低1つのプリセットが必要です。');
      return;
    }
    savePresets(nextPresets);
    setSettingsError('');
  };

  const resetPresets = () => {
    savePresets(DEFAULT_PRESETS);
    setSettingsError('');
  };

  return (
    <div style={{ padding: '16px', minWidth: '260px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0 }}>ズーム設定</h3>
        <button
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          style={{
            padding: '6px 10px',
            backgroundColor: '#f3f4f6',
            color: '#222',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {isSettingsOpen ? '戻る' : 'プリセット編集'}
        </button>
      </div>

      {!isSettingsOpen && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {presets.map((preset) => (
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

          <button
            onClick={resetZoom}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#fff',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ズームをブラウザ既定値に戻す
          </button>
        </div>
      )}

      {isSettingsOpen && (
        <div>
          <p style={{ margin: '0 0 10px 0', fontSize: '12px', color: '#4b5563' }}>
            {MIN_PERCENT}%〜{MAX_PERCENT}% の範囲で追加できます。
          </p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
            <input
              type="number"
              min={MIN_PERCENT}
              max={MAX_PERCENT}
              value={newPresetPercent}
              onChange={(e) => setNewPresetPercent(e.target.value)}
              placeholder="例: 110"
              style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <button
              onClick={addPreset}
              style={{
                padding: '8px 12px',
                backgroundColor: '#111827',
                color: '#fff',
                border: '1px solid #111827',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              追加
            </button>
          </div>

          <div style={{ display: 'grid', gap: '6px' }}>
            {presets.map((preset) => (
              <div
                key={`preset-${preset}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '6px 8px'
                }}
              >
                <span>{Math.round(preset * 100)}%</span>
                <button
                  onClick={() => removePreset(preset)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#fff',
                    color: '#b91c1c',
                    border: '1px solid #fecaca',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={resetPresets}
            style={{
              marginTop: '10px',
              width: '100%',
              padding: '8px 10px',
              backgroundColor: '#fff',
              color: '#1f2937',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            既定値に戻す
          </button>

          {settingsError && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#b91c1c' }}>
              {settingsError}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '14px', fontSize: '12px', color: '#666' }}>
        現在のズーム: {Math.round(zoomLevel * 100)}%
      </div>
    </div>
  );
};

export default App;
