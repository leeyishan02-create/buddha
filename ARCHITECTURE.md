# Architecture Document: Buddhist Text Reading Website (Buddha Reader) — SERVERLESS

**Version**: 2.0 (Serverless)
**Date**: 2026-04-05
**Status**: Proposed
**Author**: Workflow Architect (Serverless Revision)

---

## 1. Executive Summary

This document revises the original architecture (v1.0) for **fully serverless deployment**. The application has **no persistent backend servers**. All API routes execute as serverless functions on Vercel. Data storage is **pure client-side** (localStorage + IndexedDB) for v1.0, with a defined migration path to a serverless database (Turso/D1) for v2.0 when cross-device sync becomes necessary.

### Core Serverless Constraints
- **No persistent processes** — every request spins up a fresh execution environment
- **Cold starts** — first request after incurring idle period incurs 1-3s latency (Vercel Node.js runtime)
- **10s hard timeout** — Vercel free tier kills any serverless function exceeding 10s
- **No Redis/Upstash** — serverless Redis adds 50-200ms latency per call and cold starts of its own; removed from v1.0
- **No PostgreSQL connection pooling** — Neon serverless Postgres has cold starts; deferred to v2.0
- **No auth server** — authentication deferred to v2.0; v1.0 is anonymous, per-browser

### What Changes from v1.0
| Component | v1.0 (Persistent) | v2.0 (Serverless) |
|---|---|---|
| API Routes | Node.js server (always warm) | Vercel serverless functions (cold starts) |
| Redis Cache | Upstash Redis (persistent) | **Removed** — replaced with Vercel KV (edge cache) + client-side IndexedDB |
| Database | Neon Postgres (persistent connections) | **Deferred to v2.0** — v1.0 uses localStorage + IndexedDB |
| Auth | Better-Auth (server-side sessions) | **Deferred to v2.0** — v1.0 is anonymous |
| CBETA Proxy | Persistent proxy with Redis cache | Serverless function with Vercel edge cache |
| Bookmarks | PostgreSQL (per-user, cross-device) | **IndexedDB** (per-browser, v1.0) |
| Reading Progress | PostgreSQL | **IndexedDB** (per-browser, v1.0) |

---

## 2. Architecture Decision Records (Serverless)

### ADR-S001: Pure Client-Side Storage for v1.0

**Status**: Accepted

**Context**: Serverless databases (Neon, Turso, D1) introduce cold starts (1-3s) and connection overhead. For v1.0, the priority is fast reading experience, not cross-device sync.

**Decision**: All user data (bookmarks, reading progress, preferences) stored in browser storage (localStorage for small data, IndexedDB for larger data). No server-side database in v1.0.

**Consequences**:
- ✅ Zero database cold starts — instant reads
- ✅ Zero server-side state — simpler deployment, lower cost
- ✅ Works offline after initial text load
- ❌ No cross-device sync — bookmarks are per-browser
- ❌ Data loss if user clears browser data
- ❌ No multi-user support — no auth

**Migration Path to v2.0**: When cross-device sync is needed, add Turso/D1 (edge-compatible SQLite) with a sync layer that merges client-side data with server-side data.

### ADR-S002: Vercel Serverless Functions for CBETA Proxy

**Status**: Accepted

**Context**: CBETA API cannot be called directly from the browser due to CORS restrictions and the Referer header requirement. A proxy is mandatory.

**Decision**: Use Next.js API Routes deployed as Vercel serverless functions. The proxy function:
- Validates request parameters
- Calls CBETA API with Referer header
- Transforms response (XML → JSON)
- Returns to client

**No server-side caching** in v1.0. Caching is handled by:
1. **Vercel Edge Cache** (HTTP Cache-Control headers on proxy responses)
2. **TanStack Query** (client-side cache with stale-while-revalidate)
3. **IndexedDB** (client-side persistent cache for text content)

**Consequences**:
- ✅ No Redis dependency — simpler architecture
- ✅ Vercel edge cache is free and global
- ❌ Every cache miss hits CBETA directly (no server-side cache)
- ❌ Cold start on first proxy call after idle (1-3s)
- ⚠️ 10s timeout means CBETA calls must complete within ~7s (leaving 3s for cold start + transformation)

### ADR-S003: No Authentication in v1.0

**Status**: Accepted

**Context**: Authentication requires server-side session management or JWT verification, both of which add complexity and cold start latency. v1.0 targets individual readers who use a single browser.

**Decision**: No authentication in v1.0. All data is per-browser. Bookmarks and reading progress are stored locally.

**Consequences**:
- ✅ Zero auth overhead — no cold start from auth middleware
- ✅ Simpler security model — no session tokens to manage
- ❌ No cross-device sync
- ❌ No multi-user support
- ❌ Data lost if browser data is cleared

### ADR-S004: Client-Side Text Caching in IndexedDB

**Status**: Accepted

**Context**: Without server-side Redis, we need a robust client-side caching strategy to avoid re-fetching texts from CBETA on every visit.

**Decision**: Use IndexedDB to cache parsed text content (JSON, not raw XML) with TTL-based expiry. Cache key: `{workId}:{volume}`. TTL: 7 days (texts rarely change).

**Consequences**:
- ✅ Texts load instantly on return visits (no network needed)
- ✅ Works offline for previously-read texts
- ❌ IndexedDB has storage limits (~50MB-2GB depending on browser)
- ❌ Cache eviction logic needed (LRU, max 20 texts)

### ADR-S005: Vercel Edge Cache for Proxy Responses

**Status**: Accepted

**Context**: Serverless functions have no persistent memory. Each invocation is stateless. We need a caching layer that survives across invocations.

**Decision**: Use Vercel's built-in edge cache (Data Cache / ISR) for proxy responses. Set `Cache-Control: public, max-age=3600` for catalog/search, `max-age=86400` for text content. Vercel caches these at the edge globally.

**Consequences**:
- ✅ No cold start for cached responses — Vercel serves from edge cache
- ✅ Global distribution — fast worldwide
- ❌ Cache is per-route — different query params = different cache entries
- ❌ Cache invalidation requires revalidation headers or manual purge

---

## 3. Serverless Tech Stack

### Frontend (unchanged from v1.0)
| Layer | Technology | Justification |
|---|---|---|
| Framework | Next.js 15 (App Router) | Serverless-compatible, Vercel-native |
| Language | TypeScript | Type safety |
| State Management | Zustand | Lightweight, no server dependency |
| Styling | Tailwind CSS + CSS Variables | Utility-first |
| Chinese Conversion | opencc-js | Client-side, zero server cost |
| XML Parsing | fast-xml-parser | Fast XML → JSON in browser |
| Virtualization | @tanstack/react-virtual | Efficient rendering |
| HTTP Client | TanStack Query | Caching, retries, SWR |

### Backend (Serverless)
| Layer | Technology | Justification |
|---|---|---|
| Runtime | Vercel Serverless Functions (Node.js 22) | Native Next.js integration |
| Edge Cache | Vercel Data Cache | Replaces Redis for proxy caching |
| Client Storage | localStorage + IndexedDB | Replaces PostgreSQL for v1.0 |
| Monitoring | Sentry + Vercel Analytics | Error tracking, performance |

### Infrastructure
| Layer | Technology | Justification |
|---|---|---|
| Hosting | Vercel (Free tier) | Serverless, edge network, zero-config |
| CDN | Vercel Edge Network | Global content delivery |
| **Removed**: Database | ~~Neon Postgres~~ | Deferred to v2.0 |
| **Removed**: Cache | ~~Upstash Redis~~ | Replaced by Vercel edge cache + IndexedDB |
| **Removed**: Auth | ~~Better-Auth~~ | Deferred to v2.0 |

---

## 4. Cold Start Impact Analysis

### What Causes Cold Starts
| Trigger | Expected Latency | Affected Workflow |
|---|---|---|
| First API call after deployment | 2-5s | All workflows |
| First API call after 5+ minutes idle | 1-3s | All workflows |
| Vercel function scaling (new region) | 1-2s | All workflows |
| Client-side: opencc-js lazy load | 200-500ms | Language Toggle, Text Reading |
| Client-side: IndexedDB open | 10-50ms | Bookmark, Session, Text Chunk Loading |

### Mitigation Strategies
| Strategy | Where Applied | Effect |
|---|---|---|
| Vercel Edge Cache (Cache-Control headers) | CBETA proxy responses | Eliminates cold start for cached responses |
| TanStack Query stale-while-revalidate | Client-side data fetching | Shows stale data immediately while revalidating |
| IndexedDB text cache | Client-side text storage | Eliminates network call for previously-read texts |
| Preconnect to CBETA API | App initialization | Reduces DNS + TLS overhead by ~200ms |
| Lazy-load opencc-js | After first text render | Avoids blocking initial page load |
| Skeleton UI during cold start | All API-dependent views | User sees loading state, not blank screen |

### Cold Start Budget Per Workflow
| Workflow | Cold Start Impact | User-Visible Effect |
|---|---|---|
| Book Search | 1-3s on first search | Loading skeleton for 1-3s, then results |
| Text Reading | 1-3s on first text load | Loading skeleton for 1-3s, then text |
| Text Chunk Loading | 1-3s on first fascicle (cold), instant on cached | Skeleton for unfascicles, instant for cached |
| Bookmark Management | None (pure client-side) | Instant |
| Preference Management | None (pure client-side) | Instant |
| Language Toggle | None (pure client-side) | Instant (except opencc-js lazy load) |
| Session Persistence | None (pure client-side) | Instant |

---

## 5. Serverless Timeout Strategy

### The 10s Hard Limit
Vercel free tier kills any serverless function at 10s. This is non-negotiable.

### Timeout Budget for CBETA Proxy
```
Total serverless function budget: 10,000ms
├─ Cold start (worst case):        3,000ms
├─ Request parsing/validation:       100ms
├─ CBETA API call:                  5,000ms  ← must complete within this
├─ Response transformation:          500ms
├─ Response serialization:           100ms
└─ Safety margin:                  1,300ms
```

### Retry Strategy for Serverless Timeouts
Since serverless functions cannot retry themselves (they die at 10s), **retries happen client-side**:

```
Client calls /api/cbeta/work/T0235/001
  │
  ├─ Response within 10s → success
  │
  └─ No response at 10s → Vercel kills function → client receives 504
       │
       ├─ Retry #1 (after 1s backoff) → may hit warm function → success
       │
       └─ Retry #1 also fails → Retry #2 (after 3s backoff)
            │
            ├─ Success → deliver to user
            │
            └─ Still fails → show error with "CBETA is slow, try again"
```

### Client-Side Timeout Configuration
| API Call | Client Timeout | Retry Count | Backoff |
|---|---|---|---|
| Search | 12s | 1 | 1s |
| Metadata | 12s | 1 | 1s |
| Text (fascicle) | 17s | 1 | 2s |
| Catalog | 12s | 1 | 1s |

The client timeout is longer than the serverless timeout (10s) to account for Vercel's 504 response time.

---

## 6. Data Storage Strategy

### v1.0: Pure Client-Side

| Storage | Key / Store | Data | Max Size | TTL |
|---|---|---|---|---|
| localStorage | `buddha_reader_prefs` | User preferences | ~1KB | None |
| localStorage | `buddha_reader_session` | Session state (last book, UI state) | ~10KB | 30 days |
| IndexedDB | `buddha-reader` / `bookmarks` | Bookmark collection | ~500KB (500 bookmarks) | None |
| IndexedDB | `buddha-reader` / `reading-positions` | Per-book reading positions | ~100KB | 90 days |
| IndexedDB | `buddha-reader` / `text-cache` | Cached parsed text (JSON) | ~50MB (LRU, max 20 texts) | 7 days |
| Memory (TanStack Query) | Query cache | Recent API responses | ~10MB | 30 min (staleTime) |

### v2.0 Migration Path: Serverless DB (Turso/D1)

When cross-device sync is needed:

```
v1.0 (Client-only)                    v2.0 (Client + Serverless DB)
─────────────────                    ─────────────────────────────────
localStorage prefs        ───────►   Serverless DB: user_preferences
IndexedDB bookmarks       ───────►   Serverless DB: bookmarks (sync)
IndexedDB reading pos     ───────►   Serverless DB: reading_progress (sync)
IndexedDB text cache      ───────►   Keep client-side (text is large)
No auth                   ───────►   Add auth (Clerk / Better-Auth edge)
```

**Why Turso/D1 over Neon Postgres for v2.0**:
- Turso (libSQL) and Cloudflare D1 are **edge-compatible** — no cold start from connection pooling
- Neon Postgres requires TCP connections — slower cold starts in serverless
- SQLite-based edge databases are designed for serverless from the ground up

---

## 7. System Architecture (Serverless)

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Browser)                          │
│   ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│   │  Catalog     │  │  Text Reader │  │  Settings Panel     │   │
│   │  (Search,    │  │  (Sutra      │  │  (Font, Size,       │   │
│   │   Browse)    │  │   Display)   │  │   Language, Theme)  │   │
│   └──────┬──────┘  └──────┬───────┘  └──────────┬──────────┘   │
│          │                │                      │              │
│          └────────────────┼──────────────────────┘              │
│                           ▼                                     │
│              ┌────────────────────────┐                         │
│              │   Next.js App Shell    │                         │
│              │   (Client + Server     │                         │
│              │    Components)         │                         │
│              └────────┬───────────────┘                         │
│                       │                                         │
│    ┌──────────────────┼──────────────────┐                     │
│    │  Client-Side Storage (v1.0)         │                     │
│    │  ┌────────────┐  ┌───────────────┐  │                     │
│    │  │localStorage│  │  IndexedDB    │  │                     │
│    │  │ - prefs    │  │ - bookmarks   │  │                     │
│    │  │ - session  │  │ - positions   │  │                     │
│    │  │            │  │ - text cache  │  │                     │
│    │  └────────────┘  └───────────────┘  │                     │
│    └─────────────────────────────────────┘                     │
└───────────────────────┼─────────────────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Vercel Serverless│    │  CBETA API       │
│  Functions        │    │  (External)      │
│                  │    │                  │
│  /api/search     │───►│  - Catalog       │
│  /api/cbeta/     │───►│  - Search        │
│   [...path]      │    │  - Text          │
│                  │    │  - Metadata      │
└──────────────────┘    └──────────────────┘
        │
        ▼
┌──────────────────┐
│  Vercel Edge     │
│  Cache (Data     │
│  Cache / ISR)    │
│                  │
│  Cached proxy    │
│  responses       │
└──────────────────┘
```

---

## 8. Project Structure (Serverless)

```
buddha-reader/
├── app/                          # Next.js App Router
│   ├── (marketing)/              # Marketing pages (static/SSG)
│   │   ├── page.tsx              # Homepage
│   │   └── layout.tsx
│   │
│   ├── (reader)/                 # Reading experience
│   │   ├── catalog/
│   │   │   └── page.tsx          # Browse canons and works
│   │   ├── search/
│   │   │   └── page.tsx          # Search results
│   │   ├── read/
│   │   │   └── [workId]/
│   │   │       └── [volume]/
│   │   │           └── page.tsx  # Sutra reader
│   │   └── layout.tsx
│   │
│   ├── api/                      # Serverless API Routes
│   │   ├── cbeta/
│   │   │   └── [...path]/
│   │   │       └── route.ts      # CBETA proxy (serverless)
│   │   └── search/
│   │       └── route.ts          # Search proxy (serverless)
│   │
│   ├── layout.tsx
│   └── loading.tsx
│
├── components/                   # React Components (unchanged)
│   ├── reader/
│   ├── catalog/
│   ├── search/
│   ├── settings/
│   ├── bookmarks/
│   └── ui/
│
├── lib/                          # Business Logic
│   ├── cbeta/
│   │   ├── client.ts             # CBETA API client (used in serverless)
│   │   ├── parser.ts             # XML response parser
│   │   └── types.ts              # CBETA type definitions
│   ├── conversion/
│   │   └── opencc.ts             # Chinese conversion (client-side)
│   └── search/
│       └── types.ts
│
├── stores/                       # Zustand Stores (client-side)
│   ├── reader-store.ts
│   ├── settings-store.ts
│   └── bookmark-store.ts
│
├── db/                           # Client-Side Storage (v1.0)
│   └── client/
│       ├── indexeddb.ts          # IndexedDB wrapper (bookmarks, positions, text cache)
│       ├── local-storage.ts      # localStorage wrapper (prefs, session)
│       └── types.ts              # Storage type definitions
│
├── config/
│   └── cache.ts                  # Cache TTL and eviction config
│
├── vercel.json                   # Vercel configuration (timeouts, headers)
└── next.config.ts                # Next.js config
```

**Key differences from v1.0**:
- ❌ No `db/schema/` — no PostgreSQL schema in v1.0
- ❌ No `db/migrations/` — no migrations in v1.0
- ❌ No `lib/bookmarks/service.ts` — bookmarks are client-side
- ❌ No `lib/cbeta/cache.ts` — no Redis cache
- ❌ No `app/api/bookmarks/` — no server-side bookmark API
- ❌ No `app/api/auth/` — no auth in v1.0
- ❌ No `app/api/progress/` — no server-side progress API
- ✅ Added `db/client/` — client-side storage layer
- ✅ Simplified `app/api/` — only CBETA proxy and search

---

## 9. Implementation Order (Serverless)

### Phase 1: Foundation (Week 1-2)
1. **Next.js project setup** with App Router
2. **Client-side storage layer** (`db/client/`) — IndexedDB + localStorage wrappers
3. **Preference Management** (pure client-side, no server)
4. **Session Persistence** (pure client-side, no server)

### Phase 2: CBETA Integration (Week 2-3)
5. **CBETA API Proxy** (serverless function) — with Vercel edge cache headers
6. **Book Search** — serverless proxy to CBETA search endpoint
7. **Text Chunk Loading** — fascicle-level fetching with IndexedDB cache

### Phase 3: Reading Experience (Week 3-4)
8. **Text Reading** — full reader with virtual scrolling, preferences applied
9. **Language Toggle** — client-side opencc-js conversion
10. **Bookmark Management** — IndexedDB storage (per-browser)

### Phase 4: Polish (Week 4-5)
11. **Error handling** — graceful degradation for all failure modes
12. **Performance optimization** — cold start mitigation, caching tuning
13. **Offline support** — IndexedDB text cache enables offline reading
14. **Testing** — all workflows tested against serverless constraints

---

## 10. Serverless-Specific Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| CBETA API > 10s response | Medium | High — function killed, user sees 504 | Client-side retry with backoff; show cached data if available |
| Cold start on first search | High | Medium — 1-3s delay | Skeleton UI, preconnect hints, Vercel edge cache |
| IndexedDB quota exceeded | Low | Medium — cannot cache more texts | LRU eviction, max 20 texts, user warning |
| Vercel edge cache miss during traffic spike | Medium | Low — falls through to CBETA directly | CBETA rate limiting handled by retry logic |
| Browser storage cleared by user | Medium | High — all bookmarks/progress lost | Warning in settings, export/import feature |
| opencc-js bundle size impacts initial load | Medium | Low — lazy-loaded after first render | Code splitting, dynamic import |
| CBETA CORS blocks direct browser calls | High | Critical — proxy is mandatory | Proxy is implemented; no direct browser calls |

---

## 11. Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial architecture created (v1.0 with persistent servers) | — |
| 2026-04-05 | Serverless revision — all workflows redesigned for serverless constraints | This document |
