import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PRESET_MASK_TITLES,
  buildStatusMessage,
  canApplyMask,
  isPresetMaskTitleActive,
  resolveInitialMaskTitle,
  sanitizeMaskTitle,
  shouldAutoCloseAfterApply,
} from "../src/shared/popup-state.js";

test("sanitizeMaskTitle trims user input", () => {
  assert.equal(sanitizeMaskTitle("  Project Docs  "), "Project Docs");
});

test("canApplyMask only allows non-empty titles", () => {
  assert.equal(canApplyMask("Project Docs"), true);
  assert.equal(canApplyMask(""), false);
});

test("buildStatusMessage maps unsupported tabs to a helpful message", () => {
  assert.equal(
    buildStatusMessage({ type: "UNSUPPORTED_TAB" }),
    "只支持普通网页标签页，不能用于 Chrome 内置页或应用商店页。",
  );
});

test("buildStatusMessage maps active masks to a helpful message", () => {
  assert.equal(
    buildStatusMessage({ type: "MASK_ACTIVE", maskTitle: "Project Docs" }),
    '当前标签已改名为 "Project Docs"。',
  );
});

test("buildStatusMessage reads mask title from nested rule payloads", () => {
  assert.equal(
    buildStatusMessage({
      type: "MASK_ACTIVE",
      rule: { maskTitle: "Project Docs" },
    }),
    '当前标签已改名为 "Project Docs"。',
  );
});

test("buildStatusMessage falls back to a neutral idle message", () => {
  assert.equal(buildStatusMessage(), "输入一个新名称后点击应用。");
});

test("resolveInitialMaskTitle prefers the current tab mask title", () => {
  assert.equal(
    resolveInitialMaskTitle({
      currentTabMaskTitle: "当前标签标题",
      recentMaskTitle: "最近标题",
    }),
    "当前标签标题",
  );
});

test("resolveInitialMaskTitle falls back to the recent title", () => {
  assert.equal(
    resolveInitialMaskTitle({
      currentTabMaskTitle: "",
      recentMaskTitle: "最近标题",
    }),
    "最近标题",
  );
});

test("DEFAULT_PRESET_MASK_TITLES matches the approved fixed presets", () => {
  assert.deepEqual(DEFAULT_PRESET_MASK_TITLES, [
    "项目文档",
    "工作台",
    "控制台",
    "资料页",
  ]);
});

test("isPresetMaskTitleActive matches the current value after trimming", () => {
  assert.equal(isPresetMaskTitleActive("  项目文档  ", "项目文档"), true);
});

test("isPresetMaskTitleActive rejects non-matching values", () => {
  assert.equal(isPresetMaskTitleActive("资料页", "项目文档"), false);
});

test("shouldAutoCloseAfterApply closes only after a successful rename", () => {
  assert.equal(shouldAutoCloseAfterApply({ type: "MASK_ACTIVE" }), true);
  assert.equal(shouldAutoCloseAfterApply({ type: "ERROR" }), false);
  assert.equal(shouldAutoCloseAfterApply({ type: "UNSUPPORTED_TAB" }), false);
});
