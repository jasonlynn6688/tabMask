import test from "node:test";
import assert from "node:assert/strict";

import {
  activateFaviconMask,
  buildNeutralDocumentFaviconDataUrl,
  clearFaviconMask,
  observeFavicons,
} from "../src/shared/favicon-mask-state.js";

test("buildNeutralDocumentFaviconDataUrl returns an SVG data URL", () => {
  const dataUrl = buildNeutralDocumentFaviconDataUrl();

  assert.equal(dataUrl.startsWith("data:image/svg+xml,"), true);
  assert.equal(dataUrl.includes("%3Csvg"), true);
});

test("activateFaviconMask stores current icons and the generated masked icon", () => {
  const currentFavicons = [
    {
      rel: "icon",
      href: "https://www.youtube.com/s/desktop/icon.png",
      type: "image/png",
    },
  ];
  const maskHref = "data:image/svg+xml,%3Csvg";

  assert.deepEqual(activateFaviconMask(currentFavicons, maskHref), {
    enabled: true,
    maskHref,
    lastKnownFavicons: currentFavicons,
  });
});

test("observeFavicons updates the stored originals when the page rewrites icons", () => {
  const observed = observeFavicons(
    {
      enabled: true,
      maskHref: "data:image/svg+xml,%3Csvg",
      lastKnownFavicons: [
        {
          rel: "icon",
          href: "https://www.youtube.com/original-a.png",
        },
      ],
    },
    [
      {
        rel: "icon",
        href: "https://www.youtube.com/original-b.png",
      },
    ],
  );

  assert.deepEqual(observed, {
    enabled: true,
    maskHref: "data:image/svg+xml,%3Csvg",
    lastKnownFavicons: [
      {
        rel: "icon",
        href: "https://www.youtube.com/original-b.png",
      },
    ],
    shouldReapplyMask: true,
  });
});

test("observeFavicons ignores our own masked icon", () => {
  const observed = observeFavicons(
    {
      enabled: true,
      maskHref: "data:image/svg+xml,%3Csvg",
      lastKnownFavicons: [
        {
          rel: "icon",
          href: "https://www.youtube.com/original-a.png",
        },
      ],
    },
    [
      {
        rel: "icon",
        href: "data:image/svg+xml,%3Csvg",
      },
    ],
  );

  assert.deepEqual(observed, {
    enabled: true,
    maskHref: "data:image/svg+xml,%3Csvg",
    lastKnownFavicons: [
      {
        rel: "icon",
        href: "https://www.youtube.com/original-a.png",
      },
    ],
    shouldReapplyMask: false,
  });
});

test("observeFavicons re-applies when the page adds real icons alongside the mask", () => {
  const observed = observeFavicons(
    {
      enabled: true,
      maskHref: "data:image/svg+xml,%3Csvg",
      lastKnownFavicons: [
        {
          rel: "icon",
          href: "https://www.youtube.com/original-a.png",
        },
      ],
    },
    [
      {
        rel: "icon",
        href: "data:image/svg+xml,%3Csvg",
      },
      {
        rel: "icon",
        href: "https://www.youtube.com/original-b.png",
      },
    ],
  );

  assert.deepEqual(observed, {
    enabled: true,
    maskHref: "data:image/svg+xml,%3Csvg",
    lastKnownFavicons: [
      {
        rel: "icon",
        href: "https://www.youtube.com/original-b.png",
      },
    ],
    shouldReapplyMask: true,
  });
});

test("clearFaviconMask returns the last known originals for restoration", () => {
  const favicons = [
    {
      rel: "icon",
      href: "https://www.youtube.com/original-a.png",
    },
  ];

  assert.deepEqual(
    clearFaviconMask({
      enabled: true,
      maskHref: "data:image/svg+xml,%3Csvg",
      lastKnownFavicons: favicons,
    }),
    {
      enabled: false,
      maskHref: "",
      restoredFavicons: favicons,
    },
  );
});
