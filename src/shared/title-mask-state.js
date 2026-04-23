export function isSupportedMaskableUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const isRegularWebProtocol =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const isChromeWebStore =
      parsedUrl.hostname === "chromewebstore.google.com" ||
      (parsedUrl.hostname === "chrome.google.com" &&
        parsedUrl.pathname.startsWith("/webstore"));

    return isRegularWebProtocol && !isChromeWebStore;
  } catch {
    return false;
  }
}

export function hasSameOrigin(leftUrl, rightUrl) {
  try {
    const left = new URL(leftUrl);
    const right = new URL(rightUrl);
    return left.origin === right.origin;
  } catch {
    return false;
  }
}

export function activateMask(currentPageTitle, requestedMaskTitle) {
  return {
    enabled: true,
    maskTitle: requestedMaskTitle.trim(),
    lastKnownPageTitle: currentPageTitle,
  };
}

export function observePageTitle(state, observedTitle) {
  if (!state?.enabled || observedTitle === state.maskTitle) {
    return {
      ...state,
      shouldReapplyMask: false,
    };
  }

  return {
    ...state,
    lastKnownPageTitle: observedTitle,
    shouldReapplyMask: true,
  };
}

export function clearMask(state) {
  return {
    enabled: false,
    maskTitle: "",
    restoredTitle: state?.lastKnownPageTitle || "",
  };
}
