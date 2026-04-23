import test from "node:test";
import assert from "node:assert/strict";

import {
  activateMask,
  clearMask,
  hasSameOrigin,
  isSupportedMaskableUrl,
  observePageTitle,
} from "../src/shared/title-mask-state.js";

test("isSupportedMaskableUrl accepts regular web pages and rejects restricted pages", () => {
  assert.equal(
    isSupportedMaskableUrl("https://www.youtube.com/watch?v=abc123"),
    true,
  );
  assert.equal(
    isSupportedMaskableUrl("https://www.youtube.com/shorts/abc123"),
    true,
  );
  assert.equal(
    isSupportedMaskableUrl("https://www.youtube.com/results?search_query=test"),
    true,
  );
  assert.equal(
    isSupportedMaskableUrl("https://example.com/docs/123"),
    true,
  );
  assert.equal(
    isSupportedMaskableUrl("http://intranet.local/dashboard"),
    true,
  );
  assert.equal(
    isSupportedMaskableUrl("chrome://extensions"),
    false,
  );
  assert.equal(
    isSupportedMaskableUrl("chrome-extension://abc123/options.html"),
    false,
  );
  assert.equal(
    isSupportedMaskableUrl("https://chromewebstore.google.com/detail/test"),
    false,
  );
  assert.equal(
    isSupportedMaskableUrl("https://chrome.google.com/webstore/detail/test"),
    false,
  );
});

test("activateMask stores the original page title and target mask title", () => {
  const result = activateMask("Original Video - YouTube", "Project Docs");

  assert.deepEqual(result, {
    enabled: true,
    maskTitle: "Project Docs",
    lastKnownPageTitle: "Original Video - YouTube",
  });
});

test("observePageTitle remembers a new real title while the mask is active", () => {
  const nextState = observePageTitle(
    {
      enabled: true,
      maskTitle: "Project Docs",
      lastKnownPageTitle: "Original Video - YouTube",
    },
    "Another Video - YouTube",
  );

  assert.deepEqual(nextState, {
    enabled: true,
    maskTitle: "Project Docs",
    lastKnownPageTitle: "Another Video - YouTube",
    shouldReapplyMask: true,
  });
});

test("observePageTitle ignores writes that already match the mask title", () => {
  const nextState = observePageTitle(
    {
      enabled: true,
      maskTitle: "Project Docs",
      lastKnownPageTitle: "Original Video - YouTube",
    },
    "Project Docs",
  );

  assert.deepEqual(nextState, {
    enabled: true,
    maskTitle: "Project Docs",
    lastKnownPageTitle: "Original Video - YouTube",
    shouldReapplyMask: false,
  });
});

test("clearMask returns the last known real page title for restoration", () => {
  const result = clearMask({
    enabled: true,
    maskTitle: "Project Docs",
    lastKnownPageTitle: "Another Video - YouTube",
  });

  assert.deepEqual(result, {
    enabled: false,
    maskTitle: "",
    restoredTitle: "Another Video - YouTube",
  });
});

test("hasSameOrigin treats query-only navigations as the same origin", () => {
  assert.equal(
    hasSameOrigin("https://www.v2ex.com/", "https://www.v2ex.com/?tab=deals"),
    true,
  );
});

test("hasSameOrigin rejects cross-origin navigations", () => {
  assert.equal(
    hasSameOrigin("https://www.v2ex.com/", "https://example.com/?tab=deals"),
    false,
  );
});
