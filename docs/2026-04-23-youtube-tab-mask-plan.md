# YouTube Tab Mask Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that lets the user mask the current YouTube watch tab title, keep that title applied across YouTube SPA navigation, and restore the page title on demand.

**Architecture:** Use a popup UI to collect the custom title and send commands to a background service worker. The service worker stores per-tab masking rules and relays state to a YouTube-only content script, which owns title observation, re-application, and restoration of the last known real page title.

**Tech Stack:** Chrome Extensions Manifest V3, plain HTML/CSS/JavaScript, Node.js built-in test runner (`node:test`), ES modules

---

### Task 1: Establish testable core logic

**Files:**
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/package.json`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/shared/title-mask-state.js`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/tests/title-mask-state.test.js`

- [ ] **Step 1: Write the failing tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  activateMask,
  observePageTitle,
  clearMask,
  isSupportedYouTubeWatchUrl,
} from "../src/shared/title-mask-state.js";

test("isSupportedYouTubeWatchUrl matches youtube watch pages only", () => {
  assert.equal(
    isSupportedYouTubeWatchUrl("https://www.youtube.com/watch?v=abc123"),
    true,
  );
  assert.equal(
    isSupportedYouTubeWatchUrl("https://www.youtube.com/results?search_query=test"),
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL with module-not-found or missing export errors for `src/shared/title-mask-state.js`

- [ ] **Step 3: Write minimal implementation**

```js
export function isSupportedYouTubeWatchUrl(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "www.youtube.com" &&
      parsed.pathname === "/watch" &&
      parsed.searchParams.has("v")
    );
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
  if (!state.enabled || observedTitle === state.maskTitle) {
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
    restoredTitle: state.lastKnownPageTitle || "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with 4 passing tests

### Task 2: Build extension manifest and background rule management

**Files:**
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/manifest.json`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/background.js`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/shared/storage.js`

- [ ] **Step 1: Write the failing tests**

Add tests that assert rule records are normalized and that unsupported URLs are rejected by the shared storage helpers.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because `storage.js` helpers do not exist yet

- [ ] **Step 3: Write minimal implementation**

Implement:

- `normalizeRulePayload(tabId, url, maskTitle)`
- `getRuleKey(tabId)`
- `setMaskRule(tabId, url, maskTitle)`
- `clearMaskRule(tabId)`
- background message handlers for:
  - `GET_TAB_STATE`
  - `APPLY_MASK`
  - `CLEAR_MASK`
  - `GET_MASK_RULE`
- tab cleanup via `chrome.tabs.onRemoved`

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with storage helper coverage included

### Task 3: Build popup UI

**Files:**
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.html`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.css`
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.js`

- [ ] **Step 1: Write the failing tests**

Add tests for pure popup helper functions:

- form input trimming
- button enabled state
- response-to-status text mapping

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL because popup helper module does not exist yet

- [ ] **Step 3: Write minimal implementation**

Build a popup with:

- title input
- Apply button
- Restore button
- short status text

The popup should query the active tab, reject unsupported pages, and call background actions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with popup helper coverage included

### Task 4: Implement content script masking loop

**Files:**
- Create: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/content.js`

- [ ] **Step 1: Write the failing tests**

Add tests for content-script-adjacent pure helpers:

- reapply when observed title differs from mask
- do not reapply when observed title already equals mask
- restore the last known real title on clear

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL if the content logic helpers do not return the expected action flags

- [ ] **Step 3: Write minimal implementation**

Implement content script behavior:

- fetch current rule on load
- apply mask immediately if a rule exists
- observe title changes with `MutationObserver`
- patch `history.pushState` and `history.replaceState`
- react to `popstate`
- accept `MASK_TITLE_UPDATED` and `MASK_TITLE_CLEARED` messages

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS with all shared logic tests green

### Task 5: Verify unpacked extension behavior

**Files:**
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/docs/2026-04-23-youtube-tab-mask-design.md`

- [ ] **Step 1: Run the automated checks**

Run: `npm test`
Expected: PASS

- [ ] **Step 2: Perform manual verification in Chrome**

Checklist:

- Load `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src` as an unpacked extension.
- Open `https://www.youtube.com/watch?v=dQw4w9WgXcQ`.
- Apply a custom title such as `Project Docs`.
- Confirm the tab title changes to `Project Docs`.
- Switch to another YouTube video in the same tab.
- Confirm the tab title stays masked.
- Click Restore.
- Confirm the tab title returns to the latest real page title.

- [ ] **Step 3: Update docs if behavior differs**

Capture any implementation-specific notes in the design doc or a short README.
