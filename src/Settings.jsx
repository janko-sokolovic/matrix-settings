import { useState } from 'react';

export const DEFAULT_CONFIG = {
  speedMultiplier: 1.0,
  columnCount: 100,
  foregroundCount: 10,
  lineLengthFactor: 1.0,
  glowIntensity: 1.0,
  theme: 'green',
};

const ACCENT = '#8bff8b';
const BORDER = '#009a22';
const BG = 'rgba(0,0,0,0.88)';
const FONT = "'Courier New', monospace";

function Slider({ label, valueKey, config, onChange, min, max, step, unit = '' }) {
  const val = config[valueKey];
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: ACCENT, fontSize: 12 }}>{label}</span>
        <span style={{ color: ACCENT, fontSize: 12 }}>{val}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        style={{ width: '100%', accentColor: BORDER, cursor: 'pointer' }}
        onChange={e => onChange({ ...config, [valueKey]: parseFloat(e.target.value) })}
      />
    </div>
  );
}

export default function Settings({ config, onChange }) {
  const [open, setOpen] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);

  return (
    <>
      {/* Gear button */}
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHoverBtn(true)}
        onMouseLeave={() => setHoverBtn(false)}
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          width: 36,
          height: 36,
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${BORDER}`,
          borderRadius: 6,
          color: ACCENT,
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 20,
          opacity: hoverBtn || open ? 1.0 : 0.4,
          transition: 'opacity 0.2s',
          fontFamily: FONT,
        }}
        title="Settings"
      >
        ⚙
      </button>

      {/* Settings panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 64,
            right: 20,
            width: 280,
            background: BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: 20,
            zIndex: 20,
            fontFamily: FONT,
            color: ACCENT,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 16, letterSpacing: 1 }}>
            MATRIX SETTINGS
          </div>

          <Slider label="Rain Speed" valueKey="speedMultiplier" config={config} onChange={onChange}
            min={0.25} max={4.0} step={0.25} unit="×" />

          <Slider label="Columns" valueKey="columnCount" config={config} onChange={onChange}
            min={20} max={250} step={10} />

          <Slider label="Foreground" valueKey="foregroundCount" config={config} onChange={onChange}
            min={0} max={25} step={1} />

          <Slider label="Line Length" valueKey="lineLengthFactor" config={config} onChange={onChange}
            min={0.5} max={2.0} step={0.1} unit="×" />

          <Slider label="Glow" valueKey="glowIntensity" config={config} onChange={onChange}
            min={0.0} max={3.0} step={0.1} unit="×" />

          {/* Theme */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: ACCENT, fontSize: 12, marginBottom: 6 }}>Color Theme</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {['green', 'blue', 'red'].map(t => {
                const active = config.theme === t;
                const themeColor = t === 'green' ? '#8bff8b' : t === 'blue' ? '#88ddff' : '#ff9999';
                const themeBorder = t === 'green' ? '#009a22' : t === 'blue' ? '#0055cc' : '#aa0011';
                return (
                  <button
                    key={t}
                    onClick={() => onChange({ ...config, theme: t })}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      background: active ? `${themeBorder}66` : 'transparent',
                      border: `1px solid ${themeBorder}`,
                      borderRadius: 4,
                      color: themeColor,
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: FONT,
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset */}
          <button
            onClick={() => onChange(DEFAULT_CONFIG)}
            style={{
              width: '100%',
              padding: '6px 0',
              background: 'transparent',
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              color: ACCENT,
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: FONT,
              letterSpacing: 1,
            }}
          >
            RESET DEFAULTS
          </button>
        </div>
      )}
    </>
  );
}
