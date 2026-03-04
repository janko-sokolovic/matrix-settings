import { useEffect, useRef } from 'react';
import chars from './chars/chars';
import fontWoff from './fonts/matrix-code.woff?url';
import fontTtf from './fonts/matrix-code.ttf?url';

const BASE_FONT_SIZE = 24;
const SYMBOL_HEIGHT = 35;
const SYMBOL_WIDTH = 18;
const CHAR_INTERVAL = 550;
const FADE_IN_CHARS = 15;
const GLOW_CHANCE = 0.06;
const RAIN_MIN_DELAY = 1500;
const DYNAMIC_CHAR_CHANCE = 0.05;
const MIN_COL_FILL = 0.30;
const MAX_COL_FILL = 0.65;
const FG_MIN_ALPHA = 0.08;
const FG_ALPHA_RANGE = 0.92;

const THEMES = {
  green: { body: '#009a22', bodyShadow: '#36ba01', primary: '#8bff8b', primaryShadow: 'white' },
  blue:  { body: '#0055cc', bodyShadow: '#0099ff', primary: '#88ddff', primaryShadow: 'white' },
  red:   { body: '#aa0011', bodyShadow: '#ff3322', primary: '#ff9999', primaryShadow: 'white' },
};

function randomChar() {
  return chars[Math.floor(Math.random() * chars.length)];
}

function initColumn(w, h, foreground = false, lineLengthFactor = 1.0) {
  const scale = foreground
    ? 2.5 + Math.random() * 2.0
    : 0.8 + Math.random() * 0.6;

  const charH = Math.round(SYMBOL_HEIGHT * scale);
  const fontSize = Math.round(BASE_FONT_SIZE * scale);
  const fontStr = `${fontSize}px Matrix, monospace`;

  let length;
  if (foreground) {
    length = Math.max(3, Math.round(h / charH) + Math.floor(Math.random() * 3));
  } else {
    const minLen = Math.max(4, Math.round(h / SYMBOL_HEIGHT * MIN_COL_FILL * lineLengthFactor));
    const maxLen = Math.max(minLen + 2, Math.round(h / SYMBOL_HEIGHT * MAX_COL_FILL * lineLengthFactor));
    length = minLen + Math.floor(Math.random() * (maxLen - minLen + 1));
  }

  const fullHeight = (length + 1) * charH;
  const x = foreground
    ? Math.floor(Math.random() * Math.max(1, w - charH))
    : Math.floor(Math.random() * (Math.round((w - 20) / SYMBOL_WIDTH) + 1)) * SYMBOL_WIDTH;

  const durationSec = (5 + Math.random() * 5) / scale;
  const speed = (h + fullHeight) / durationSec;

  const colAlpha = foreground
    ? 1.0
    : 0.55 + ((scale - 0.8) / 0.6) * 0.45;

  const charCount = length + 1;
  const isDynamic = Array.from({ length: charCount }, (_, i) =>
    i === length ? true : Math.random() < DYNAMIC_CHAR_CHANCE
  );

  const glowSet = new Set();
  if (!foreground) {
    for (let i = 0; i < length; i++) {
      if (Math.random() < GLOW_CHANCE) glowSet.add(i);
    }
  }

  const startDelay = foreground
    ? RAIN_MIN_DELAY + 500 + Math.floor(Math.random() * 4000)
    : RAIN_MIN_DELAY + Math.floor(Math.random() * 8500);

  return {
    x, y: -fullHeight, length,
    scale, charH, fontStr, speed, colAlpha, foreground,
    chars: Array.from({ length: charCount }, randomChar),
    isDynamic, glowSet,
    lastCharUpdate: 0,
    startDelay,
    startDeadline: 0,
    effectiveAlpha: 0,
    started: false,
  };
}

export default function MatrixCanvas({ configRef }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;
    let columns = [];
    let lastTs = 0;
    const prevDensityRef = { current: '' };

    function getCfg() {
      return configRef ? configRef.current : {
        speedMultiplier: 1.0, columnCount: 100, foregroundCount: 10,
        lineLengthFactor: 1.0, glowIntensity: 1.0, theme: 'green',
      };
    }

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const cfg = getCfg();
      columns = [
        ...Array.from({ length: cfg.columnCount }, () =>
          initColumn(canvas.width, canvas.height, false, cfg.lineLengthFactor)),
        ...Array.from({ length: cfg.foregroundCount }, () =>
          initColumn(canvas.width, canvas.height, true, cfg.lineLengthFactor)),
      ];
      prevDensityRef.current = `${cfg.columnCount}-${cfg.foregroundCount}-${cfg.lineLengthFactor}`;
    }

    function tick(ts) {
      const delta = Math.min(ts - lastTs, 50);
      lastTs = ts;

      const cfg = getCfg();
      const theme = THEMES[cfg.theme] || THEMES.green;

      // Density reinit
      const densityKey = `${cfg.columnCount}-${cfg.foregroundCount}-${cfg.lineLengthFactor}`;
      if (densityKey !== prevDensityRef.current) {
        prevDensityRef.current = densityKey;
        columns = [
          ...Array.from({ length: cfg.columnCount }, () =>
            initColumn(canvas.width, canvas.height, false, cfg.lineLengthFactor)),
          ...Array.from({ length: cfg.foregroundCount }, () =>
            initColumn(canvas.width, canvas.height, true, cfg.lineLengthFactor)),
        ];
        columns.forEach(col => { col.started = true; col.lastCharUpdate = ts; });
      }

      ctx.fillStyle = '#010101';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.textBaseline = 'top';

      // Pre-pass
      for (const col of columns) {
        if (!col.started) continue;
        col.effectiveAlpha = col.foreground
          ? Math.max(FG_MIN_ALPHA, 1.0 - Math.max(0, col.y / canvas.height) * FG_ALPHA_RANGE)
          : col.colAlpha;
      }

      // Pass 1: body characters
      ctx.fillStyle = theme.body;
      ctx.shadowColor = theme.bodyShadow;
      ctx.shadowBlur = 1 * cfg.glowIntensity;

      for (const col of columns) {
        if (!col.started) continue;
        ctx.font = col.fontStr;
        for (let i = 0; i < col.length; i++) {
          if (col.glowSet.has(i)) continue;
          const charY = col.y - (col.length - i) * col.charH;
          if (charY + col.charH < 0 || charY > canvas.height) continue;
          const fadeOpacity = i < FADE_IN_CHARS ? (i + 1) / FADE_IN_CHARS : 1;
          ctx.globalAlpha = fadeOpacity * col.effectiveAlpha;
          ctx.fillText(col.chars[i], col.x, charY);
        }
      }

      // Pass 2: leading character
      ctx.fillStyle = theme.primary;
      ctx.shadowColor = theme.primaryShadow;
      ctx.shadowBlur = 10 * cfg.glowIntensity;

      for (const col of columns) {
        if (!col.started) continue;
        ctx.font = col.fontStr;
        const primaryY = col.y;
        if (primaryY + col.charH >= 0 && primaryY <= canvas.height) {
          ctx.globalAlpha = col.foreground ? col.effectiveAlpha : 1;
          ctx.fillText(col.chars[col.length], col.x, primaryY);
        }
      }

      // Pass 3: glowing body characters
      ctx.fillStyle = theme.primary;
      ctx.shadowColor = theme.primaryShadow;
      ctx.shadowBlur = 5 * cfg.glowIntensity;

      for (const col of columns) {
        if (!col.started || col.glowSet.size === 0) continue;
        ctx.font = col.fontStr;
        for (const idx of col.glowSet) {
          const charY = col.y - (col.length - idx) * col.charH;
          if (charY + col.charH < 0 || charY > canvas.height) continue;
          const fadeOpacity = idx < FADE_IN_CHARS ? (idx + 1) / FADE_IN_CHARS : 1;
          ctx.globalAlpha = fadeOpacity * 0.9;
          ctx.fillText(col.chars[idx], col.x, charY);
        }
      }

      ctx.restore();

      // Update positions and chars
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        if (!col.started) {
          if (col.startDeadline === 0) col.startDeadline = ts + col.startDelay;
          if (ts >= col.startDeadline) { col.started = true; col.lastCharUpdate = ts; }
          continue;
        }

        col.y += col.speed * cfg.speedMultiplier * (delta / 1000);

        if (ts - col.lastCharUpdate >= CHAR_INTERVAL) {
          col.lastCharUpdate = ts;
          for (let j = 0; j < col.chars.length; j++) {
            if (col.isDynamic[j]) col.chars[j] = randomChar();
          }
        }

        if (col.y > canvas.height + col.length * col.charH) {
          const fg = col.foreground;
          columns[i] = initColumn(canvas.width, canvas.height, fg, cfg.lineLengthFactor);
          columns[i].started = true;
          columns[i].lastCharUpdate = ts;
        }
      }

      rafId = requestAnimationFrame(tick);
    }

    const font = new FontFace(
      'Matrix',
      `url(${fontWoff}) format('woff'), url(${fontTtf}) format('truetype')`
    );
    font.load().then((loaded) => {
      document.fonts.add(loaded);
      resize();
      window.addEventListener('resize', resize);
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', position: 'fixed', top: 0, left: 0 }}
    />
  );
}
