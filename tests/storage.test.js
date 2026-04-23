import test from "node:test";
import assert from "node:assert/strict";

import {
  RECENT_MASK_TITLE_STORAGE_KEY,
  getRuleStorageKey,
  normalizeRulePayload,
} from "../src/shared/storage.js";

test("getRuleStorageKey creates a stable per-tab key", () => {
  assert.equal(getRuleStorageKey(42), "tabMaskRule:42");
});

test("RECENT_MASK_TITLE_STORAGE_KEY is stable", () => {
  assert.equal(RECENT_MASK_TITLE_STORAGE_KEY, "recentMaskTitle");
});

test("normalizeRulePayload trims the mask title and preserves tab metadata", () => {
  assert.deepEqual(
    normalizeRulePayload({
      tabId: 7,
      url: "https://example.com/docs/123",
      maskTitle: "  Project Docs  ",
    }),
    {
      tabId: 7,
      url: "https://example.com/docs/123",
      maskTitle: "Project Docs",
      enabled: true,
    },
  );
});

test("normalizeRulePayload accepts other regular web pages", () => {
  assert.deepEqual(
    normalizeRulePayload({
      tabId: 8,
      url: "http://intranet.local/dashboard",
      maskTitle: "Project Docs",
    }),
    {
      tabId: 8,
      url: "http://intranet.local/dashboard",
      maskTitle: "Project Docs",
      enabled: true,
    },
  );
});

test("normalizeRulePayload rejects unsupported pages", () => {
  assert.throws(
    () =>
      normalizeRulePayload({
        tabId: 7,
        url: "chrome://extensions",
        maskTitle: "Project Docs",
      }),
    /only supported on regular web pages/i,
  );
});

test("normalizeRulePayload rejects an empty mask title", () => {
  assert.throws(
    () =>
      normalizeRulePayload({
        tabId: 7,
        url: "https://example.com/docs/123",
        maskTitle: "   ",
      }),
    /mask title is required/i,
  );
});
