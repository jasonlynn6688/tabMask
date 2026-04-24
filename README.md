<div align="center">

# 🏷️ Tab Mask · 标签页重命名

**给浏览器标签页起个你自己才懂的名字。**

[![Version](https://img.shields.io/badge/version-0.3.0-0F4D40?style=flat-square)](https://github.com/jasonlynn6688/tabMask/releases)
[![License](https://img.shields.io/badge/license-MIT-0F4D40?style=flat-square)](LICENSE)
[![Manifest](https://img.shields.io/badge/Chrome-Manifest%20V3-0F4D40?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-0F4D40?style=flat-square)](https://github.com/jasonlynn6688/tabMask/pulls)

<br/>

![demo](assets/tabmask_demo.gif)

</div>

---

## 这是什么

一个 Chrome 插件，让你自定义浏览器标签页的显示名称。

同时打开很多标签页时，一个清晰、简短的名字能帮你更快找到目标页面。

## 功能

- **一键改名** — 打开插件，选个名字，应用，完事
- **智能建议** — 自动推荐几个简洁的备选名称
- **历史记录** — 上次用过的名字，下次一键复用
- **恢复原名** — 随时一键还原
- **键盘优先** — `Enter` 应用 / `Esc` 清空 / `Ctrl+1–9`（Mac: `⌘+1–9`）快选

## 安装

目前需要手动加载（Chrome 应用商店上架中）：

1. 下载或 clone 本仓库
2. 打开 Chrome，进入 `chrome://extensions/`
3. 右上角开启「开发者模式」
4. 点击「加载已解压的扩展程序」，选择 `src/` 目录

## 使用

1. 在任意普通网页点击扩展图标
2. 从建议中挑一个，或者自己输入
3. 按 `Enter` 或点「应用」
4. 弹窗关闭，标签页已改名 ✓

想恢复原名？打开插件点「恢复原标题」，弹窗自动关闭。

## 支持的页面

普通 `http` / `https` 网页均支持。Chrome 内置页（`chrome://`）和应用商店页面不支持。

## 开发

```bash
# 跑测试
node --test tests/
```

## Contributing

欢迎提 Issue 和 PR。有想法直接开 Discussion 聊。

## License

[MIT](LICENSE) © 2026 jasonlynn6688
