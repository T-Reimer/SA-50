# SA-50: Precision Popup Killer — Build Plan

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete

---

## Phase 1: Project Scaffolding

- [ ] Create `manifest.json` (Manifest V3) with required permissions (`storage`, `activeTab`, `scripting`) and `host_permissions: ["<all_urls>"]`
- [ ] Declare content script via the `content_scripts` array in `manifest.json` (declarative injection)
- [ ] Define extension icons (16, 48, 128px) — generate with Nano Banana
- [ ] Set up folder structure:
  - `src/` — source files
  - `src/content/` — content scripts
  - `src/background/` — service worker
  - `src/popup/` — extension popup UI
  - `src/types/` — type/interface definitions
  - `assets/icons/` — extension icons
- [ ] Create `src/types/messages.d.ts` — JSDoc-compatible interface definitions for the content ↔ background message protocol

---

## Phase 2: Storage & Configuration

- [ ] Define storage schema for global match list
- [ ] Define storage schema for per-site match lists (keyed by domain)
  - Rule shape: `{ matchSelector, clickSelector, closerSelector, method }`
    - `matchSelector` — CSS selector identifying the popup/intrusive element
    - `clickSelector` — element to programmatically click (used by `click` method)
    - `closerSelector` — element to remove after click, or as an independent removal target
- [ ] Implement read/write helpers for `chrome.storage.sync`
- [ ] Add default global rules (e.g., Google "Sign in" prompt selector)

---

## Phase 3: Core Logic

- [ ] Define message protocol in `src/types/messages.d.ts`
  - Message types: e.g., `GET_RULES`, `RULES_RESPONSE`, `UPDATE_RULES`
  - Use `@typedef` JSDoc annotations referencing these interfaces in `.js` files
- [ ] Implement `content.js` — main content script injected into pages
  - [ ] MutationObserver to watch for dynamically injected elements
  - [ ] Match logic against global target list
  - [ ] Match logic against per-site target list for the current domain
  - [ ] Destruction methods: `nuke`, `hide`, `click`
    - `nuke` — remove element from the DOM entirely
    - `hide` — set `display: none !important`
    - `click` — query `clickSelector` and dispatch a click event; optionally query `closerSelector` and remove it from the DOM
- [ ] Implement `background.js` — service worker (Manifest V3)
  - [ ] Listen for messages from content scripts and popup using the protocol defined in `messages.d.ts`
  - [ ] Load and persist rule lists via `chrome.storage.sync`

---

## Phase 4: Popup UI

- [ ] Create `popup.html` — extension popup layout
- [ ] Create `popup.js` — popup logic
  - [ ] Display and edit global match list
  - [ ] Display and edit per-site match list for the active tab's domain
  - [ ] Add/remove/edit entries with fields: `matchSelector`, `clickSelector`, `closerSelector`, and `method` (`nuke`/`hide`/`click`)
- [ ] Basic styling (`popup.css`)

---

## Phase 5: Build & Local Installation

- [ ] Verify all files referenced in `manifest.json` exist
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
