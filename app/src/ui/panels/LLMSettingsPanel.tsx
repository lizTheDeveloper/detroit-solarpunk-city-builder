import { useState, useEffect } from 'react';

const STORAGE_KEY = 'detroit_solarpunk_llm_settings';

interface LLMSettings {
  enabled: boolean;
  model: string;
  sessionCalls: number;
}

const DEFAULT_SETTINGS: LLMSettings = {
  enabled: true,
  model: 'qwen/qwen3-32b',
  sessionCalls: 0,
};

const MAX_SESSION_CALLS = 200;

const MODEL_OPTIONS = [
  { value: 'qwen/qwen3-32b', label: 'Qwen3 32B (Groq - fast, free)' },
  { value: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Groq)' },
  { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq)' },
];

function loadSettings(): LLMSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<LLMSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: LLMSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function LLMSettingsPanel() {
  const [settings, setSettings] = useState<LLMSettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  function handleToggleEnabled() {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  }

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSettings((prev) => ({ ...prev, model: e.target.value }));
  }

  return (
    <div className="panel" style={panelStyle}>
      <h2 style={titleStyle}>AI Dialogue Settings</h2>

      <p style={descriptionStyle}>
        When enabled, characters speak dynamically using AI. When disabled,
        characters use pre-written dialogue.
      </p>

      {/* Enable/Disable Toggle */}
      <div style={rowStyle}>
        <label style={labelStyle}>
          <span>Enable AI Dialogue</span>
          <button
            type="button"
            onClick={handleToggleEnabled}
            style={{
              ...toggleStyle,
              backgroundColor: settings.enabled
                ? 'var(--color-primary, #2d6a4f)'
                : 'var(--color-surface-alt, #333)',
            }}
            aria-pressed={settings.enabled}
          >
            <span
              style={{
                ...toggleKnobStyle,
                transform: settings.enabled ? 'translateX(20px)' : 'translateX(0)',
              }}
            />
          </button>
        </label>
      </div>

      {/* Model Selection */}
      <div style={fieldStyle}>
        <label style={fieldLabelStyle}>Model</label>
        <select
          value={settings.model}
          onChange={handleModelChange}
          style={selectStyle}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Session Usage */}
      <div style={usageStyle}>
        <span style={usageLabelStyle}>Session Usage</span>
        <span style={usageValueStyle}>
          {settings.sessionCalls} / {MAX_SESSION_CALLS} calls used
        </span>
        <div style={usageBarTrack}>
          <div
            style={{
              ...usageBarFill,
              width: `${(settings.sessionCalls / MAX_SESSION_CALLS) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Inline Styles ─────────────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  padding: '24px',
  maxWidth: '500px',
};

const titleStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '1.3rem',
  color: 'var(--color-text, #e0e0e0)',
};

const descriptionStyle: React.CSSProperties = {
  margin: '0 0 24px 0',
  fontSize: '0.9rem',
  lineHeight: 1.5,
  color: 'var(--color-text-muted, #888)',
};

const rowStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.95rem',
  color: 'var(--color-text, #e0e0e0)',
};

const toggleStyle: React.CSSProperties = {
  position: 'relative',
  width: '44px',
  height: '24px',
  borderRadius: '12px',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s',
  padding: 0,
};

const toggleKnobStyle: React.CSSProperties = {
  display: 'block',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  backgroundColor: '#fff',
  position: 'absolute',
  top: '2px',
  left: '2px',
  transition: 'transform 0.2s',
};

const fieldStyle: React.CSSProperties = {
  marginBottom: '20px',
};

const fieldLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--color-text-muted, #888)',
  marginBottom: '6px',
};


const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid var(--color-border, #333)',
  backgroundColor: 'var(--color-surface-alt, #16213e)',
  color: 'var(--color-text, #e0e0e0)',
  fontSize: '0.9rem',
};


const usageStyle: React.CSSProperties = {
  padding: '16px',
  borderRadius: '8px',
  backgroundColor: 'var(--color-surface-alt, #16213e)',
  border: '1px solid var(--color-border, #333)',
};

const usageLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--color-text-muted, #888)',
  marginBottom: '4px',
};

const usageValueStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '1rem',
  color: 'var(--color-text, #e0e0e0)',
  marginBottom: '8px',
};

const usageBarTrack: React.CSSProperties = {
  width: '100%',
  height: '6px',
  borderRadius: '3px',
  backgroundColor: 'var(--color-border, #333)',
  overflow: 'hidden',
};

const usageBarFill: React.CSSProperties = {
  height: '100%',
  borderRadius: '3px',
  backgroundColor: 'var(--color-primary, #2d6a4f)',
  transition: 'width 0.3s',
};
