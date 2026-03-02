/**
 * @file content.js
 * @description Main content script for the Precision Popup Killer extension.
 * Injected into all pages via manifest.json. Watches for intrusive elements
 * (popups, overlays, sign-in prompts, etc.) and destroys them using configured rules.
 */

// ---------------------------------------------------------------------------
// Type imports (JSDoc only — referenced from src/types/messages.d.ts once created)
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} Rule
 * @property {string}  matchSelector   - CSS selector that identifies the target element.
 * @property {'nuke'|'hide'|'click'} method - Destruction method to apply.
 * @property {string}  [clickSelector]  - Element to programmatically click (used by `click` method).
 * @property {string}  [closerSelector] - Element to remove after click, or as a standalone removal target.
 */

/**
 * @typedef {Object} GetRulesMessage
 * @property {'GET_RULES'} type
 * @property {string} domain
 */

/**
 * @typedef {Object} RulesResponseMessage
 * @property {'RULES_RESPONSE'} type
 * @property {Rule[]} globalRules - Rules applied on every page.
 * @property {Rule[]} siteRules   - Rules scoped to the current domain.
 */

// ---------------------------------------------------------------------------
// Domain extraction
// ---------------------------------------------------------------------------

/**
 * Strips the leading 'www.' prefix and returns a normalised hostname.
 *
 * @returns {string} The current page's domain (e.g. 'example.com').
 */
function getCurrentDomain() {
  return window.location.hostname.replace(/^www\./, "");
}

const currentDomain = getCurrentDomain();

// ---------------------------------------------------------------------------
// Destruction helpers
// ---------------------------------------------------------------------------

/**
 * Tracks elements that have already been processed so we never run a rule
 * against the same node twice, regardless of how many mutation batches fire.
 *
 * WeakSet is used so processed elements are GC-eligible once removed from the DOM.
 *
 * @type {WeakSet<Element>}
 */
const processed = new WeakSet();

/**
 * Applies one destruction rule to a matching element.
 *
 * @param {Element} element - The DOM element to destroy.
 * @param {Rule}    rule    - The rule whose method should be applied.
 * @returns {void}
 */
function applyRule(element, rule) {
  switch (rule.method) {
    case "nuke":
      element.remove();
      break;

    case "hide":
      // Use setProperty with 'important' so the rule overrides inline styles set
      // by the page itself and resists re-application from page scripts.
      element.style.setProperty("display", "none", "important");
      break;

    case "click": {
      // Click the designated closer button inside (or relative to) the element.
      const clickTarget = rule.clickSelector
        ? element.querySelector(rule.clickSelector)
        : null;

      if (clickTarget) {
        clickTarget.dispatchEvent(
          new MouseEvent("click", { bubbles: true, cancelable: true }),
        );
      }

      // Optionally remove a residual overlay / backdrop that persists after the click.
      if (rule.closerSelector) {
        const closer = document.querySelector(rule.closerSelector);
        if (closer) {
          closer.remove();
        }
      }
      break;
    }

    default:
      // Unknown method — log in development; silent in production.
      // eslint-disable-next-line no-console
      console.warn("[PPK] Unknown rule method:", rule.method, rule);
  }
}

// ---------------------------------------------------------------------------
// Rule application
// ---------------------------------------------------------------------------

/**
 * Checks a single element against every rule in the provided lists.
 * Marks the element as processed before acting so repeat calls are no-ops.
 *
 * @param {Element} element     - The element to test.
 * @param {Rule[]}  globalRules - Extension-wide rules.
 * @param {Rule[]}  siteRules   - Domain-scoped rules for the current page.
 * @returns {void}
 */
function checkElement(element, globalRules, siteRules) {
  if (processed.has(element)) return;

  const allRules = [...globalRules, ...siteRules];

  for (const rule of allRules) {
    if (!rule.matchSelector) continue;

    try {
      if (element.matches(rule.matchSelector)) {
        // Mark first to prevent any re-entrant calls from processing again.
        processed.add(element);
        applyRule(element, rule);
        // A single element may only be destroyed once — stop after first match.
        return;
      }
    } catch (e) {
      // Guard against malformed selectors crashing the observer loop.
      // eslint-disable-next-line no-console
      console.warn("[PPK] Invalid matchSelector:", rule.matchSelector, e);
    }
  }
}

/**
 * Queries the entire document for every rule selector and applies rules to
 * any matches. Called once after rules are first loaded.
 *
 * @param {Rule[]} globalRules - Extension-wide rules.
 * @param {Rule[]} siteRules   - Domain-scoped rules for the current page.
 * @returns {void}
 */
function scanDocument(globalRules, siteRules) {
  const allRules = [...globalRules, ...siteRules];

  for (const rule of allRules) {
    if (!rule.matchSelector) continue;

    let matches;
    try {
      matches = document.querySelectorAll(rule.matchSelector);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(
        "[PPK] Invalid matchSelector during scan:",
        rule.matchSelector,
        e,
      );
      continue;
    }

    for (const el of matches) {
      if (!processed.has(el)) {
        processed.add(el);
        applyRule(el, rule);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// MutationObserver
// ---------------------------------------------------------------------------

/**
 * Processes a batch of MutationRecords.  Only examines newly added nodes that
 * are Element instances — text nodes and other types are ignored.
 *
 * Deliberately avoids any layout-triggering reads (offsetWidth, getBoundingClientRect,
 * etc.) inside the callback to keep the observer lean.
 *
 * @param {MutationRecord[]} mutationsList - Batch of mutations from the observer.
 * @param {Rule[]}           globalRules  - Extension-wide rules.
 * @param {Rule[]}           siteRules    - Domain-scoped rules for the current page.
 * @returns {void}
 */
function handleMutations(mutationsList, globalRules, siteRules) {
  for (const mutation of mutationsList) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof Element)) continue;

      // Check the added node itself.
      checkElement(node, globalRules, siteRules);

      // Also walk its subtree — deeply nested popups may be injected inside
      // a wrapper that itself doesn't match any selector.
      const allRules = [...globalRules, ...siteRules];
      for (const rule of allRules) {
        if (!rule.matchSelector) continue;

        let descendants;
        try {
          descendants = node.querySelectorAll(rule.matchSelector);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn(
            "[PPK] Invalid matchSelector in subtree scan:",
            rule.matchSelector,
            e,
          );
          continue;
        }

        for (const descendant of descendants) {
          if (!processed.has(descendant)) {
            processed.add(descendant);
            applyRule(descendant, rule);
          }
        }
      }
    }
  }
}

/**
 * Creates, configures, and starts the MutationObserver.
 *
 * @param {Rule[]} globalRules - Extension-wide rules.
 * @param {Rule[]} siteRules   - Domain-scoped rules for the current page.
 * @returns {MutationObserver} The active observer instance.
 */
function startObserver(globalRules, siteRules) {
  const observer = new MutationObserver((mutationsList) => {
    // Defer processing to an idle period when available to avoid competing
    // with the page's own rendering work.
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(
        () => handleMutations(mutationsList, globalRules, siteRules),
        { timeout: 300 },
      );
    } else {
      // Fallback: use a zero-delay setTimeout so at minimum we yield to the
      // browser before running (avoids forced synchronous style recalculation).
      setTimeout(
        () => handleMutations(mutationsList, globalRules, siteRules),
        0,
      );
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Requests rules from the background service worker, then kicks off the
 * initial document scan and starts the MutationObserver.
 *
 * @returns {void}
 */
function init() {
  /** @type {GetRulesMessage} */
  const request = { type: "GET_RULES", domain: currentDomain };

  chrome.runtime.sendMessage(
    request,
    (/** @type {RulesResponseMessage} */ response) => {
      // Guard against extension context being invalidated or background not ready.
      if (chrome.runtime.lastError) {
        // eslint-disable-next-line no-console
        console.warn(
          "[PPK] Could not reach background:",
          chrome.runtime.lastError.message,
        );
        return;
      }

      if (!response || response.type !== "RULES_RESPONSE") {
        // eslint-disable-next-line no-console
        console.warn("[PPK] Unexpected response from background:", response);
        return;
      }

      const globalRules = Array.isArray(response.globalRules)
        ? response.globalRules
        : [];
      const siteRules = Array.isArray(response.siteRules)
        ? response.siteRules
        : [];

      // 1. Process any elements already present in the DOM.
      scanDocument(globalRules, siteRules);

      // 2. Watch for future injections.
      startObserver(globalRules, siteRules);
    },
  );
}

// Kick off once the script is evaluated (content scripts run after DOM is ready
// depending on `run_at`, but init() is safe to call at any point).
init();
