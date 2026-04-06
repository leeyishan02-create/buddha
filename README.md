# 佛典

[📖 繁體中文版](./README.zh-Hant.md)

🌐 在线体验：[buddha-taupe.vercel.app](https://buddha-taupe.vercel.app)

🌐 在线体验：[buddha-taupe.vercel.app](https://buddha-taupe.vercel.app)

## 项目初衷

CBETA 和 Deer Park 是优秀的佛经数据平台，但在使用过程中我发现它们的界面存在一些不足：

- **没有简体中文支持**，对简体用户阅读不够友好
- **无法调整字体、行间距、页面宽度**，阅读体验受限于默认设置
- **界面设计较为传统**，缺乏现代化的交互体验

因此，我开发了这个项目——**让喜欢看佛经的人能有舒适的阅读体验**。

## 功能亮点

- **字体切换**：霞鹜文楷、思源宋体、思源黑体三种字体可选
- **字号调节**：支持精确到像素级别的字号调整
- **行距调节**：自由调整行间距，找到最舒适的阅读节奏
- **页面宽度**：窄、中、宽、全宽四种布局可选
- **简繁切换**：一键在简体中文与繁体中文之间切换
- **主题切换**：宣纸（浅色）、古卷（棕褐）、墨夜（深色）三种主题
- **搜索经典**：支持按名称、译者搜索全部大藏经
- **书签与阅读记录**：本地保存书签和阅读进度

## 技术栈

- [Next.js 16](https://nextjs.org/) — 应用框架
- [React 19](https://react.dev/) — UI 库
- [Tailwind CSS 4](https://tailwindcss.com/) — 样式框架
- [TypeScript](https://www.typescriptlang.org/) — 类型安全
- [Lucide](https://lucide.dev/) — 图标库
- [opencc-js](https://github.com/nickspaargaren/opencc-js) — 简繁转换

## 开发工具

本项目使用 [OpenCode](https://opencode.ai) 配合 [Qwen 3.6](https://qwen.ai) 模型开发。

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 即可查看。

### 构建生产版本

```bash
npm run build
```

### 运行生产版本

```bash
npm start
```

## 许可协议

本项目基于 MIT 许可协议开源。经文数据来自 [Deer Park API](https://deerpark.app/)，原始文本由 [CBETA](https://www.cbeta.org/) 提供（CC BY-NC-SA 3.0 许可协议）。
