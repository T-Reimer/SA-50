/**
 * @file background.js
 * @description Manifest V3 service worker for Precision Popup Killer (SA-50).
 * Handles storage seeding on install and mediates rule access for content scripts and popup.
 *
 * @typedef {import('../types/messages.d.ts').Rule} Rule
 * @typedef {import('../types/messages.d.ts').GetRulesMessage} GetRulesMessage
 * @typedef {import('../types/messages.d.ts').RulesResponseMessage} RulesResponseMessage
 * @typedef {import('../types/messages.d.ts').UpdateRulesMessage} UpdateRulesMessage
 */

'use strict';

/** @type {Rule[]} */
const DEFAULT_GLOBAL_RULES = [
  { matchSelector: '#credential_picker_container', method: 'nuke' }, // Google sign-in prompt
  { matchSelector: '#onetrust-consent-sdk',        method: 'nuke' }, // OneTrust cookie banner
];

// ---------------------------------------------------------------------------
// Install: seed default rules if storage is empty
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return;

  const { globalRules } = await chrome.storage.sync.get({ globalRules: null });

  if (globalRules === null) {
    await chrome.storage.sync.set({ globalRules: DEFAULT_GLOBAL_RULES });
  }

  // Ensure the siteRules key exists so reads never hit undefined
  const { siteRules } = await chrome.storage.sync.get({ siteRules: null });
  if (siteRules === null) {
    await chrome.storage.sync.set({ siteRules: {} });
  }
});

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'GET_RULES':
      handleGetRules(/** @type {GetRulesMessage} */ (message)).then(sendResponse);
      return true; // keep message channel open for async response

    case 'UPDATE_RULES':
      handleUpdateRules(/** @type {UpdateRulesMessage} */ (message)).then(() => {
        sendResponse({ type: 'UPDATE_RULES_ACK', ok: true });
      });
      return true;

    default:
      return false;
  }
});

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

/**
 * Reads global rules and the per-domain site rules, then returns them.
 * @param {GetRulesMessage} message
 * @returns {Promise<RulesResponseMessage>}
 */
async function handleGetRules(message) {
  const { domain } = message;

  const result = await chrome.storage.sync.get({
    globalRules: DEFAULT_GLOBAL_RULES,
    siteRules:   {},
  });

  /** @type {Rule[]} */
  const domainRules = (result.siteRules[domain]) || [];

  return {
    type:        'RULES_RESPONSE',
    globalRules: result.globalRules,
    siteRules:   domainRules,
  };
}

/**
 * Persists an updated rule list for either the global scope or a specific domain.
 * @param {UpdateRulesMessage} message
 * @returns {Promise<void>}
 */
async function handleUpdateRules(message) {
  const { scope, domain, rules } = message;

  if (scope === 'global') {
    await chrome.storage.sync.set({ globalRules: rules });
    return;
  }

  if (scope === 'site' && domain) {
    const { siteRules } = await chrome.storage.sync.get({ siteRules: {} });
    siteRules[domain] = rules;
    await chrome.storage.sync.set({ siteRules });
  }
}
