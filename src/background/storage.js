/** @typedef {import('../types/messages.d.ts').Rule} Rule */

/** @type {Rule[]} */
const DEFAULT_GLOBAL_RULES = [
  {
    matchSelector: "#credential_picker_container",
    method: "nuke",
  },
  {
    matchSelector: "#onetrust-consent-sdk",
    method: "nuke",
  },
];

/**
 * Retrieves all global rules from storage.
 * @returns {Promise<Rule[]>}
 */
export async function getGlobalRules() {
  const result = await chrome.storage.sync.get("globalRules");
  return result.globalRules ?? [];
}

/**
 * Persists global rules to storage.
 * @param {Rule[]} rules
 * @returns {Promise<void>}
 */
export async function setGlobalRules(rules) {
  await chrome.storage.sync.set({ globalRules: rules });
}

/**
 * Retrieves rules for a specific domain from storage.
 * @param {string} domain
 * @returns {Promise<Rule[]>}
 */
export async function getSiteRules(domain) {
  const result = await chrome.storage.sync.get("siteRules");
  const siteRules = result.siteRules ?? {};
  return siteRules[domain] ?? [];
}

/**
 * Persists rules for a specific domain to storage.
 * @param {string} domain
 * @param {Rule[]} rules
 * @returns {Promise<void>}
 */
export async function setSiteRules(domain, rules) {
  const result = await chrome.storage.sync.get("siteRules");
  const siteRules = result.siteRules ?? {};
  siteRules[domain] = rules;
  await chrome.storage.sync.set({ siteRules });
}

/**
 * Seeds default global rules if storage has not yet been initialised.
 * Called once on extension install.
 * @returns {Promise<void>}
 */
export async function seedDefaultRules() {
  const result = await chrome.storage.sync.get("globalRules");
  if (result.globalRules === undefined) {
    await setGlobalRules(DEFAULT_GLOBAL_RULES);
  }
}
