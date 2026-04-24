import {
  DEFAULT_PRESET_MASK_TITLES,
  canApplyMask,
  generateSmartSuggestions,
  resolveInitialMaskTitle,
  sanitizeMaskTitle,
  shouldAutoCloseAfterApply,
} from "./shared/popup-state.js";

// ── DOM refs ──
const tabFavicon    = document.querySelector("#tabFavicon");
const tabName       = document.querySelector("#tabName");
const tabDomain     = document.querySelector("#tabDomain");
const maskedBadge   = document.querySelector("#maskedBadge");
const inputWrap     = document.querySelector("#inputWrap");
const maskTitleInput = document.querySelector("#maskTitle");
const charCount     = document.querySelector("#charCount");
const applyButton   = document.querySelector("#applyButton");
const miniTabPreview = document.querySelector("#miniTabPreview");
const previewTitle  = document.querySelector("#previewTitle");
const miniFavicon   = document.querySelector("#miniFavicon");
const chipsContainer = document.querySelector("#chipsContainer");
const restoreButton = document.querySelector("#restoreButton");
const versionLabel  = document.querySelector("#versionLabel");
const toast         = document.querySelector("#toast");
const errorMsg      = document.querySelector("#errorMsg");

// ── State ──
let activeTabSupported = false;
let restoreAvailable   = false;
let currentTab         = null;
let recentTitle        = "";
let toastTimer         = null;

// ── Toast ──
function showToast(text) {
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.classList.remove("hidden");
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 1600);
}

// ── Error ──
function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("visible");
}
function clearError() {
  errorMsg.textContent = "";
  errorMsg.classList.remove("visible");
}

// ── Char count + preview ──
function syncInput() {
  const val = maskTitleInput.value;
  const len = [...val].length;
  charCount.textContent = `${len}/30`;
  charCount.classList.toggle("warn", len > 24);

  const dirty = canApplyMask(val);
  applyButton.disabled = !activeTabSupported || !dirty;

  const preview = val.trim() || (currentTab?.title ?? "");
  previewTitle.textContent = preview;
  miniTabPreview.classList.toggle("faded", !val.trim());

  syncFooter();
}

// ── Footer ──
function syncFooter() {
  const showRestore = restoreAvailable || canApplyMask(maskTitleInput.value);
  restoreButton.classList.toggle("hidden", !showRestore);
  versionLabel.classList.toggle("hidden", showRestore);
}

// ── Tab info ──
function renderTabInfo(tab) {
  tabName.textContent = tab.title || "未知标签页";
  try {
    tabDomain.textContent = new URL(tab.url).hostname;
  } catch {
    tabDomain.textContent = tab.url || "";
  }

  if (tab.favIconUrl) {
    tabFavicon.src = tab.favIconUrl;
    tabFavicon.style.display = "";
    // mirror favicon colour to mini preview dot
    miniFavicon.style.background = "";
  } else {
    tabFavicon.style.display = "none";
  }
}

// ── Chips ──
function buildChipPool(recent, suggestions) {
  const seen  = new Set();
  const pool  = [];
  if (recent) {
    seen.add(recent);
    pool.push({ kind: "history", label: recent });
  }
  for (const s of suggestions) {
    if (!seen.has(s) && pool.length < 6) {
      seen.add(s);
      pool.push({ kind: "suggest", label: s });
    }
  }
  return pool;
}

function renderChips() {
  const suggestions = DEFAULT_PRESET_MASK_TITLES;
  const pool = buildChipPool(recentTitle, suggestions);

  chipsContainer.replaceChildren(
    ...pool.map((item, i) => {
      const btn = document.createElement("button");
      btn.className = "chip";
      btn.title = item.kind === "history" ? "最近使用" : "智能建议";

      const iconEl = document.createElement("span");
      iconEl.className = `chip-icon${item.kind === "suggest" ? " suggest" : ""}`;
      iconEl.innerHTML = item.kind === "history"
        ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`
        : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.8L18.6 9.6 13.8 11.4 12 16.2 10.2 11.4 5.4 9.6 10.2 7.8z"/></svg>`;

      const labelEl = document.createElement("span");
      labelEl.textContent = item.label;

      const numEl = document.createElement("span");
      numEl.className = "chip-num";
      numEl.textContent = i + 1;

      btn.append(iconEl, labelEl, numEl);

      // single click → fill input
      btn.addEventListener("click", () => {
        maskTitleInput.value = item.label;
        maskTitleInput.focus();
        syncInput();
        clearError();
      });

      // double click → apply immediately
      btn.addEventListener("dblclick", () => {
        maskTitleInput.value = item.label;
        syncInput();
        applyMaskTitle(item.label);
      });

      return btn;
    })
  );
}

// ── Sync popup state ──
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function syncPopupState() {
  currentTab = await getActiveTab();

  if (!currentTab?.id || !currentTab.url) {
    activeTabSupported = false;
    restoreAvailable   = false;
    syncInput();
    return;
  }

  renderTabInfo(currentTab);

  const response = await chrome.runtime.sendMessage({
    type: "GET_TAB_STATE",
    tabId: currentTab.id,
    url: currentTab.url,
  });

  recentTitle = response?.recentMaskTitle ?? "";
  activeTabSupported = Boolean(response?.supported);
  restoreAvailable   = Boolean(response?.rule?.enabled);

  maskTitleInput.value = resolveInitialMaskTitle({
    currentTabMaskTitle: response?.rule?.maskTitle,
    recentMaskTitle: recentTitle,
  });

  maskedBadge.classList.toggle("hidden", !restoreAvailable);

  if (!activeTabSupported) {
    showError("当前页面不支持标签改名。");
  }

  syncInput();
  renderChips();

  // focus input after load
  setTimeout(() => maskTitleInput.focus(), 80);
}

// ── Apply ──
async function applyMaskTitle(overrideValue) {
  const maskTitle = sanitizeMaskTitle(overrideValue ?? maskTitleInput.value);
  if (!maskTitle || !currentTab?.id) return;

  clearError();
  applyButton.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      type: "APPLY_MASK",
      tabId: currentTab.id,
      url: currentTab.url,
      maskTitle,
    });

    if (response?.type === "ERROR" || response?.type === "UNSUPPORTED_TAB") {
      showError(response.message || "应用失败，请重试。");
      return;
    }

    recentTitle = maskTitle;
    restoreAvailable = true;
    maskedBadge.classList.remove("hidden");
    renderChips();

    if (shouldAutoCloseAfterApply(response)) {
      window.close();
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : "应用失败，请重试。");
  } finally {
    syncInput();
  }
}

// ── Restore ──
async function restoreMask() {
  if (!currentTab?.id) return;
  clearError();
  restoreButton.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: "CLEAR_MASK", tabId: currentTab.id });
    restoreAvailable = false;
    maskedBadge.classList.add("hidden");
    showToast("✓ 已恢复为原标题");
    syncInput();
  } catch (err) {
    showError(err instanceof Error ? err.message : "恢复失败，请重试。");
  } finally {
    restoreButton.disabled = false;
    syncFooter();
  }
}

// ── Keyboard shortcuts ──
maskTitleInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!applyButton.disabled) applyMaskTitle();
  } else if (e.key === "Escape") {
    e.preventDefault();
    maskTitleInput.value = "";
    syncInput();
  } else if (/^[1-9]$/.test(e.key) && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    const idx = Number(e.key) - 1;
    const pool = buildChipPool(recentTitle, DEFAULT_PRESET_MASK_TITLES);
    if (pool[idx]) {
      maskTitleInput.value = pool[idx].label;
      syncInput();
    }
  }
});

// ── Event listeners ──
maskTitleInput.addEventListener("focus",  () => inputWrap.classList.add("focused"));
maskTitleInput.addEventListener("blur",   () => inputWrap.classList.remove("focused"));
maskTitleInput.addEventListener("input",  () => { syncInput(); clearError(); });

applyButton.addEventListener("click",   () => applyMaskTitle().catch(console.error));
restoreButton.addEventListener("click", () => restoreMask().catch(console.error));

// ── Init ──
toast.classList.add("hidden");
syncPopupState().catch((err) => {
  console.error("Init failed:", err);
  activeTabSupported = false;
  restoreAvailable   = false;
  syncInput();
});
