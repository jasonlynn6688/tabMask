(function attachTabMaskState() {
  function isSupportedMaskableUrl(url) {
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

  function activateMask(currentPageTitle, requestedMaskTitle) {
    return {
      enabled: true,
      maskTitle: requestedMaskTitle.trim(),
      lastKnownPageTitle: currentPageTitle,
    };
  }

  function observePageTitle(state, observedTitle) {
    if (!state || !state.enabled || observedTitle === state.maskTitle) {
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

  function clearMask(state) {
    return {
      enabled: false,
      maskTitle: "",
      restoredTitle: state?.lastKnownPageTitle || "",
    };
  }

  function encodeSvg(svg) {
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  function buildNeutralDocumentFaviconDataUrl() {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <rect x="12" y="8" width="40" height="48" rx="10" fill="#f8fafc"/>
        <path d="M40 8h4a8 8 0 0 1 8 8v4L40 8Z" fill="#d9e4ec"/>
        <path d="M20 24h24" stroke="#8aa0ae" stroke-width="4" stroke-linecap="round"/>
        <path d="M20 32h24" stroke="#8aa0ae" stroke-width="4" stroke-linecap="round"/>
        <path d="M20 40h16" stroke="#8aa0ae" stroke-width="4" stroke-linecap="round"/>
        <rect x="12" y="8" width="40" height="48" rx="10" fill="none" stroke="#b8cad5" stroke-width="2"/>
      </svg>
    `;

    return encodeSvg(svg);
  }

  function activateFaviconMask(currentFavicons, maskHref) {
    return {
      enabled: true,
      maskHref,
      lastKnownFavicons: currentFavicons,
    };
  }

  function observeFavicons(state, observedFavicons) {
    const nonMaskFavicons = observedFavicons.filter(
      (icon) => icon.href !== state.maskHref,
    );
    const observedIncludesMask = observedFavicons.some(
      (icon) => icon.href === state.maskHref,
    );

    if (observedIncludesMask && nonMaskFavicons.length === 0) {
      return {
        ...state,
        shouldReapplyMask: false,
      };
    }

    return {
      ...state,
      lastKnownFavicons:
        nonMaskFavicons.length > 0 ? nonMaskFavicons : state.lastKnownFavicons,
      shouldReapplyMask: true,
    };
  }

  function clearFaviconMask(state) {
    return {
      enabled: false,
      maskHref: "",
      restoredFavicons: state?.lastKnownFavicons ?? [],
    };
  }

  globalThis.TabMaskState = {
    activateMask,
    activateFaviconMask,
    buildNeutralDocumentFaviconDataUrl,
    clearMask,
    clearFaviconMask,
    isSupportedMaskableUrl,
    observeFavicons,
    observePageTitle,
  };
})();
