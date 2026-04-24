import {
  canApplyMask,
  generateSmartSuggestions,
  resolveInitialMaskTitle,
  sanitizeMaskTitle,
  shouldAutoCloseAfterApply,
} from "./shared/popup-state.js";

// ── DOM refs ──
const tabFavicon = document.querySelector("#tabFavicon");
const tabName = document.querySelector("#tabName");
const tabUrl = document.querySelector("#tabUrl");
const maskTitleInput = document.querySelector("#maskTitle");
const charCount = document.querySelector("#charCount");
const historyRow = document.querySelector("#historyRow");
const historyTitleEl = document.querySelector("#historyTitle");
const historyApplyBtn = document.querySelector("#historyApplyBtn");
const suggestRow = document.querySelector("#suggestRow");
const suggestText = document.querySelector("#suggestText");
const suggestApplyBtn = document.querySelector("#suggestApplyBtn");
const applyButton = document.querySelector("#applyButton");
const restoreButton = document.querySelector("#restoreButton");
const errorMsg = document.querySelector("#errorMsg");

// ── State ──
let activeTabSupported = false;
let restoreAvailable = false;
let currentTab = null;
let recentTitle = "";
let currentSuggestions = [];

// ── UI sync ──
function syncCharCount() {
  charCount.textContent = `${maskTitleInput.value.length} / 30`;
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.add("visible");
}

function clearError() {
  errorMsg.textContent = "";
  errorMsg.classList.remove("visible");
}

function syncActionButtons() {
  applyButton.disabled = !activeTabSupported || !canApplyMask(maskTitleInput.value);
  restoreButton.disabled = !restoreAvailable;
}

function syncSuggestions() {
  currentSuggestions = generateSmartSuggestions(maskTitleInput.value);
  suggestText.textContent = `智能建议：${currentSuggestions.join("、")}`;
  suggestRow.classList.toggle("visible", currentSuggestions.length > 0);
}

function syncHistoryRow() {
  historyTitleEl.textContent = recentTitle;
  historyRow.classList.toggle("visible", Boolean(recentTitle));
}

function renderTabInfo(tab) {
  tabName.textContent = tab.title || "未知标签页";
  try {
    tabUrl.textContent = new URL(tab.url).hostname;
  } catch {
    tabUrl.textContent = tab.url || "—";
  }
  if (tab.favIconUrl) {
    tabFavicon.src = tab.favIconUrl;
    tabFavicon.style.display = "";
  } else {
    tabFavicon.style.display = "none";
  }
}

// ── Tab ──
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab ?? null;
}

async function syncPopupState() {
  currentTab = await getActiveTab();

  if (!currentTab?.id || !currentTab.url) {
    activeTabSupported = false;
    restoreAvailable = false;
    syncActionButtons();
    return;
  }

  renderTabInfo(currentTab);

  const response = await chrome.runtime.sendMessage({
    type: "GET_TAB_STATE",
    tabId: currentTab.id,
    url: currentTab.url,
  });

  recentTitle = response?.recentMaskTitle ?? "";
  maskTitleInput.value = resolveInitialMaskTitle({
    currentTabMaskTitle: response?.rule?.maskTitle,
    recentMaskTitle: recentTitle,
  });

  activeTabSupported = Boolean(response?.supported);
  restoreAvailable = Boolean(response?.rule?.enabled);

  syncCharCount();
  syncActionButtons();
  syncHistoryRow();
  syncSuggestions();
}

// ── Apply / Restore ──
async function applyMaskTitle() {
  const maskTitle = sanitizeMaskTitle(maskTitleInput.value);
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

    if (response?.type === "ERROR") {
      showError(response.message || "应用失败，请重试。");
      return;
    }

    if (shouldAutoCloseAfterApply(response)) {
      window.close();
    }
  } catch (err) {
    showError(err instanceof Error ? err.message : "应用失败，请重试。");
  } finally {
    syncActionButtons();
  }
}

async function restoreMask() {
  if (!currentTab?.id) return;
  clearError();
  restoreButton.disabled = true;

  try {
    await chrome.runtime.sendMessage({ type: "CLEAR_MASK", tabId: currentTab.id });
    restoreAvailable = false;
  } catch (err) {
    showError(err instanceof Error ? err.message : "恢复失败，请重试。");
  } finally {
    syncActionButtons();
  }
}

// ── Event listeners ──
maskTitleInput.addEventListener("input", () => {
  syncCharCount();
  syncActionButtons();
  syncSuggestions();
});

applyButton.addEventListener("click", () => applyMaskTitle().catch(console.error));
restoreButton.addEventListener("click", () => restoreMask().catch(console.error));

historyApplyBtn.addEventListener("click", () => {
  if (recentTitle) {
    maskTitleInput.value = recentTitle;
    syncCharCount();
    syncActionButtons();
    syncSuggestions();
  }
});

suggestApplyBtn.addEventListener("click", () => {
  if (currentSuggestions.length > 0) {
    maskTitleInput.value = currentSuggestions[0];
    syncCharCount();
    syncActionButtons();
    syncSuggestions();
  }
});

// ── Init ──
syncPopupState().catch((err) => {
  console.error("Init failed:", err);
  activeTabSupported = false;
  restoreAvailable = false;
  syncActionButtons();
});
