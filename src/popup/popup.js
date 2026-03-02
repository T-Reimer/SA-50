/**
 * @file popup.js
 * Precision Popup Killer — popup UI logic.
 */

// ── Type definitions ──────────────────────────────────────────────────────────

/**
 * @typedef {'nuke'|'hide'|'click'} RuleMethod
 */

/**
 * @typedef {Object} Rule
 * @property {string}        matchSelector
 * @property {string}       [clickSelector]
 * @property {string}       [closerSelector]
 * @property {RuleMethod}    method
 */

/**
 * @typedef {Object} GetRulesMessage
 * @property {'GET_RULES'} type
 * @property {string}      domain
 */

/**
 * @typedef {Object} UpdateRulesMessage
 * @property {'UPDATE_RULES'}    type
 * @property {'global'|'site'}   scope
 * @property {string}           [domain]
 * @property {Rule[]}            rules
 */

/**
 * @typedef {Object} RulesResponse
 * @property {'RULES_RESPONSE'} type
 * @property {Rule[]}           globalRules
 * @property {Rule[]}           siteRules
 */

// ── State ─────────────────────────────────────────────────────────────────────

/** @type {string} */
let currentDomain = "";

/** @type {Rule[]} */
let globalRules = [];

/** @type {Rule[]} */
let siteRules = [];

// ── DOM refs ──────────────────────────────────────────────────────────────────

const domainEl = /** @type {HTMLElement}    */ (
  document.getElementById("current-domain")
);
const globalListEl = /** @type {HTMLElement}    */ (
  document.getElementById("global-rules-list")
);
const siteListEl = /** @type {HTMLElement}    */ (
  document.getElementById("site-rules-list")
);
const addGlobalBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById("add-global-rule")
);
const addSiteBtn = /** @type {HTMLButtonElement} */ (
  document.getElementById("add-site-rule")
);
const statusEl = /** @type {HTMLElement}    */ (
  document.getElementById("status-msg")
);
const formTemplate = /** @type {HTMLTemplateElement} */ (
  document.getElementById("rule-form-template")
);

/** @type {ReturnType<typeof setTimeout>|null} */
let statusTimer = null;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the domain from a URL, stripping the leading 'www.'.
 * @param {string} url
 * @returns {string}
 */
function extractDomain(url) {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Display a transient status message.
 * @param {string}            text
 * @param {'success'|'error'} [kind='success']
 */
function showStatus(text, kind = "success") {
  if (statusTimer !== null) clearTimeout(statusTimer);
  statusEl.textContent = text;
  statusEl.className = kind;
  statusEl.classList.remove("hidden");
  statusTimer = setTimeout(() => {
    statusEl.classList.add("hidden");
    statusEl.textContent = "";
  }, 2000);
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/**
 * Build a method badge element.
 * @param {RuleMethod} method
 * @returns {HTMLElement}
 */
function buildMethodBadge(method) {
  const badge = document.createElement("span");
  badge.className = `method-badge ${method}`;
  badge.textContent = method;
  return badge;
}

/**
 * Build a rule card element.
 * @param {Rule}                  rule
 * @param {number}                index
 * @param {'global'|'site'}       scope
 * @returns {HTMLElement}
 */
function buildRuleCard(rule, index, scope) {
  const card = document.createElement("div");
  card.className = "rule-card";

  // Info column
  const info = document.createElement("div");
  info.className = "rule-card-info";

  const selector = document.createElement("div");
  selector.className = "rule-card-selector";
  selector.textContent = rule.matchSelector;
  info.appendChild(selector);

  const meta = document.createElement("div");
  meta.className = "rule-card-meta";
  meta.appendChild(buildMethodBadge(rule.method));

  if (rule.clickSelector) {
    const cs = document.createElement("span");
    cs.textContent = `click: ${rule.clickSelector}`;
    meta.appendChild(cs);
    meta.appendChild(document.createTextNode(" "));
  }

  if (rule.closerSelector) {
    const cl = document.createElement("span");
    cl.textContent = `closer: ${rule.closerSelector}`;
    meta.appendChild(cl);
  }

  info.appendChild(meta);
  card.appendChild(info);

  // Action buttons
  const actions = document.createElement("div");
  actions.className = "rule-card-actions";

  const editBtn = document.createElement("button");
  editBtn.className = "btn btn-secondary btn-xs";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", () =>
    handleEditRule(index, scope, card, rule),
  );

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-danger btn-xs";
  deleteBtn.textContent = "Del";
  deleteBtn.addEventListener("click", () => handleDeleteRule(index, scope));

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);
  card.appendChild(actions);

  return card;
}

/**
 * Render a rules array into a container element.
 * @param {Rule[]}              rules
 * @param {HTMLElement}         container
 * @param {'global'|'site'}     scope
 */
function renderRules(rules, container, scope) {
  container.innerHTML = "";
  if (rules.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No rules yet.";
    container.appendChild(empty);
    return;
  }
  rules.forEach((rule, i) => {
    container.appendChild(buildRuleCard(rule, i, scope));
  });
}

// ── Form ──────────────────────────────────────────────────────────────────────

/**
 * Create and return a rule entry form element.
 * @param {Rule|null}                       prefill  Existing rule data for edit mode.
 * @param {(rule: Rule) => void}            onSave
 * @param {() => void}                      onCancel
 * @returns {HTMLFormElement}
 */
function buildRuleForm(prefill, onSave, onCancel) {
  const fragment = /** @type {DocumentFragment} */ (
    formTemplate.content.cloneNode(true)
  );
  const form = /** @type {HTMLFormElement} */ (fragment.querySelector("form"));

  /** @param {string} name @returns {HTMLInputElement|HTMLSelectElement} */
  const field = (name) => /** @type {any} */ (form.elements.namedItem(name));

  if (prefill) {
    field("matchSelector").value = prefill.matchSelector;
    field("clickSelector").value = prefill.clickSelector ?? "";
    field("closerSelector").value = prefill.closerSelector ?? "";
    field("method").value = prefill.method;
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const matchSelector = field("matchSelector").value.trim();
    const clickSelector = field("clickSelector").value.trim() || undefined;
    const closerSelector = field("closerSelector").value.trim() || undefined;
    const method = /** @type {RuleMethod} */ (field("method").value);

    if (!matchSelector) {
      showStatus("Match Selector is required.", "error");
      return;
    }

    onSave({ matchSelector, clickSelector, closerSelector, method });
  });

  const cancelBtn = form.querySelector(".cancel-btn");
  cancelBtn?.addEventListener("click", onCancel);

  return form;
}

// ── Background communication ──────────────────────────────────────────────────

/**
 * Send UPDATE_RULES to the background service worker.
 * @param {'global'|'site'} scope
 * @param {Rule[]}          rules
 * @returns {Promise<void>}
 */
async function persistRules(scope, rules) {
  /** @type {UpdateRulesMessage} */
  const msg = {
    type: "UPDATE_RULES",
    scope,
    rules,
    ...(scope === "site" ? { domain: currentDomain } : {}),
  };
  await chrome.runtime.sendMessage(msg);
}

// ── Event handlers ────────────────────────────────────────────────────────────

/**
 * Handle "Add Rule" button click for either scope.
 * @param {'global'|'site'} scope
 */
function handleAddRule(scope) {
  const listEl = scope === "global" ? globalListEl : siteListEl;

  // Remove any existing open form first
  listEl.querySelector(".rule-form")?.remove();

  const form = buildRuleForm(
    null,
    async (rule) => {
      const list = scope === "global" ? globalRules : siteRules;
      list.push(rule);
      renderRules(list, listEl, scope);
      try {
        await persistRules(scope, list);
        showStatus("Rule saved.");
      } catch (err) {
        showStatus("Failed to save rule.", "error");
      }
    },
    () => listEl.querySelector(".rule-form")?.remove(),
  );

  listEl.appendChild(form);
}

/**
 * Handle editing an existing rule.
 * @param {number}          index
 * @param {'global'|'site'} scope
 * @param {HTMLElement}     cardEl
 * @param {Rule}            existing
 */
function handleEditRule(index, scope, cardEl, existing) {
  // Replace the card with a form in-place
  const form = buildRuleForm(
    existing,
    async (updated) => {
      const list = scope === "global" ? globalRules : siteRules;
      list[index] = updated;
      const listEl = scope === "global" ? globalListEl : siteListEl;
      renderRules(list, listEl, scope);
      try {
        await persistRules(scope, list);
        showStatus("Rule updated.");
      } catch {
        showStatus("Failed to update rule.", "error");
      }
    },
    () => {
      const listEl = scope === "global" ? globalListEl : siteListEl;
      const list = scope === "global" ? globalRules : siteRules;
      renderRules(list, listEl, scope);
    },
  );

  cardEl.replaceWith(form);
}

/**
 * Handle deleting a rule by index.
 * @param {number}          index
 * @param {'global'|'site'} scope
 */
async function handleDeleteRule(index, scope) {
  const list = scope === "global" ? globalRules : siteRules;
  const listEl = scope === "global" ? globalListEl : siteListEl;

  list.splice(index, 1);
  renderRules(list, listEl, scope);

  try {
    await persistRules(scope, list);
    showStatus("Rule deleted.");
  } catch {
    showStatus("Failed to delete rule.", "error");
  }
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function init() {
  // 1. Get the active tab URL and extract domain
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentDomain = tab?.url ? extractDomain(tab.url) : "";
  domainEl.textContent = currentDomain || "unknown domain";

  // 2. Request rules from the background service worker
  /** @type {GetRulesMessage} */
  const request = { type: "GET_RULES", domain: currentDomain };

  try {
    /** @type {RulesResponse} */
    const response = await chrome.runtime.sendMessage(request);
    globalRules = response.globalRules ?? [];
    siteRules = response.siteRules ?? [];
  } catch {
    showStatus("Could not load rules.", "error");
  }

  // 3. Render both lists
  renderRules(globalRules, globalListEl, "global");
  renderRules(siteRules, siteListEl, "site");

  // 4. Wire up "Add Rule" buttons
  addGlobalBtn.addEventListener("click", () => handleAddRule("global"));
  addSiteBtn.addEventListener("click", () => handleAddRule("site"));
}

document.addEventListener("DOMContentLoaded", init);
