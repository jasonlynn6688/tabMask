import {
  clearMaskRule,
  getMaskRule,
  getRecentMaskTitle,
  setMaskRule,
  setRecentMaskTitle,
} from "./shared/storage.js";
import { hasSameOrigin, isSupportedMaskableUrl } from "./shared/title-mask-state.js";

const MESSAGE_TYPES = {
  APPLY_MASK: "APPLY_MASK",
  CLEAR_MASK: "CLEAR_MASK",
  GET_MASK_RULE: "GET_MASK_RULE",
  GET_TAB_STATE: "GET_TAB_STATE",
  MASK_TITLE_CLEARED: "MASK_TITLE_CLEARED",
};

async function notifyTab(tabId, message, { allowMissingReceiver = false } = {}) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (
      !allowMissingReceiver ||
      !String(error?.message || "").includes("Receiving end does not exist")
    ) {
      throw error;
    }

    return null;
  }
}

async function ensureContentScriptInjected(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["content-helpers.js", "content.js"],
  });
}

async function applyRuleInTab(tabId, rule) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: (nextRule) => globalThis.__tabMaskApplyRule?.(nextRule) ?? null,
    args: [rule],
  });

  const result = results?.[0]?.result;
  if (!result?.applied) {
    throw new Error("Tab script did not apply the update.");
  }

  return result;
}

async function notifyTabWithRetry(tabId, message) {
  const firstTry = await notifyTab(tabId, message, {
    allowMissingReceiver: true,
  });

  if (firstTry) {
    return firstTry;
  }

  await new Promise((resolve) => {
    setTimeout(resolve, 50);
  });

  const secondTry = await notifyTab(tabId, message, {
    allowMissingReceiver: true,
  });

  if (secondTry) {
    return secondTry;
  }

  throw new Error("Tab script did not acknowledge the update.");
}

async function getTabState(tabId, url) {
  const supported = isSupportedMaskableUrl(url);
  const recentMaskTitle = await getRecentMaskTitle();

  if (!supported) {
    return {
      type: "UNSUPPORTED_TAB",
      recentMaskTitle,
      supported: false,
      rule: null,
    };
  }

  const rule = await getMaskRule(tabId);

  if (rule?.enabled) {
    return {
      type: "MASK_ACTIVE",
      recentMaskTitle,
      supported: true,
      rule,
    };
  }

  return {
    type: "READY",
    recentMaskTitle,
    supported: true,
    rule: null,
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case MESSAGE_TYPES.GET_TAB_STATE: {
        sendResponse(await getTabState(message.tabId, message.url));
        return;
      }
      case MESSAGE_TYPES.GET_MASK_RULE: {
        const tabId = sender.tab?.id ?? message.tabId;
        sendResponse(tabId ? await getMaskRule(tabId) : null);
        return;
      }
      case MESSAGE_TYPES.APPLY_MASK: {
        if (!isSupportedMaskableUrl(message.url)) {
          sendResponse({
            type: "UNSUPPORTED_TAB",
            supported: false,
            rule: null,
          });
          return;
        }

        const rule = await setMaskRule(message.tabId, message.url, message.maskTitle);
        await setRecentMaskTitle(rule.maskTitle);
        try {
          await ensureContentScriptInjected(message.tabId);
          await applyRuleInTab(message.tabId, rule);
        } catch (error) {
          await clearMaskRule(message.tabId);
          throw error;
        }
        sendResponse({
          type: "MASK_ACTIVE",
          recentMaskTitle: rule.maskTitle,
          rule,
        });
        return;
      }
      case MESSAGE_TYPES.CLEAR_MASK: {
        await clearMaskRule(message.tabId);
        await notifyTabWithRetry(message.tabId, {
          type: MESSAGE_TYPES.MASK_TITLE_CLEARED,
        });
        sendResponse({
          type: "MASK_CLEARED",
        });
        return;
      }
      default:
        sendResponse({
          type: "ERROR",
          message: "Unknown message type.",
        });
    }
  })().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : "Unexpected error.";
    const isInjectionBlocked =
      /Cannot access contents of url/i.test(errorMessage) ||
      /The extensions gallery cannot be scripted/i.test(errorMessage);

    sendResponse({
      type: isInjectionBlocked ? "UNSUPPORTED_TAB" : "ERROR",
      supported: false,
      message: isInjectionBlocked
        ? "当前页面不允许扩展修改标签。"
        : errorMessage,
    });
  });

  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  clearMaskRule(tabId).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete" || !tab.url) {
    return;
  }

  (async () => {
    const rule = await getMaskRule(tabId);

    if (!rule?.enabled) {
      return;
    }

    if (!isSupportedMaskableUrl(tab.url) || !hasSameOrigin(rule.url, tab.url)) {
      await clearMaskRule(tabId);
      return;
    }

    const refreshedRule = {
      ...rule,
      url: tab.url,
    };

    try {
      await ensureContentScriptInjected(tabId);
      await applyRuleInTab(tabId, refreshedRule);
    } catch (error) {
      await clearMaskRule(tabId);
      throw error;
    }
  })().catch(() => {});
});
