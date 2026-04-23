import { isSupportedMaskableUrl } from "./title-mask-state.js";

const RULE_STORAGE_KEY_PREFIX = "tabMaskRule:";
export const RECENT_MASK_TITLE_STORAGE_KEY = "recentMaskTitle";

export function getRuleStorageKey(tabId) {
  return `${RULE_STORAGE_KEY_PREFIX}${tabId}`;
}

export function normalizeRulePayload({ tabId, url, maskTitle }) {
  const normalizedMaskTitle = String(maskTitle ?? "").trim();

  if (!normalizedMaskTitle) {
    throw new Error("Mask title is required.");
  }

  if (!isSupportedMaskableUrl(url)) {
    throw new Error("Masking is only supported on regular web pages.");
  }

  return {
    tabId,
    url,
    maskTitle: normalizedMaskTitle,
    enabled: true,
  };
}

export async function getMaskRule(tabId) {
  const storageKey = getRuleStorageKey(tabId);
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] ?? null;
}

export async function setMaskRule(tabId, url, maskTitle) {
  const normalizedRule = normalizeRulePayload({ tabId, url, maskTitle });
  const storageKey = getRuleStorageKey(tabId);

  await chrome.storage.local.set({
    [storageKey]: normalizedRule,
  });

  return normalizedRule;
}

export async function clearMaskRule(tabId) {
  await chrome.storage.local.remove(getRuleStorageKey(tabId));
}

export async function getRecentMaskTitle() {
  const result = await chrome.storage.local.get(RECENT_MASK_TITLE_STORAGE_KEY);
  return result[RECENT_MASK_TITLE_STORAGE_KEY] ?? "";
}

export async function setRecentMaskTitle(maskTitle) {
  await chrome.storage.local.set({
    [RECENT_MASK_TITLE_STORAGE_KEY]: String(maskTitle ?? "").trim(),
  });
}
