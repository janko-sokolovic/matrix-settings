# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install       # Install dependencies
npm start         # Run dev server (localhost:3000)
npm run build     # Production build
npm test          # Run tests (Jest/jsdom)
npm run deploy    # Deploy to GitHub Pages (gh-pages -d build)
```

## Architecture

This is a Create React App (React 16) project that renders a Matrix-style code rain animation.

**Component hierarchy:**
- `App` → renders `Matrix`
- `Matrix` → renders 100 `Code` columns + a `Message` overlay
- `Code` → a falling column of `Symbol` components; position/speed/scale are randomized in `componentWillMount`/`componentDidMount` using CSS transitions
- `Symbol` → a single character; the leading (primary) symbol and ~5% of others cycle characters every 550ms via `setInterval`

**Key data files:**
- `src/chars/chars.js` — alphanumeric + special character pool used by `Symbol`
- `src/data/messages.json` — Matrix-themed quotes displayed as the overlay message

**Animation approach:**
- Falling columns use CSS `transition: top linear Xs` triggered by a `setState` in `componentDidMount` after a random delay (300–10000ms)
- The message overlay uses `AnimateText.js` (an IIFE module), which splits text into `<span>` elements and fades them out randomly after a 500ms initial delay

**Note:** The codebase uses the deprecated `componentWillMount` lifecycle method (React 16 pattern). Redux and react-redux are listed as dependencies but are not actually used.
