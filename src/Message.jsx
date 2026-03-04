import { useEffect, useRef } from 'react';
import messages from './data/messages.json';

const FADE_START_MS = 500;  // delay before first character starts fading
const FADE_STEP_MS = 100;   // stagger between each character fade

const message = messages[Math.floor(Math.random() * messages.length)];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Message() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    el.innerHTML = message
      .split('')
      .map(
        (l) =>
          `<span style="transition:opacity 0.5s">${l === ' ' ? '&nbsp;' : l}</span>`
      )
      .join('');

    const spans = Array.from(el.querySelectorAll('span'));
    const order = shuffle(spans.map((_, i) => i));
    const ids = [];
    let time = FADE_START_MS;

    for (const idx of order) {
      time += FADE_STEP_MS;
      ids.push(setTimeout(() => { spans[idx].style.opacity = '0'; }, time));
    }

    return () => ids.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      <div
        ref={ref}
        style={{
          color: 'white',
          fontFamily: "'Courier New', monospace",
          padding: '10px',
          textAlign: 'center',
          flexWrap: 'wrap',
          display: 'flex',
          justifyContent: 'center',
        }}
      />
    </div>
  );
}
