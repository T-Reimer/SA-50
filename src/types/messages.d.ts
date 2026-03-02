/**
 * @typedef {'GET_RULES'|'RULES_RESPONSE'|'UPDATE_RULES'} MessageType
 */

/**
 * @typedef {'nuke'|'hide'|'click'} DestructionMethod
 */

/**
 * @typedef {Object} Rule
 * @property {string} matchSelector - CSS selector identifying the popup/intrusive element
 * @property {string} [clickSelector] - Element to programmatically click (used by 'click' method)
 * @property {string} [closerSelector] - Element to remove after click, or as independent removal target
 * @property {DestructionMethod} method - How to destroy the matched element
 */

/**
 * @typedef {Object} SiteRules
 * @property {Rule[]} global - Global rules applied to all pages
 * @property {Object.<string, Rule[]>} sites - Per-site rules keyed by domain (e.g. 'google.com')
 */

/**
 * @typedef {Object} GetRulesMessage
 * @property {'GET_RULES'} type
 * @property {string} domain - The current page's domain
 */

/**
 * @typedef {Object} RulesResponseMessage
 * @property {'RULES_RESPONSE'} type
 * @property {Rule[]} globalRules
 * @property {Rule[]} siteRules
 */

/**
 * @typedef {Object} UpdateRulesMessage
 * @property {'UPDATE_RULES'} type
 * @property {'global'|'site'} scope
 * @property {string} [domain] - Required when scope is 'site'
 * @property {Rule[]} rules
 */

/**
 * @typedef {GetRulesMessage|RulesResponseMessage|UpdateRulesMessage} ExtensionMessage
 */
