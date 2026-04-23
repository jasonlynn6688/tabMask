export const DEFAULT_PRESET_MASK_TITLES = [
  "项目文档",
  "工作台",
  "控制台",
  "资料页",
];

export function sanitizeMaskTitle(value) {
  return String(value ?? "").trim();
}

export function canApplyMask(value) {
  return sanitizeMaskTitle(value).length > 0;
}

export function resolveInitialMaskTitle({
  currentTabMaskTitle,
  recentMaskTitle,
}) {
  return sanitizeMaskTitle(currentTabMaskTitle) || sanitizeMaskTitle(recentMaskTitle);
}

export function isPresetMaskTitleActive(currentValue, presetTitle) {
  return sanitizeMaskTitle(currentValue) === sanitizeMaskTitle(presetTitle);
}

export function shouldAutoCloseAfterApply(state) {
  return state?.type === "MASK_ACTIVE";
}

export function generateSmartSuggestions(currentValue) {
  const current = sanitizeMaskTitle(currentValue);
  return DEFAULT_PRESET_MASK_TITLES.filter((t) => t !== current).slice(0, 3);
}

export function buildStatusMessage(state) {
  switch (state?.type) {
    case "UNSUPPORTED_TAB":
      return "只支持普通网页标签页，不能用于 Chrome 内置页或应用商店页。";
    case "MASK_ACTIVE": {
      const maskTitle = state.maskTitle ?? state.rule?.maskTitle;
      return maskTitle
        ? `当前标签已改名为 "${maskTitle}"。`
        : "当前标签已启用改名。";
    }
    case "MASK_CLEARED":
      return "已恢复原始标签名称。";
    case "EMPTY_INPUT":
      return "先输入一个新的标签名称。";
    case "ERROR":
      return state.message || "操作失败，请重试。";
    default:
      return "输入一个新名称后点击应用。";
  }
}
