import { useEffect, useRef } from 'react';
import chars from './chars/chars';
import fontWoff from './fonts/matrix-code.woff?url';
import fontTtf from './fonts/matrix-code.ttf?url';

const COLUMN_COUNT = 100;
const FOREGROUND_COUNT = 10;
const BASE_FONT_SIZE = 24;
const SYMBOL_HEIGHT = 35;
const SYMBOL_WIDTH = 18;
const CHAR_INTERVAL = 550;
const FADE_IN_CHARS = 15;
const GLOW_CHANCE = 0.06;
const RAIN_MIN_DELAY = 1500;
const DYNAMIC_CHAR_CHANCE = 0.05; // fraction of body chars that cycle glyphs
const MIN_COL_FILL = 0.30;        // min column height as fraction of screen
const MAX_COL_FILL = 0.65;        // max column height as fraction of screen
const FG_MIN_ALPHA = 0.08;        // foreground opacity floor (at bottom — closest to camera)
const FG_ALPHA_RANGE = 0.92;      // foreground alpha decrease over full screen height

function randomChar() {
  return chars[Math.floor(Math.random() * chars.length)];
}

function initColumn(w, h, foreground = false) {
  const scale = foreground
    ? 2.5 + Math.random() * 2.0
    : 0.8 + Math.random() * 0.6;

  // Cache static per-column values — reused on every draw call
  const charH = Math.round(SYMBOL_HEIGHT * scale);
  const fontSize = Math.round(BASE_FONT_SIZE * scale);
  const fontStr = `${fontSize}px Matrix, monospace`;

  let length;
  if (foreground) {
    length = Math.max(3, Math.round(h / charH) + Math.floor(Math.random() * 3));
  } else {
    const minLen = Math.max(4, Math.round(h / SYMBOL_HEIGHT * MIN_COL_FILL));
    const maxLen = Math.max(minLen + 2, Math.round(h / SYMBOL_HEIGHT * MAX_COL_FILL));
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
    startDeadline: 0,  // set to ts + startDelay on first RAF encounter
    effectiveAlpha: 0, // computed once per frame in pre-pass
    started: false,
  };
}

export default function MatrixCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let rafId;
    let columns = [];
    let lastTs = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = [
        ...Array.from({ length: COLUMN_COUNT }, () => initColumn(canvas.width, canvas.height, false)),
        ...Array.from({ length: FOREGROUND_COUNT }, () => initColumn(canvas.width, canvas.height, true)),
      ];
    }

    function tick(ts) {
      const delta = Math.min(ts - lastTs, 50);
      lastTs = ts;

      ctx.fillStyle = '#010101';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.textBaseline = 'top';

      // Pre-pass: compute effectiveAlpha once per started column
      // (avoids duplicating the same calculation in passes 1 and 2)
      for (const col of columns) {
        if (!col.started) continue;
        col.effectiveAlpha = col.foreground
          ? Math.max(FG_MIN_ALPHA, 1.0 - Math.max(0, col.y / canvas.height) * FG_ALPHA_RANGE)
          : col.colAlpha;
      }

      // --- Pass 1: regular body characters ---
      ctx.fillStyle = '#009a22';
      ctx.shadowColor = '#36ba01';
      ctx.shadowBlur = 1;

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

      // --- Pass 2: primary (leading) character ---
      ctx.fillStyle = '#8bff8b';
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 10;

      for (const col of columns) {
        if (!col.started) continue;
        ctx.font = col.fontStr;
        const primaryY = col.y;
        if (primaryY + col.charH >= 0 && primaryY <= canvas.height) {
          ctx.globalAlpha = col.foreground ? col.effectiveAlpha : 1;
          ctx.fillText(col.chars[col.length], col.x, primaryY);
        }
      }

      // --- Pass 3: randomly glowing body characters (background only) ---
      ctx.fillStyle = '#8bff8b';
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 5;

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

      // --- Update positions and chars ---
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];

        if (!col.started) {
          if (col.startDeadline === 0) col.startDeadline = ts + col.startDelay;
          if (ts >= col.startDeadline) { col.started = true; col.lastCharUpdate = ts; }
          continue;
        }

        col.y += col.speed * (delta / 1000);

        if (ts - col.lastCharUpdate >= CHAR_INTERVAL) {
          col.lastCharUpdate = ts;
          for (let j = 0; j < col.chars.length; j++) {
            if (col.isDynamic[j]) col.chars[j] = randomChar();
          }
        }

        if (col.y > canvas.height + col.length * col.charH) {
          const fg = col.foreground;
          columns[i] = initColumn(canvas.width, canvas.height, fg);
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
