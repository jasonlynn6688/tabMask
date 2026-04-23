# Tab Mask UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two popup UX improvements: remember the most recently applied title globally and provide fixed one-click preset titles.

**Architecture:** Keep the current tab-specific masking flow unchanged. Store one global `recentMaskTitle` value in `chrome.storage.local`, let the popup choose between the active tab's mask and the recent title for initial input, and add a preset button row that reuses the existing apply flow.

**Tech Stack:** Chrome Extensions Manifest V3, plain HTML/CSS/JavaScript, Node.js built-in test runner (`node:test`)

---

### Task 1: Add testable popup preference helpers

**Files:**
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/shared/popup-state.js`
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/tests/popup-state.test.js`

- [ ] **Step 1: Write failing tests** for:
  - current tab mask title wins over recent title
  - recent title fills the input when current tab has no mask
  - preset list matches the approved four values

- [ ] **Step 2: Run `npm test`** and verify the new tests fail because helpers do not exist.

- [ ] **Step 3: Implement minimal helpers**:
  - `DEFAULT_PRESET_MASK_TITLES`
  - `resolveInitialMaskTitle({ currentTabMaskTitle, recentMaskTitle })`

- [ ] **Step 4: Run `npm test`** and verify the new tests pass.

### Task 2: Store and expose the recent title

**Files:**
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/shared/storage.js`
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/background.js`
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/tests/storage.test.js`

- [ ] **Step 1: Write failing tests** for the recent-title storage key normalization helper.

- [ ] **Step 2: Run `npm test`** and verify the new tests fail.

- [ ] **Step 3: Implement minimal storage support**:
  - `RECENT_MASK_TITLE_STORAGE_KEY`
  - `setRecentMaskTitle(maskTitle)`
  - `getRecentMaskTitle()`
  - background support to include `recentMaskTitle` in popup state and save it on apply

- [ ] **Step 4: Run `npm test`** and verify storage tests pass.

### Task 3: Add popup presets and recent-title autofill

**Files:**
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.html`
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.css`
- Modify: `/Users/jasonlin/Documents/aCode/project/ChromePlugin/chromeTab/src/popup.js`

- [ ] **Step 1: Wire popup initialization** so it prefers the current tab's active mask title and otherwise fills the input with the global recent title.

- [ ] **Step 2: Render four preset buttons**:
  - `项目文档`
  - `工作台`
  - `控制台`
  - `资料页`

- [ ] **Step 3: Reuse the existing apply flow** so clicking a preset fills the input and applies immediately.

- [ ] **Step 4: Run `npm test` plus `node --check` on popup/background files** and verify everything passes.
