function encodeSvg(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function buildNeutralDocumentFaviconDataUrl() {
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

export function activateFaviconMask(currentFavicons, maskHref) {
  return {
    enabled: true,
    maskHref,
    lastKnownFavicons: currentFavicons,
  };
}

export function observeFavicons(state, observedFavicons) {
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

export function clearFaviconMask(state) {
  return {
    enabled: false,
    maskHref: "",
    restoredFavicons: state?.lastKnownFavicons ?? [],
  };
}
