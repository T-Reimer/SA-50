# SA-50: Precision Popup Killer — Build Plan

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Phase 1: Project Scaffolding

- [x] Create `manifest.json` (Manifest V3) with required permissions (`storage`, `activeTab`, `scripting`) and `host_permissions: ["<all_urls>"]`
- [x] Declare content script via the `content_scripts` array in `manifest.json` (declarative injection)
- [x] Define extension icons (16, 48, 128px) — generate with Nano Banana
- [x] Set up folder structure:
  - `src/` — source files
  - `src/content/` — content scripts
  - `src/background/` — service worker
  - `src/popup/` — extension popup UI
  - `src/types/` — type/interface definitions
  - `assets/icons/` — extension icons
- [x] Create `src/types/messages.d.ts` — JSDoc-compatible interface definitions for the content ↔ background message protocol

---

## Phase 2: Storage & Configuration

- [x] Define storage schema for global match list
- [x] Define storage schema for per-site match lists (keyed by domain)
  - Rule shape: `{ matchSelector, clickSelector, closerSelector, method }`
    - `matchSelector` — CSS selector identifying the popup/intrusive element
    - `clickSelector` — element to programmatically click (used by `click` method)
    - `closerSelector` — element to remove after click, or as an independent removal target
- [x] Implement read/write helpers for `chrome.storage.sync`
- [x] Add default global rules (e.g., Google "Sign in" prompt selector)

---

## Phase 3: Core Logic

- [x] Define message protocol in `src/types/messages.d.ts`
  - Message types: e.g., `GET_RULES`, `RULES_RESPONSE`, `UPDATE_RULES`
  - Use `@typedef` JSDoc annotations referencing these interfaces in `.js` files
- [x] Implement `content.js` — main content script injected into pages
  - [x] MutationObserver to watch for dynamically injected elements
  - [x] Match logic against global target list
  - [x] Match logic against per-site target list for the current domain
  - [x] Destruction methods: `nuke`, `hide`, `click`
    - `nuke` — remove element from the DOM entirely
    - `hide` — set `display: none !important`
    - `click` — query `clickSelector` and dispatch a click event; optionally query `closerSelector` and remove it from the DOM
- [x] Implement `background.js` — service worker (Manifest V3)
  - [x] Listen for messages from content scripts and popup using the protocol defined in `messages.d.ts`
  - [x] Load and persist rule lists via `chrome.storage.sync`

---

## Phase 4: Popup UI

- [x] Create `popup.html` — extension popup layout
- [x] Create `popup.js` — popup logic
  - [x] Display and edit global match list
  - [x] Display and edit per-site match list for the active tab's domain
  - [x] Add/remove/edit entries with fields: `matchSelector`, `clickSelector`, `closerSelector`, and `method` (`nuke`/`hide`/`click`)
- [x] Basic styling (`popup.css`)

---

## Phase 5: Build & Local Installation

- [x] Verify all files referenced in `manifest.json` exist
- [ ] Test the unpacked extension in Chrome:
  1. Open `chrome://extensions`
  2. Enable **Developer mode**
  3. Click **Load unpacked** and select the project root (or `dist/` if using a build step)
- [ ] Validate content script injection on a test page
- [ ] Validate popup UI loads and reads/writes storage correctly
- [ ] Validate each destruction method (`nuke`, `hide`, `click`) works as expected

---

## Phase 6: Polish & Hardening

- [ ] Audit selectors for unintended matches (follow Strict Selectors rule)
- [ ] Profile performance — ensure no FOIC (flash of intrusive content)
- [ ] Handle edge cases: iframes, shadow DOM, SPA re-renders
- [ ] Update `README.md` after each completed feature

---

## Notes

- Tech stack: Vanilla JS, Chrome Extension Manifest V3, `chrome.storage.sync`
- No build toolchain required initially — ship as unpacked extension
- Introduce a build step (e.g., `esbuild`) only if module bundling becomes necessary
