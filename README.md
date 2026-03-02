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

---

## Decision Log

### 2026-03-02: Initial Project Structure
- **Global & Local Lists**: Decision to keep both a global list (for broad patterns like Google Login) and per-site lists for domain-specific popups.
- **Destruction Types**:
    - `nuke`: Remove from the DOM entirely.
    - `hide`: `display: none !important;`.
    - `click`: Simulate a click on the element or its designated closer.
- **Tech Stack**: Chrome Extension (Manifest V3) geared toward precision targeting and performance.

## Technical Goals
- High performance to prevent "flash of intrusive content" (FOIC).
- Efficient matching using MutationObservers or declarative rules where possible.
- User-friendly configuration for adding and managing targets.
