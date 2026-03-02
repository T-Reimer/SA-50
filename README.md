# Precision Popup Killer (SA-50)

A Chrome extension designed to surgically remove intrusive popups and UI elements from websites, including the Google "Sign in with Google" prompt and various sign-up forms.

## Features

### Global & Per-Site Targeting

- **Global Match List**: A persistent, global list of selectors or patterns to identify elements that should be destroyed across all websites (e.g., identity providers, common modal overlays).
- **Per-Site Match List**: Custom selectors and destruction rules specific to individual domains to handle site-specific annoyances.

### Destruction Methods

1.  **Nuke**: Completely remove the element from the DOM.
2.  **Hide**: Set the element's style to `display: none !important;`.
3.  **Click-to-Close**: Automatically identify and trigger a click event on a designated close button or backdrop.

### Disable "Sign in with Google"

This extension focuses on removing DOM elements. To disable the browser-native "Sign in with Google" prompt (FedCM), use Chrome's built-in settings:

1.  Go to **Settings**.
2.  Navigate to **Privacy and security**.
3.  Select **Site settings** > **Additional content settings**.
4.  Open **Third-party sign-in**.
5.  Select **Block third-party sign-in** (or toggle "Show sign-in prompts from these sites" to off).

---

## Architecture

### `src/background/storage.js`

Service worker module for rule persistence via `chrome.storage.sync`.

- `getGlobalRules()` / `setGlobalRules(rules)` — read/write the `globalRules` array.
- `getSiteRules(domain)` / `setSiteRules(domain, rules)` — read/write per-domain rule arrays under the `siteRules` object.
- `seedDefaultRules()` — idempotent seeding of default rules on first install (Google sign-in prompt, OneTrust consent SDK).

---

## Implemented Files

- **`src/background/background.js`** — MV3 service worker. Seeds two default global rules on install (`#credential_picker_container`, `#onetrust-consent-sdk`). Handles `GET_RULES` and `UPDATE_RULES` messages, reading/writing `globalRules` and `siteRules` keys in `chrome.storage.sync`.
- **`src/content/content.js`** — Main content script. Sends a `GET_RULES` message to the background on load, then runs an initial `querySelectorAll` scan across the entire document and starts a `MutationObserver` on `document.documentElement` to catch dynamically injected elements. Applies `nuke`, `hide`, and `click` destruction methods. Uses a `WeakSet` to prevent double-processing and `requestIdleCallback` (with a `setTimeout` fallback) to keep the observer callback lean.

---

## Popup UI

- **popup.html**: Header (extension title + active-tab domain), Global Rules section, Site Rules section, hidden `<template>` for the rule entry form, and a status message area.
- **popup.css**: Dark-themed (`#1e1e1e` background), 360 px width, system-ui font, rule cards with borders and border-radius, colour-coded method badges (`nuke`/`hide`/`click`), primary/danger/secondary button styles.
- **popup.js**: Vanilla JS with JSDoc types. On load: queries the active tab, extracts domain (strips `www.`), sends `GET_RULES` to the background service worker, then renders both rule lists. Supports add / edit / delete for both scopes, each operation persisting via `UPDATE_RULES`. Transient status messages auto-clear after 2 s.

---

## Decision Log

### 2026-03-02: Initial Project Structure

- **Global & Local Lists**: Decision to keep both a global list (for broad patterns like Google Login) and per-site lists for domain-specific popups.
- **Destruction Types**:
  - `nuke`: Remove from the DOM entirely.
  - `hide`: `display: none !important;`.
  - `click`: Simulate a click on the element or its designated closer.
- **Tech Stack**: Chrome Extension (Manifest V3) geared toward precision targeting and performance.

### 2026-03-02: Core Content Script

- **`src/content/content.js`**: Content script implemented. Requests rules from background (`GET_RULES`/`RULES_RESPONSE`), performs an initial full-document scan, and observes DOM mutations for dynamically injected elements. Observer defers work via `requestIdleCallback` to avoid competing with page rendering. `WeakSet` prevents reprocessing already-handled elements.

### 2026-03-02: Scaffold — Manifest & Type Definitions

- **`manifest.json`**: MV3 manifest created. Declares content script (`src/content/content.js` at `document_idle`), background service worker (`src/background/background.js`), action popup (`src/popup/popup.html`), `storage`/`activeTab`/`scripting` permissions, and `<all_urls>` host permissions.
- **`src/types/messages.d.ts`**: JSDoc `@typedef` definitions added for `Rule`, `SiteRules`, `DestructionMethod`, and the three message shapes (`GetRulesMessage`, `RulesResponseMessage`, `UpdateRulesMessage`) unified under `ExtensionMessage`.

## Technical Goals

- High performance to prevent "flash of intrusive content" (FOIC).
- Efficient matching using MutationObservers or declarative rules where possible.
- User-friendly configuration for adding and managing targets.
