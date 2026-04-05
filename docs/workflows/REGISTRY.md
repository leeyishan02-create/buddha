# Workflow Registry — Buddhist Text Reader (Serverless)
**Date**: 2026-04-05
**Auditor**: Workflow Architect
**System**: Buddhist Text Reading Website — Fully Serverless Architecture
**Architecture Change**: v0.1 (Persistent Backend) → v0.2 (Serverless)

---

## ⚠️ Serverless Architecture Change Summary

All workflows have been updated to reflect a **fully serverless** deployment model:
- **No persistent backend servers** — API routes run as serverless functions (Vercel)
- **Cold start budget**: 10s timeout on Vercel free tier; 60s on Pro
- **Data storage**: Pure client-side (localStorage/IndexedDB) for v1.0; serverless DB (Supabase/Turso/D1) as migration target for v2.0
- **CBETA API calls**: Proxied through Next.js serverless functions at `/api/cbeta/[...path]`
- **No Redis cache** — replaced with client-side IndexedDB cache + Vercel Edge Cache
- **No PostgreSQL for bookmarks in v1.0** — bookmarks stored in localStorage/IndexedDB; cross-device sync deferred to v2.0

---

## View 1: By Workflow (Master List)

| # | Workflow | Spec File | Status | Trigger | Primary Actor | Last Reviewed |
|---|---|---|---|---|---|---|
| 1 | Book Search | WORKFLOW-book-search.md | Draft (v0.2) | User enters search query | Frontend UI → Serverless fn | 2026-04-05 |
| 2 | Text Reading | WORKFLOW-text-reading.md | Draft (v0.2) | User selects a book | Frontend UI → Serverless fn | 2026-04-05 |
| 3 | Preference Management | WORKFLOW-preference-management.md | Draft (v0.2) | User changes settings | Pure client-side | 2026-04-05 |
| 4 | Language Toggle | WORKFLOW-language-toggle.md | Draft (v0.2) | User toggles SC/TC | Pure client-side | 2026-04-05 |
| 5 | Bookmark Management | WORKFLOW-bookmark-management.md | Draft (v0.2) | User adds/navigates bookmark | Pure client-side → migration path | 2026-04-05 |
| 6 | Session & Persistence | WORKFLOW-session-persistence.md | Draft (v0.2) | Page load / unload / periodic | Pure client-side | 2026-04-05 |
| 7 | Text Chunk Loading | WORKFLOW-text-chunk-loading.md | Draft (v0.2) | User scrolls / navigates | Frontend → Serverless fn | 2026-04-05 |
| 8 | CBETA API Proxy | WORKFLOW-cbeta-api-proxy.md | Draft (v0.2) | Any frontend request to CBETA | Serverless function | 2026-04-05 |

---

## View 2: By Component (Serverless)

| Component | File(s) | Workflows It Participates In | Serverless? |
|---|---|---|---|
| Search UI Component | `components/search/SearchBar.*`, `SearchResults.*` | 1 (Book Search) | Client |
| Search API Route | `app/api/search/route.ts` | 1, 8 | **Serverless fn** |
| Reader UI Component | `components/reader/TextReader.*`, `Paragraph.*` | 2, 4, 7 | Client |
| Virtual Scroller | `components/reader/VirtualScrollView.*` | 2, 7 | Client |
| Settings Panel | `components/settings/SettingsPanel.*` | 3 | Client |
| Language Converter | `lib/conversion/opencc.*` | 4 | Client (Web Worker) |
| Bookmark UI Component | `components/bookmarks/BookmarkList.*`, `BookmarkIndicator.*` | 5 | Client |
| CBETA API Proxy Route | `app/api/cbeta/[...path]/route.ts` | 1, 2, 7, 8 | **Serverless fn** |
| CbetaService | `lib/cbeta/client.*` | 1, 2, 7, 8 | **Serverless fn** (no Redis) |
| Zustand Stores | `stores/reader-store.*`, `settings-store.*`, `bookmark-store.*` | 2, 3, 4, 5, 6 | Client |
| localStorage | Browser API | 3, 5, 6 | Client |
| IndexedDB | Browser API | 5, 6, 7 | Client |
| ~~PostgreSQL (Neon)~~ | ~~db/schema/~~ | ~~5, 6~~ | **REMOVED v1.0** — deferred to v2.0 |
| ~~Redis (Upstash)~~ | ~~lib/cbeta/cache.*~~ | ~~8~~ | **REMOVED v1.0** — replaced with client cache |

---

## View 3: By User Journey

### Reader Journeys
| What the Reader Experiences | Underlying workflow(s) | Entry Point | Cold Start Risk |
|---|---|---|---|
| Searches for a text | Book Search → CBETA API Proxy (serverless) | `/search` | **Medium** — cold start adds 1-3s to first search |
| Opens and reads a text | Text Reading → Text Chunk Loading → CBETA API Proxy | Search result click or bookmark | **High** — cold start on first text load |
| Adjusts reading preferences | Preference Management (pure client) | Reader settings panel | **None** — client-side only |
| Switches between SC and TC | Language Toggle → Text Chunk Loading | Language toggle button | **None** — client-side only |
| Saves a bookmark | Bookmark Management (localStorage) | Bookmark button in reader | **None** — client-side only |
| Returns to a bookmark | Bookmark Management → Text Reading → Text Chunk Loading | Bookmark list | **High** — cold start if serverless fn hasn't run |
| Returns to the site later | Session & Persistence → Text Reading | Page load | **None** — client-side session restore |

### System Journeys
| What Happens Automatically | Underlying workflow(s) | Trigger | Cold Start Risk |
|---|---|---|---|
| Text chunks loaded on scroll | Text Chunk Loading → CBETA API Proxy | Scroll position threshold | **Low** — serverless fn likely warm after initial load |
| Search results cached | CBETA API Proxy → IndexedDB | First search for a query | N/A — cache is client-side |
| Bookmarks synced (v2.0) | Bookmark Management → Serverless DB | Bookmark CRUD | **Medium** — Supabase edge functions cold start |

---

## View 4: State Map

### Entity: Reading Session
| State | Entered By | Exited By | Workflows That Can Trigger Exit |
|---|---|---|---|
| idle | Page load, no active book | → loading | Book Search (selection), Bookmark Management (navigation) |
| loading | Book selected | → active, error, offline_cache | Text Reading, Text Chunk Loading |
| active | Text loaded and rendered | → loading (navigate), idle (close), error | Text Chunk Loading, Language Toggle, Preference Management |
| error | Any loading failure | → loading (retry), idle (abort) | Text Reading, Text Chunk Loading |
| offline_cache | Network failure with cached data | → active (retry), error | Text Chunk Loading |

### Entity: Bookmark (v1.0 — Client-Side)
| State | Entered By | Exited By | Workflows That Can Trigger Exit |
|---|---|---|---|
| pending_save | User clicks bookmark (optimistic) | → saved | Bookmark Management |
| saved | Bookmark persisted to IndexedDB | → deleted | Bookmark Management |
| deleted | User removes bookmark | (terminal) | Bookmark Management |

### Entity: Bookmark (v2.0 — Serverless DB Migration)
| State | Entered By | Exited By | Workflows That Can Trigger Exit |
|---|---|---|---|
| pending_save | User clicks bookmark | → syncing | Bookmark Management |
| syncing | Client → Serverless DB sync initiated | → synced, sync_failed | Bookmark Management |
| synced | Serverless DB confirms save | → deleted | Bookmark Management |
| sync_failed | Serverless DB write fails | → pending_save (retry) | Bookmark Management |
| deleted | User removes (client + server) | (terminal) | Bookmark Management |

### Entity: User Preferences
| State | Entered By | Exited By | Workflows That Can Trigger Exit |
|---|---|---|---|
| default | First visit, no stored prefs | → customized | Preference Management |
| customized | User changes any setting | → customized (further changes) | Preference Management |

---

## Cold Start Impact Matrix

| Workflow | Cold Start Affects? | Impact | Mitigation |
|---|---|---|---|
| Book Search | **Yes** | First search after idle period adds 1-3s cold start latency | Client-side search cache; Vercel Edge Cache for API route |
| Text Reading | **Yes** | First book open after idle adds 1-3s cold start | Pre-warm via ISR; client-side text cache for recently read books |
| Text Chunk Loading | **Yes** (first chunk only) | First fascicle fetch may hit cold start; subsequent chunks use warm fn | Client-side IndexedDB cache; prefetch adjacent fascicles |
| Preference Management | **No** | Pure client-side — no serverless involvement | N/A |
| Language Toggle | **No** | Pure client-side with opencc-js | N/A |
| Bookmark Management (v1.0) | **No** | Pure client-side (localStorage/IndexedDB) | N/A |
| Bookmark Management (v2.0) | **Yes** | Serverless DB write may add 1-2s cold start | Optimistic UI; background sync |
| Session & Persistence | **No** | Pure client-side | N/A |
| CBETA API Proxy | **Yes** | Every API call goes through serverless fn | Vercel Edge runtime for proxy; aggressive client-side caching |

---

## Open Questions
- **OQ-1**: Does the CBETA API require authentication? (API key not mentioned — needs verification)
- **OQ-2**: What is the CBETA API rate limit? (Not verified — proxy layer implements retry + backoff as protection)
- **OQ-3**: **RESOLVED**: Bookmarks are per-browser in v1.0 (localStorage/IndexedDB). Cross-device sync deferred to v2.0 with serverless DB.
- **OQ-4**: **RESOLVED**: Maximum text size is hundreds of thousands of characters — virtual scrolling + fascicle-level chunking mandatory.
- **OQ-5**: **RESOLVED**: SC conversion is client-side with opencc-js, lazy-loaded, paragraph-level conversion with memoization.
- **OQ-6**: What is the exact XML structure returned by CBETA API v3? (Must inspect actual response)
- **OQ-7**: **RESOLVED**: Reading preferences are client-side only (localStorage). No server sync in v1.0.
- **OQ-8**: **RESOLVED**: Search uses CBETA API directly via serverless proxy. No PostgreSQL FTS in v1.0 — metadata search done client-side against cached catalog.
- **OQ-9**: Which serverless DB should be used for v2.0 bookmark sync? (Supabase, Turso, or Cloudflare D1 — all have edge-compatible options)
- **OQ-10**: Should the CBETA proxy use Vercel Edge Runtime (faster cold start, 50ms CPU limit) or Node.js Runtime (slower cold start, full Node API)?

---

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial registry created | — |
| 2026-04-05 | Serverless architecture mandate — all workflows updated to v0.2 | Removed PostgreSQL/Redis from v1.0; added cold start analysis; updated all handoff contracts |
