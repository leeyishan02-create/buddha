# 佛典 Android App 实施计划

> **方案**: Capacitor 混合架构
> **架构**: Web 保持 Serverless SSR/SSG，Android 纯客户端 + 静态导出
> **数据**: 两端独立，不需要同步
> **状态**: 规划阶段

---

## 一、项目现状审计

### 1.1 技术栈

| 层面 | 技术 |
|------|------|
| 框架 | Next.js 16.2.2 + React 19.2.4 |
| 样式 | Tailwind CSS v4 |
| 字体 | LXGW Wenkai TC, Noto Sans TC, Noto Serif TC |
| 图标 | Lucide React |
| 国际化 | OpenCC (繁简转换) |
| 存储 | localStorage (书签、阅读历史) |
| 部署 | 未定 (Vercel/自建) |

### 1.2 数据流架构

```
用户 → Next.js Server Components → lib/deerpark/server.ts → https://deerpark.app/api/v1/*
                                    ↓
                              服务端 fetch (ISR 1h)
                                    ↓
                              渲染 HTML → 浏览器
```

**外部 API 端点 (Deer Park API)**:
- `GET /api/v1/allworks` — 获取全部经典列表 (用于搜索索引)
- `GET /api/v1/toc/{id}` — 获取目录/卷次信息
- `GET /api/v1/html/{id}/{fascicleNum}` — 获取经文 HTML 内容

**当前无自建数据库**，所有数据来自 Deer Park API。

### 1.3 路由结构

| 路由 | 类型 | 数据源 | 导出问题 |
|------|------|--------|---------|
| `/` | Server Component | `getFeaturedTexts()` | 可静态生成 |
| `/search` | Server Component | `searchCbetaTexts()` via `/api/search` | ⚠️ 搜索需客户端 |
| `/text/[catalogId]` | Server Component | `getTextContent()`, `getTableOfContents()` | ⚠️ 动态路由 |
| `/bookmarks` | Client Component | localStorage | 无问题 |
| `/reading-history` | Client Component | localStorage | 无问题 |
| `/settings` | Client Component | 无 | 无问题 |
| `/api/search` | API Route | 代理到 Deer Park API | ❌ 静态导出不可用 |
| `/api/toc/[id]` | API Route | 代理到 Deer Park API | ❌ 静态导出不可用 |

### 1.4 存储层

| 数据 | 存储方式 | 键名 |
|------|---------|------|
| 书签 | localStorage | `buddha-bookmarks` |
| 阅读历史 | localStorage | `reader.recently_read` |
| 阅读偏好 | localStorage/context | (通过 ReadingPrefsProvider) |
| 主题 | (待确认) | (待确认) |

### 1.5 Server Components 清单 (需改造为 Android 端 Client Components)

- `app/page.tsx` — 首页，调用 `getFeaturedTexts()`
- `app/search/page.tsx` — 搜索页
- `app/text/[catalogId]/page.tsx` — 阅读器页，调用 `getTextContent()`, `getTableOfContents()`
- `app/layout.tsx` — 根布局
- `app/not-found.tsx` — 404 页

### 1.6 无以下复杂因素 (好消息)

- ❌ 无 Server Actions (`use server`)
- ❌ 无 middleware
- ❌ 无 cookies/headers 使用
- ❌ 无认证系统
- ❌ 无自建数据库
- ❌ 无 `next/image` (可避免静态导出问题)
- ❌ 无 ISR 依赖 (除缓存外)

---

## 二、关键挑战与解决方案

### 2.1 挑战 1: Server Components 无法静态导出

**问题**: `app/page.tsx`, `app/text/[catalogId]/page.tsx` 等是 Server Components，直接调用 `lib/deerpark/server.ts` 获取数据。静态导出时这些函数无法执行。

**解决方案**: 创建客户端 API 层，直接调用 Deer Park API

```
lib/
├── deerpark/
│   ├── server.ts    # 服务端用 (Web SSR)
│   ├── api.ts       # 已有，但目前指向 /api/* 路由
│   └── client.ts    # 新增: 直接调用 deerpark.app
```

```typescript
// lib/deerpark/client.ts
const DEERPARK_API = "https://deerpark.app/api/v1";

export async function fetchTextContent(id: string, fascicleNum: number = 1) {
  const res = await fetch(`${DEERPARK_API}/html/${id}/${fascicleNum}`);
  if (!res.ok) return null;
  const html = await res.text();
  return parseHtmlToContent(html, id, fascicleNum);
}

export async function fetchAllWorks() {
  const res = await fetch(`${DEERPARK_API}/allworks`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchTOC(id: string) {
  const res = await fetch(`${DEERPARK_API}/toc/${id}`);
  if (!res.ok) return null;
  return res.json();
}
```

### 2.2 挑战 2: 动态路由 `[catalogId]` 无法预渲染

**问题**: `/text/[catalogId]` 是动态路由，有成百上千个可能的 catalogId，无法全部预渲染。

**解决方案**: Android 端使用 Client Component + 客户端路由

- 静态导出时，生成一个通用的 `/text/[catalogId]/index.html`
- 客户端 JavaScript 接管后，根据 URL 参数获取 catalogId 并 fetch 数据
- 或使用 Capacitor 的路由处理

### 2.3 挑战 3: API Routes 无法静态导出

**问题**: `/api/search` 和 `/api/toc/[id]` 是 Next.js API Routes，静态导出时被丢弃。

**解决方案**: 
- Web 端: 保留 API Routes (SSR 模式)
- Android 端: 绕过 API Routes，直接调用 Deer Park API

### 2.4 挑战 4: 搜索功能

**问题**: 当前搜索在服务端执行，`getAllWorks()` 获取全部数据后在服务端过滤。

**解决方案**: 
- 方案 A: 客户端下载全部 works 数据 (约 X MB)，在客户端搜索
- 方案 B: 使用 Deer Park API 的搜索端点 (如果有)
- 方案 C: 实现增量加载 + 客户端搜索

### 2.5 挑战 5: CORS 问题

**问题**: 直接从客户端调用 `deerpark.app` 可能遇到 CORS 限制。

**解决方案**:
- 检查 Deer Park API 是否允许跨域
- 如不允许，需自建 CORS 代理 (Serverless Function)
- 或在 Capacitor 中配置允许跨域

### 2.6 挑战 6: 繁简转换性能

**问题**: `toSimplified()` 在客户端大量调用可能影响性能 (搜索时遍历全部 works)。

**解决方案**:
- 预转换数据并缓存
- 使用 Web Worker 处理转换
- 或预先存储繁简两个版本

### 2.7 挑战 7: HTML 解析

**问题**: `parseHtmlToContent()` 使用正则解析 HTML，在客户端执行可能较慢。

**解决方案**:
- 使用 `DOMParser` API (浏览器原生)
- 或服务端预解析后返回 JSON

---

## 三、实施计划

### Phase 1: 客户端 API 层 (1 周)

**目标**: 创建可直接调用 Deer Park API 的客户端层

#### 1.1 创建 `lib/deerpark/client.ts`

```typescript
// 直接调用 Deer Park API，不经过 Next.js API Routes
// Web 和 Android 端共享

const DEERPARK_API = "https://deerpark.app/api/v1";
const TIMEOUT_MS = 20000;

async function fetchWithTimeout(url: string): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch {
    return null;
  }
}

export async function fetchAllWorks() {
  const res = await fetchWithTimeout(`${DEERPARK_API}/allworks`);
  if (!res || !res.ok) return null;
  return res.json();
}

export async function fetchTextContent(id: string, fascicleNum: number = 1) {
  const res = await fetchWithTimeout(`${DEERPARK_API}/html/${id}/${fascicleNum}`);
  if (!res || !res.ok) return null;
  const html = await res.text();
  return parseHtmlToContent(html, id, fascicleNum);
}

export async function fetchTOC(id: string) {
  const res = await fetchWithTimeout(`${DEERPARK_API}/toc/${id}`);
  if (!res || !res.ok) return null;
  return res.json();
}

// parseHtmlToContent 从 server.ts 提取并共享
```

#### 1.2 创建平台检测工具

```typescript
// lib/platform.ts
export function isNativePlatform(): boolean {
  return typeof window !== 'undefined' && 
    (window as any).Capacitor?.isNativePlatform?.() ?? false;
}

export function getPlatform(): 'web' | 'android' {
  return isNativePlatform() ? 'android' : 'web';
}
```

#### 1.3 验证 CORS

```bash
# 测试 Deer Park API 是否允许跨域
curl -H "Origin: http://localhost:3000" -I https://deerpark.app/api/v1/allworks
```

---

### Phase 2: 组件改造 (1-2 周)

**目标**: 让组件同时支持 SSR (Web) 和 CSR (Android)

#### 2.1 首页 `app/page.tsx`

```typescript
// 当前: Server Component，调用 getFeaturedTexts()
// 改造: 添加 'use client' 条件，或使用双版本

// 方案: 保持 SSR，但添加客户端 hydration 后重新获取
// 或使用 generateStaticParams 预生成
```

#### 2.2 阅读器 `app/text/[catalogId]/page.tsx`

```typescript
// 当前: Server Component，调用 getTextContent() + getTableOfContents()
// 改造: 拆分为:
//   - 服务端版本 (Web SSR)
//   - 客户端版本 (Android CSR)
```

#### 2.3 搜索页 `app/search/page.tsx`

```typescript
// 当前: 通过 /api/search 代理
// 改造: 直接使用客户端 API 层
```

#### 2.4 创建条件渲染包装器

```typescript
// components/platform/ConditionalPage.tsx
// 根据平台选择渲染策略
```

---

### Phase 3: 静态导出配置 (3-5 天)

#### 3.1 Next.js 配置

```typescript
// next.config.ts
const isAndroidBuild = process.env.ANDROID_BUILD === 'true';

const nextConfig: NextConfig = {
  output: isAndroidBuild ? 'export' : undefined,
  trailingSlash: isAndroidBuild,
  images: {
    unoptimized: isAndroidBuild,
  },
};
```

#### 3.2 构建脚本

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "build:android": "ANDROID_BUILD=true next build",
    "cap:sync": "npx cap sync",
    "cap:open": "npx cap open android"
  }
}
```

---

### Phase 4: Capacitor 集成 (1 周)

#### 4.1 安装

```bash
npm install @capacitor/core @capacitor/cli
npx cap init buddha com.buddha.app --web-dir out
npm install @capacitor/android
npx cap add android
npm install @capacitor/preferences @capacitor/filesystem @capacitor/network
```

#### 4.2 配置

```typescript
// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buddha.app',
  appName: '佛典',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    cleartext: true, // 允许 HTTP (如需要)
  },
};

export default config;
```

#### 4.3 存储迁移

```typescript
// lib/storage/adapter.ts
// 统一存储接口，Web 用 localStorage，Android 用 Capacitor Preferences

interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}
```

---

### Phase 5: 离线阅读系统 (2-3 周)

#### 5.1 IndexedDB 存储

```typescript
// lib/storage/TextDatabase.ts
// 使用 idb 库存储经文内容

interface CachedText {
  id: string;
  title: string;
  content: string; // 解析后的内容
  html: string;    // 原始 HTML (可选)
  downloadedAt: number;
  size: number;
}
```

#### 5.2 缓存管理器

```typescript
// lib/cache/TextCacheManager.ts
// 管理下载、读取、缓存失效

class TextCacheManager {
  async downloadText(textId: string, fascicleNum: number): Promise<void>
  async getText(textId: string, fascicleNum: number): Promise<CachedText | null>
  async isAvailableOffline(textId: string, fascicleNum: number): Promise<boolean>
  async clearCache(): Promise<void>
  async getStorageUsage(): Promise<number>
}
```

#### 5.3 UI 组件

- 下载按钮/指示器
- 离线模式标识
- 缓存管理设置页
- 存储空间显示

---

### Phase 6: 后台下载 (1-2 周)

#### 6.1 下载队列

```typescript
// lib/offline/DownloadQueue.ts
// 管理下载队列、进度、重试
```

#### 6.2 Android 后台任务

- 使用 Capacitor Background Task 插件
- 或创建自定义插件调用 Android WorkManager

---

### Phase 7: 测试和优化 (1-2 周)

#### 7.1 测试清单

- [ ] Web 端功能正常 (SSR)
- [ ] Android 端功能正常 (CSR)
- [ ] 离线阅读正常
- [ ] 后台下载正常
- [ ] 书签功能正常
- [ ] 阅读历史正常
- [ ] 搜索功能正常
- [ ] 繁简转换正常
- [ ] 主题切换正常
- [ ] 性能达标

#### 7.2 性能优化

- 虚拟列表 (长经文)
- 懒加载组件
- 代码分割
- 缓存策略优化

---

## 四、风险评估

### 高风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| CORS 限制 | 无法直接调用 API | 自建 CORS 代理或使用 WebView 配置 |
| 动态路由导出 | 阅读器页面无法生成 | 使用客户端路由或 fallback 页面 |
| 大文本性能 | 长经文渲染卡顿 | 虚拟列表、分页加载 |

### 中风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 搜索性能 | 客户端搜索慢 | Web Worker、预过滤 |
| 存储空间限制 | IndexedDB 配额 | 缓存管理、L RU 淘汰 |
| HTML 解析兼容性 | 解析失败 | 使用 DOMParser 替代正则 |

### 低风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 字体加载 | 首次加载慢 | 预加载、字体子集 |
| 主题切换 | 闪烁 | SSR 主题检测 |

---

## 五、时间估算

| Phase | 内容 | 时间 | 累计 |
|-------|------|------|------|
| 1 | 客户端 API 层 + CORS 验证 | 1 周 | 1 周 |
| 2 | 组件改造 (SSR/CSR 双模式) | 1-2 周 | 2-3 周 |
| 3 | 静态导出配置 | 3-5 天 | 3-4 周 |
| 4 | Capacitor 集成 + 存储迁移 | 1 周 | 4-5 周 |
| 5 | 离线阅读系统 | 2-3 周 | 6-8 周 |
| 6 | 后台下载 | 1-2 周 | 7-10 周 |
| 7 | 测试和优化 | 1-2 周 | 8-12 周 |

**总计: 8-12 周** (质量优先，渐进实施)

---

## 六、待确认事项

### 6.1 需要向 Deer Park API 确认

- [ ] CORS 策略是否允许跨域调用？
- [ ] API 速率限制是多少？
- [ ] 是否提供搜索端点 (避免客户端全量搜索)？
- [ ] API 稳定性/SLA 如何？

### 6.2 需要确认的业务问题

- [ ] 是否需要支持多语言 (简体/繁体) 切换？
- [ ] 是否需要用户账号系统 (未来)？
- [ ] 应用名称和图标是否已确定？
- [ ] 是否需要推送通知功能？
- [ ] 是否需要分享功能？

### 6.3 技术决策待确认

- [ ] IndexedDB 库选择: `idb` vs `localforage` vs 原生
- [ ] 后台下载方案: Capacitor 插件 vs 自定义插件
- [ ] 搜索方案: 客户端全量搜索 vs 服务端搜索
- [ ] 虚拟列表库: `@tanstack/virtual` vs 自实现

---

## 七、关键文件索引

| 文件 | 用途 | 改造优先级 |
|------|------|-----------|
| `lib/deerpark/server.ts` | 服务端 API 调用 | 高 - 需提取解析逻辑 |
| `lib/deerpark/api.ts` | 客户端 API (指向 /api/*) | 高 - 需改为直接调用 |
| `lib/db/bookmarks.ts` | 书签存储 | 中 - 需适配 Capacitor |
| `lib/db/reading-history.ts` | 阅读历史存储 | 中 - 需适配 Capacitor |
| `app/page.tsx` | 首页 | 高 - Server Component |
| `app/text/[catalogId]/page.tsx` | 阅读器 | 高 - Server Component + 动态路由 |
| `app/search/page.tsx` | 搜索 | 高 - 依赖 API Route |
| `app/layout.tsx` | 根布局 | 中 - Server Component |
| `next.config.ts` | Next.js 配置 | 高 - 需添加静态导出 |
| `components/reader/*` | 阅读器组件 | 中 - 可能需要适配 |

---

## 八、深度审查发现的纰漏 (2026-04-07 更新)

### 纰漏 1: CORS 限制 — 已验证 ❌

**验证结果**: Deer Park API **不返回** `Access-Control-Allow-Origin` 头，浏览器直接调用会被阻止。

**测试命令**:
```bash
curl -s -v -H "Origin: http://localhost:3000" https://deerpark.app/api/v1/allworks 2>&1 | grep -i "access-control"
# 输出: (空) — 无 CORS 头
```

**影响**: 
- Web 端: 必须保留 `/api/*` 路由作为代理
- Android 端: Capacitor WebView 不受 CORS 限制，可直接调用

**解决方案**:
```typescript
// lib/deerpark/api.ts — 平台感知
const API_BASE = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()
  ? "https://deerpark.app/api/v1"  // Android: 直接调用
  : "/api";                          // Web: 通过 API Route 代理
```

---

### 纰漏 2: 数据量评估 — 已验证 ✅

**验证结果**: 
- 经典总数: **4,303 部**
- 响应大小: **475 KB** (传输) / **~700 KB** (JSON 解析后)
- 下载时间 (4G): < 1 秒

**测试命令**:
```bash
curl -s -o /dev/null -w "%{size_download}" https://deerpark.app/api/v1/allworks
# 输出: 486057
```

**结论**: 客户端下载 + 搜索完全可行，无需服务端搜索。

---

### 纰漏 3: `next/font/google` 静态导出 — 待处理 ⚠️

**发现**: `app/layout.tsx` 使用 `next/font/google` 加载 4 个字体。

**影响**: 静态导出时字体文件路径可能不正确。

**解决方案**: 已在 package.json 中有 `@fontsource` 包，可替换或测试验证。

---

### 纰漏 4: 搜索页实际是 Client Component，但依赖 API Route

**发现**: `app/search/page.tsx` 本身不是 Server Component，它渲染 `SearchPageClient` (已标记 `'use client'`)。但 `SearchPageClient` 调用 `searchTexts()` from `lib/deerpark/api.ts`，而该函数指向 `/api/search`。

**问题**: 静态导出后 `/api/search` 不存在，搜索完全失效。

**影响**: 高 — 搜索功能完全不可用

**解决方案**:
```typescript
// lib/deerpark/api.ts 需要修改
// 当前: const API_BASE = "/api";
// 改为: const API_BASE = isAndroidBuild ? "https://deerpark.app/api/v1" : "/api";

// 或直接创建 client.ts 调用 Deer Park API
```

**关键发现**: 搜索逻辑已经是客户端的 (useMemo 过滤)，只需改变数据源即可

---

### 纰漏 5: `redirect()` 在静态导出中不工作

**发现**: `app/text/[catalogId]/page.tsx` 使用 `redirect()` (from `next/navigation`)。

**问题**: 静态导出后，`redirect()` 在服务端执行，导出时无法处理动态重定向逻辑。

**影响**: 中 — 阅读器页面的错误处理重定向失效

**解决方案**:
```typescript
// 客户端版本使用 router.replace() 替代 redirect()
// 或使用条件判断: if (isStaticExport) { return <ErrorPage /> } else { redirect(...) }
```

---

### 纰漏 6: `dynamic()` 导入在静态导出中的行为

**发现**: `app/text/[catalogId]/page.tsx` 使用 `dynamic()` 导入 3 个大组件 (CbetaTextContent, TableOfContents, ReadingControls)。

**问题**: 静态导出后，`dynamic()` 的 chunk 加载路径可能不正确。

**影响**: 中 — 阅读器组件可能加载失败

**解决方案**: 测试静态导出后的 chunk 加载，必要时配置 `basePath`

---

### 纰漏 7: 搜索数据量未评估 — 已验证 ✅

**验证结果**: 
- 经典总数: **4,303 部**
- 响应大小: **475 KB** (传输) / **~700 KB** (JSON 解析后)
- 下载时间 (4G): < 1 秒

**结论**: 客户端下载 + 搜索完全可行，无需服务端搜索。

---

### 纰漏 8: 繁简转换在服务端执行，客户端没有

**发现**: `lib/deerpark/server.ts` 中 `getAllWorks()` 调用 `toSimplified()` 转换标题和作者。

**问题**: 如果客户端直接获取 allWorks，数据是繁体的。搜索时需要转换。

**影响**: 中 — 客户端搜索性能问题

**解决方案**:
```typescript
// 方案 A: 服务端返回繁简双版本
// 方案 B: 客户端缓存转换结果
// 方案 C: 搜索时仅转换匹配结果 (而非全部)
```

---

### 纰漏 9: `SearchPageClient` 中的 `Suspense` 嵌套问题

**发现**: `app/search/page.tsx` 有 `Suspense`，`SearchPageClient` 内部又有 `Suspense`。

**问题**: 静态导出后，Suspense boundary 的行为可能不一致。

**影响**: 低 — 可能影响加载状态显示

**解决方案**: 简化 Suspense 结构，确保静态导出后正常工作

---

### 纰漏 10: 缺少 fallback 路由处理

**发现**: 静态导出时，动态路由 `/text/[catalogId]` 需要 fallback 页面。

**问题**: Next.js 16 静态导出动态路由需要配置 `generateStaticParams` 或 fallback 策略。

**影响**: 高 — 阅读器页面可能 404

**解决方案**:
```typescript
// app/text/[catalogId]/page.tsx
// 添加 generateStaticParams 预生成热门经典
// 或配置 fallback: true (但需要 server，不适用于静态导出)

// 推荐方案: 创建通用的 fallback HTML 页面，客户端 JS 接管后 fetch 数据
export async function generateStaticParams() {
  // 预生成热门 50 部经典
  return FEATURED_IDS.map(id => ({ catalogId: id }));
}
```

---

### 纰漏 11: 阅读器页面架构复杂 — 深度审查发现

**发现**: `app/text/[catalogId]/page.tsx` 是 Server Component，但它渲染的组件链极其复杂：
- `ReadingPrefsProvider` (Client) → 提供字体、行距、内容宽度等阅读偏好
- `SaveReadingHistory` (Client) → 自动保存阅读历史到 localStorage
- `CbetaTextContent` (Client, 497 行) → 核心阅读器，包含：
  - 繁简转换 (useMemo 遍历整个内容树)
  - 注脚弹出/底部面板
  - 段落渲染 (带注脚标记 `§FOOTNOTE§`)
  - 元数据折叠面板
  - 注脚列表折叠
- `FascicleNav` → 卷次导航
- `TableOfContents` (Client) → 目录
- `ReadingControls` (Client) → 阅读控制
- `ReadingHeader` → 头部
- `ReadingProgress` → 进度条

**问题**:
1. Server Component 依赖 `getTextContent()` + `getTableOfContents()` (服务端调用)
2. 传递给 Client Components 的 `content` prop 是服务端解析后的对象
3. `CbetaTextContent` 内部有繁简转换逻辑 (与 `toSimplified()` 不同，使用 `convert()`)
4. `SaveReadingHistory` 在服务端渲染时执行 `useEffect` → 首次 hydration 时保存
5. `ReadingPrefsProvider` 依赖 `useReadingPrefs` hook → localStorage 读取

**影响**: 高 — 阅读器是最核心功能，改造难度大

**解决方案**:
```typescript
// 方案: 创建客户端阅读器页面 (app/text/[catalogId]/client-page.tsx)
// 1. 从 URL 解析 catalogId 和 vol
// 2. 使用 lib/deerpark/client.ts 获取数据
// 3. 复用所有现有 Client Components
// 4. 条件渲染: Web 用 Server Component, Android 用 Client Component

// 平台检测
import { isNativePlatform } from '@/lib/platform';

// 阅读器页面拆分
// app/text/[catalogId]/page.tsx (Web SSR) — 保持现状
// app/text/[catalogId]/client-page.tsx (Android CSR) — 新增
```

---

### 纰漏 12: 繁简转换有两套系统

**发现**: 
- `lib/locale/convert.ts` — `toSimplified()` (OpenCC)，用于搜索/服务端
- `CbetaTextContent` 内部 — `convert()` (通过 `useLocale()`)，用于阅读器

**问题**: 两套转换逻辑可能导致不一致。客户端搜索时需要用哪套？

**影响**: 中 — 可能导致繁简转换结果不一致

**解决方案**: 统一使用 `useLocale()` + `convert()` (已在阅读器中使用)

---

### 纰漏 13: `§FOOTNOTE§` 分隔符依赖服务端解析

**发现**: `CbetaTextContent` 使用 `paragraph.text.split("§FOOTNOTE§")` 分割注脚标记。

**问题**: 这个分隔符是在 `parseHtmlToContent()` (server.ts) 中生成的。客户端直接解析 HTML 时需要确保生成分隔符。

**影响**: 高 — 注脚功能完全依赖此分隔符

**解决方案**: 提取 `parseHtmlToContent()` 为共享函数，客户端和服务端共用

---

### 纰漏 14: 缺少 HTML 端点数据量测试

**发现**: 经文内容通过 `/api/v1/html/{id}/{fascicleNum}` 获取 HTML。

**问题**: 未测试 HTML 响应大小，可能影响离线存储策略。

**影响**: 中 — 需要知道典型经文大小来设计缓存

**解决方案**: 测试几个不同大小的经文 HTML 响应

---

### 纰漏 11: 阅读器页面架构复杂 — 深度审查发现

**发现**: `app/text/[catalogId]/page.tsx` 是 Server Component，但它渲染的组件链极其复杂：
- `ReadingPrefsProvider` (Client) → 提供字体、行距、内容宽度等阅读偏好
- `SaveReadingHistory` (Client) → 自动保存阅读历史到 localStorage
- `CbetaTextContent` (Client, 497 行) → 核心阅读器，包含：
  - 繁简转换 (useMemo 遍历整个内容树)
  - 注脚弹出/底部面板
  - 段落渲染 (带注脚标记 `§FOOTNOTE§`)
  - 元数据折叠面板
  - 注脚列表折叠
- `FascicleNav` → 卷次导航
- `TableOfContents` (Client) → 目录
- `ReadingControls` (Client) → 阅读控制
- `ReadingHeader` → 头部
- `ReadingProgress` → 进度条

**问题**:
1. Server Component 依赖 `getTextContent()` + `getTableOfContents()` (服务端调用)
2. 传递给 Client Components 的 `content` prop 是服务端解析后的对象
3. `CbetaTextContent` 内部有繁简转换逻辑 (与 `toSimplified()` 不同，使用 `convert()`)
4. `SaveReadingHistory` 在服务端渲染时执行 `useEffect` → 首次 hydration 时保存
5. `ReadingPrefsProvider` 依赖 `useReadingPrefs` hook → localStorage 读取

**影响**: 高 — 阅读器是最核心功能，改造难度大

**解决方案**:
```typescript
// 方案: 创建客户端阅读器页面 (app/text/[catalogId]/client-page.tsx)
// 1. 从 URL 解析 catalogId 和 vol
// 2. 使用 lib/deerpark/client.ts 获取数据
// 3. 复用所有现有 Client Components
// 4. 条件渲染: Web 用 Server Component, Android 用 Client Component

// 平台检测
import { isNativePlatform } from '@/lib/platform';

// 阅读器页面拆分
// app/text/[catalogId]/page.tsx (Web SSR) — 保持现状
// app/text/[catalogId]/client-page.tsx (Android CSR) — 新增
```

---

### 纰漏 12: 繁简转换有两套系统

**发现**: 
- `lib/locale/convert.ts` — `toSimplified()` (OpenCC)，用于搜索/服务端
- `CbetaTextContent` 内部 — `convert()` (通过 `useLocale()`)，用于阅读器

**问题**: 两套转换逻辑可能导致不一致。客户端搜索时需要用哪套？

**影响**: 中 — 可能导致繁简转换结果不一致

**解决方案**: 统一使用 `useLocale()` + `convert()` (已在阅读器中使用)

---

### 纰漏 13: `§FOOTNOTE§` 分隔符依赖服务端解析

**发现**: `CbetaTextContent` 使用 `paragraph.text.split("§FOOTNOTE§")` 分割注脚标记。

**问题**: 这个分隔符是在 `parseHtmlToContent()` (server.ts) 中生成的。客户端直接解析 HTML 时需要确保生成分隔符。

**影响**: 高 — 注脚功能完全依赖此分隔符

**解决方案**: 提取 `parseHtmlToContent()` 为共享函数，客户端和服务端共用

---

### 纰漏 14: 缺少 HTML 端点数据量测试

**发现**: 经文内容通过 `/api/v1/html/{id}/{fascicleNum}` 获取 HTML。

**问题**: 未测试 HTML 响应大小，可能影响离线存储策略。

**影响**: 中 — 需要知道典型经文大小来设计缓存

**解决方案**: 测试几个不同大小的经文 HTML 响应

---

### 纰漏 14: HTML 端点数据量 — 已验证 ✅

**验证结果**:

| 经文 | 卷号 | HTML 大小 | 类型 |
|------|------|-----------|------|
| T0251 (心经) | 1 | **19 KB** | 短经文 |
| T0366 | 1 | **40 KB** | 中等 |
| T0235 (金刚经) | 1 | **102 KB** | 中等 |
| T0475 | 1 | **170 KB** | 较长 |
| T0262 | 1 | **278 KB** | 长 |
| T0001 (长阿含经) | 1 | **285 KB** | 最长卷 |
| T0001 (长阿含经) | 10 | **184 KB** | 中等 |
| T0001 (长阿含经) | 22 | **153 KB** | 中等 |

**关键数据**:
- 单卷 HTML 大小范围: **19 KB ~ 285 KB**
- T0001 共 22 卷，总计约 **~4 MB** (全部下载)
- 大部分经文单卷 < 200 KB

**结论**: 
- 单卷下载完全可行
- 整部大经 (如 T0001) 全部下载约 4 MB，可接受
- IndexedDB 存储解析后内容会更小 (纯文本 vs HTML)

---

### 纰漏 14: HTML 端点数据量 — 已验证 ✅

**验证结果**:

| 经文 | 卷号 | HTML 大小 | 类型 |
|------|------|-----------|------|
| T0251 (心经) | 1 | **19 KB** | 短经文 |
| T0366 | 1 | **40 KB** | 中等 |
| T0235 (金刚经) | 1 | **102 KB** | 中等 |
| T0475 | 1 | **170 KB** | 较长 |
| T0262 | 1 | **278 KB** | 长 |
| T0001 (长阿含经) | 1 | **285 KB** | 最长卷 |
| T0001 (长阿含经) | 10 | **184 KB** | 中等 |
| T0001 (长阿含经) | 22 | **153 KB** | 中等 |

**关键数据**:
- 单卷 HTML 大小范围: **19 KB ~ 285 KB**
- T0001 共 22 卷，总计约 **~4 MB** (全部下载)
- 大部分经文单卷 < 200 KB

**结论**: 
- 单卷下载完全可行
- 整部大经 (如 T0001) 全部下载约 4 MB，可接受
- IndexedDB 存储解析后内容会更小 (纯文本 vs HTML)

---

## 九、修正后的实施优先级

### 第一步必须解决 (阻塞项)

1. **CORS 策略** — ✅ 已验证: API 无 CORS 头
   - Web 端: 保留 `/api/*` 路由代理
   - Android 端: Capacitor WebView 不受 CORS 限制，直接调用
2. **数据量评估** — ✅ 已验证
   - allWorks: 475 KB / 4,303 部 → 客户端搜索可行
   - HTML 单卷: 19-285 KB → 离线存储可行
   - 最大经文 (T0001): ~4 MB 全部 → 可接受
3. **字体处理** — ⚠️ 待处理: `next/font/google` 静态导出验证

### 第二步 (核心功能)

4. 提取 `parseHtmlToContent()` 为共享函数 (server.ts → shared.ts)
5. 创建客户端 API 层 (`lib/deerpark/client.ts`)
6. 修改 `lib/deerpark/api.ts` 为平台感知
7. 统一繁简转换逻辑 (useLocale 优先)
8. 改造阅读器页面为 Client Component
9. 配置静态导出 + fallback 路由

### 第三步 (Capacitor)

10. Capacitor 集成
11. 存储迁移 (localStorage → Capacitor Preferences / IndexedDB)
12. 离线阅读系统
13. 后台下载

### 第四步 (优化)

14. 性能优化 (虚拟列表、懒加载)
15. 测试和发布

---

## 十、验证记录 (2026-04-07)

### CORS 测试

```bash
# allWorks 端点
curl -s -v -H "Origin: http://localhost:3000" https://deerpark.app/api/v1/allworks 2>&1 | grep -i "access-control"
# 结果: 无 Access-Control-Allow-Origin 头 → CORS 被阻止

# OPTIONS 预检请求
curl -s -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: GET" -I https://deerpark.app/api/v1/allworks
# 结果: 204 No Content, 无 CORS 头 → 预检失败
```

**结论**: 浏览器直接调用会被阻止，Capacitor WebView 可绕过。

### 数据量测试

```bash
# 响应大小
curl -s -o /dev/null -w "%{size_download}" https://deerpark.app/api/v1/allworks
# 结果: 486057 bytes ≈ 475 KB

# 数据解析
curl -s https://deerpark.app/api/v1/allworks | python3 -c "import sys,json; data=json.load(sys.stdin); print(f'经典总数: {len(data)}')"
# 结果: 4,303 部经典
```

**结论**: 客户端下载 + 搜索完全可行。

---

*最后更新: 2026-04-07*
*状态: 深度审查完成 — 发现 14 个纰漏，3 项阻塞项中 2 项已验证，1 项待处理*
*新增发现: 阅读器架构复杂度 (纰漏 11)、两套繁简转换 (纰漏 12)、§FOOTNOTE§ 分隔符依赖 (纰漏 13)、HTML 数据量 (纰漏 14)*
