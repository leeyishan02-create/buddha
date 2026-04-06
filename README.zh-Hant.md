# 佛典

[📖 简体中文版](./README.md)

## 專案初衷

CBETA 和 Deer Park 是優秀的佛經資料平台，但在使用過程中我發現它們的介面存在一些不足：

- **沒有簡體中文支援**，對簡體使用者閱讀不夠友善
- **無法調整字型、行距、頁面寬度**，閱讀體驗受限於預設設定
- **介面設計較為傳統**，缺乏現代化的互動體驗

因此，我開發了這個專案——**讓喜歡看佛經的人能有舒適的閱讀體驗**。

## 功能亮點

- **字型切換**：霞鶩文楷、思源宋體、思源黑體三種字型可選
- **字號調節**：支援精確到像素級別的字號調整
- **行距調節**：自由調整行距，找到最舒適的閱讀節奏
- **頁面寬度**：窄、中、寬、全寬四種版面可選
- **簡繁切換**：一鍵在簡體中文與繁體中文之間切換
- **主題切換**：宣紙（淺色）、古卷（棕褐）、墨夜（深色）三種主題
- **搜尋經典**：支援按名稱、譯者搜尋全部大藏經
- **書籤與閱讀記錄**：本地儲存書籤和閱讀進度

## 技術棧

- [Next.js 16](https://nextjs.org/) — 應用框架
- [React 19](https://react.dev/) — UI 庫
- [Tailwind CSS 4](https://tailwindcss.com/) — 樣式框架
- [TypeScript](https://www.typescriptlang.org/) — 型別安全
- [Lucide](https://lucide.dev/) — 圖示庫
- [opencc-js](https://github.com/nickspaargaren/opencc-js) — 簡繁轉換

## 開發工具

本專案使用 [OpenCode](https://opencode.ai) 配合 [Qwen 3.6](https://qwen.ai) 模型開發。

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 即可檢視。

### 建構生產版本

```bash
npm run build
```

### 執行生產版本

```bash
npm start
```

## 授權條款

本專案基於 MIT 授權條款開源。經文資料來自 [Deer Park API](https://deerpark.app/)，原始文字由 [CBETA](https://www.cbeta.org/) 提供（CC BY-NC-SA 3.0 授權條款）。
