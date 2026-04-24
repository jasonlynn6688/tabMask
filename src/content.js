(function bootstrapContentScript() {
  if (globalThis.__tabMaskBootstrapped) {
    return;
  }

  globalThis.__tabMaskBootstrapped = true;

  const {
    activateMask,
    activateFaviconMask,
    buildNeutralDocumentFaviconDataUrl,
    clearMask,
    clearFaviconMask,
    isSupportedMaskableUrl,
    observeFavicons,
    observePageTitle,
  } = globalThis.TabMaskState;

  const MESSAGE_TYPES = {
    GET_MASK_RULE: "GET_MASK_RULE",
    MASK_TITLE_CLEARED: "MASK_TITLE_CLEARED",
    MASK_TITLE_UPDATED: "MASK_TITLE_UPDATED",
  };

  let state = {
    enabled: false,
    maskTitle: "",
    lastKnownPageTitle: "",
  };
  let faviconState = {
    enabled: false,
    maskHref: buildNeutralDocumentFaviconDataUrl(),
    lastKnownFavicons: [],
  };
  let internalWriteDepth = 0;
  const OWNED_FAVICON_ATTR = "data-tab-mask-owned";

  function withInternalWrite(callback) {
    internalWriteDepth += 1;

    try {
      callback();
    } finally {
      queueMicrotask(() => {
        internalWriteDepth = Math.max(0, internalWriteDepth - 1);
      });
    }
  }

  function getBestKnownPageTitle() {
    if (state.enabled && state.lastKnownPageTitle) {
      return state.lastKnownPageTitle;
    }

    return document.title;
  }

  function readCurrentFavicons() {
    return Array.from(document.querySelectorAll('link[rel*="icon"]')).map((link) => ({
      rel: link.getAttribute("rel") || "icon",
      href: link.href,
      type: link.getAttribute("type") || "",
      sizes: link.getAttribute("sizes") || "",
    }));
  }

  function getHeadTarget() {
    return document.head || document.documentElement;
  }

  function removeAllFavicons() {
    Array.from(document.querySelectorAll('link[rel*="icon"]')).forEach((link) => {
      link.remove();
    });
  }

  function writeFavicons(favicons, owned) {
    withInternalWrite(() => {
      removeAllFavicons();

      favicons.forEach((favicon) => {
        const link = document.createElement("link");
        link.setAttribute("rel", favicon.rel || "icon");
        link.setAttribute("href", favicon.href);

        if (favicon.type) {
          link.setAttribute("type", favicon.type);
        }

        if (favicon.sizes) {
          link.setAttribute("sizes", favicon.sizes);
        }

        if (owned) {
          link.setAttribute(OWNED_FAVICON_ATTR, "true");
        }

        getHeadTarget().append(link);
      });
    });
  }

  function setMaskedFavicon() {
    writeFavicons(
      [
        {
          rel: "icon",
          href: faviconState.maskHref,
          type: "image/svg+xml",
        },
      ],
      true,
    );
  }

  function setDocumentTitle(nextTitle) {
    if (!nextTitle || document.title === nextTitle) {
      return;
    }

    withInternalWrite(() => {
      document.title = nextTitle;
    });
  }

  function applyRule(rule) {
    state = activateMask(getBestKnownPageTitle(), rule.maskTitle);
    faviconState = activateFaviconMask(
      faviconState.enabled && faviconState.lastKnownFavicons.length > 0
        ? faviconState.lastKnownFavicons
        : readCurrentFavicons(),
      faviconState.maskHref,
    );
    setDocumentTitle(rule.maskTitle);
    setMaskedFavicon();
  }

  function disableMask() {
    if (!state.enabled) {
      return;
    }

    const nextState = clearMask(state);
    const nextFaviconState = clearFaviconMask(faviconState);
    state = {
      enabled: false,
      maskTitle: "",
      lastKnownPageTitle: nextState.restoredTitle,
    };
    faviconState = {
      enabled: false,
      maskHref: buildNeutralDocumentFaviconDataUrl(),
      lastKnownFavicons: nextFaviconState.restoredFavicons,
    };

    if (nextState.restoredTitle) {
      setDocumentTitle(nextState.restoredTitle);
    }

    writeFavicons(nextFaviconState.restoredFavicons, false);
  }

  globalThis.__tabMaskClearRule = () => {
    disableMask();
    return {
      cleared: true,
    };
  };

  function handleObservedTitle() {
    if (internalWriteDepth > 0 || !state.enabled || !isSupportedMaskableUrl(location.href)) {
      return;
    }

    const nextState = observePageTitle(state, document.title);
    state = {
      enabled: nextState.enabled,
      maskTitle: nextState.maskTitle,
      lastKnownPageTitle: nextState.lastKnownPageTitle,
    };

    if (nextState.shouldReapplyMask) {
      setDocumentTitle(state.maskTitle);
    }
  }

  function handleObservedFavicons() {
    if (internalWriteDepth > 0 || !faviconState.enabled || !isSupportedMaskableUrl(location.href)) {
      return;
    }

    const nextState = observeFavicons(faviconState, readCurrentFavicons());
    faviconState = {
      enabled: nextState.enabled,
      maskHref: nextState.maskHref,
      lastKnownFavicons: nextState.lastKnownFavicons,
    };

    if (nextState.shouldReapplyMask) {
      setMaskedFavicon();
    }
  }

  async function syncRuleFromBackground() {
    const rule = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.GET_MASK_RULE,
    });

    if (!isSupportedMaskableUrl(location.href)) {
      disableMask();
      return;
    }

    if (rule?.enabled && rule.maskTitle) {
      applyRule(rule);
      return;
    }

    disableMask();
  }

  function watchDocumentTitle() {
    const titleObserver = new MutationObserver(() => {
      handleObservedTitle();
      handleObservedFavicons();
    });

    titleObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function patchHistoryMethod(methodName) {
    const originalMethod = history[methodName];

    history[methodName] = function patchedHistoryMethod(...args) {
      const result = originalMethod.apply(this, args);
      queueMicrotask(() => {
        syncRuleFromBackground().catch(() => {});
      });
      return result;
    };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGE_TYPES.MASK_TITLE_UPDATED && message.rule) {
      applyRule(message.rule);
      sendResponse({ applied: true });
      return;
    }

    if (message?.type === MESSAGE_TYPES.MASK_TITLE_CLEARED) {
      disableMask();
      sendResponse({
        cleared: true,
      });
    }
  });

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");
  window.addEventListener("popstate", () => {
    syncRuleFromBackground().catch(() => {});
  });

  watchDocumentTitle();
  syncRuleFromBackground().catch(() => {});
})();
