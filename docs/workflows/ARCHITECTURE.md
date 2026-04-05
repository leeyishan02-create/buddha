# Buddhist Text Reader — Workflow Architecture (Serverless)
**Version**: 0.2 (Serverless)
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft

---

## System Overview

This document is the master index for the complete workflow architecture of a Buddhist text reading website that reads scriptures, treatises, and books from the CBETA API. The system supports searching, reading with customizable preferences, language conversion (Traditional ↔ Simplified Chinese), bookmarking, and session persistence.

**Target users**: Buddhist scholars and enthusiasts who regularly read Buddhist texts.

**Key constraint**: CBETA only provides Traditional Chinese text. Simplified Chinese requires client-side conversion.

**Serverless constraint**: The application is **fully serverless** — no persistent backend servers. API routes run as Vercel serverless functions with 10s timeout (free tier). All user data is client-side (localStorage/IndexedDB) in v1.0.

---

## ⚠️ Serverless Architecture Change Summary (v0.1 → v0.2)

| Aspect | v0.1 (Persistent Backend) | v0.2 (Serverless) |
|---|---|---|
| **Runtime** | Persistent Node.js process | Vercel serverless functions (cold starts) |
| **Timeout** | No hard limit | **10s** on Vercel free tier |
| **Cache** | Redis (Upstash) | **Removed** — Vercel Edge Cache + client-side IndexedDB |
| **Database** | Neon PostgreSQL | **Deferred to v2.0** — client-side IndexedDB in v1.0 |
| **Auth** | Better-Auth | **Deferred to v2.0** — anonymous in v1.0 |
| **Bookmarks** | PostgreSQL (per-user, cross-device) | **IndexedDB** (per-browser, v1.0) |
| **Cold starts** | N/A | **1-3s** on first request after idle |

---

## Workflow Index

| # | Workflow | File | Status | Version | Complexity | Cold Start? |
|---|---|---|---|---|---|---|
| 1 | Book Search | `WORKFLOW-book-search.md` | Draft | v0.2 | Medium | **Yes** (1-3s) |
| 2 | Text Reading | `WORKFLOW-text-reading.md` | Draft | v0.2 | High | **Yes** (1-3s) |
| 3 | Preference Management | `WORKFLOW-preference-management.md` | Draft | v0.2 | Low | No |
| 4 | Language Toggle | `WORKFLOW-language-toggle.md` | Draft | v0.2 | Medium | No |
| 5 | Bookmark Management | `WORKFLOW-bookmark-management.md` | Draft | v0.3 | High | No (v1.0) |
| 6 | Session & Persistence | `WORKFLOW-session-persistence.md` | Draft | v0.3 | Medium | No |
| 7 | Text Chunk Loading | `WORKFLOW-text-chunk-loading.md` | Draft | v0.2 | High | **Yes** (1-3s) |
| 8 | CBETA API Proxy | `WORKFLOW-cbeta-api-proxy.md` | Draft | v0.2 | High | **Yes** (1-3s) |

---

## Cross-Workflow Dependencies (Serverless)

```
                     ┌─────────────────┐
                     │  CBETA API      │
                     │  (External)     │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │ CBETA API Proxy │◄───── All workflows that touch CBETA
                     │  (Serverless)   │      Cold starts: 1-3s on first call
                     └────┬───┬───┬───┘
                          │   │   │
               ┌──────────┘   │   └──────────┐
               ▼              ▼              ▼
      ┌────────────┐  ┌────────────┐  ┌────────────┐
      │ Book Search│  │Text Reading│  │ Text Chunk │
      │  (WF-1)    │  │  (WF-2)    │  │  Loading   │
      └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
            │               │               │
            │  selects      │  opens        │  loads
            ▼               ▼               ▼
      ┌─────────────────────────────────────────────┐
      │           Reader UI (Active Reading)         │
      │  ┌───────────┐ ┌──────────┐ ┌────────────┐  │
      │  │Preference │ │ Language │ │  Bookmark  │  │
      │  │Management │ │  Toggle  │ │ Management │  │
      │  │  (WF-3)   │ │  (WF-4)  │ │   (WF-5)   │  │
      │  │  Client   │ │  Client  │ │  IndexedDB │  │
      │  │  only     │ │  only    │ │  (v1.0)    │  │
      │  └─────┬─────┘ └────┬─────┘ └─────┬──────┘  │
      │        │            │             │          │
      │        └────────────┼─────────────┘          │
      │                     │                        │
      │              ┌──────▼──────┐                 │
      │              │   Session   │                 │
      │              │ Persistence │                 │
      │              │   (WF-6)    │                 │
      │              │  Client     │                 │
      │              │  only       │                 │
      │              └─────────────┘                 │
      └─────────────────────────────────────────────┘
```

### Dependency Matrix (Serverless)

| Workflow | Depends On | Depended On By | Serverless Impact |
|---|---|---|---|
| WF-1: Book Search | CBETA API Proxy (serverless) | WF-2 (Text Reading) | Cold start on first search |
| WF-2: Text Reading | WF-1, CBETA API Proxy (serverless), WF-3 (prefs), WF-4 (language), WF-6 (session restore) | WF-4, WF-5, WF-6 | Cold start on first text load |
| WF-3: Preference Mgmt | — (standalone, client-side) | WF-2 (applies prefs), WF-6 (persists) | **No cold start** |
| WF-4: Language Toggle | WF-2 (text loaded) | WF-2 (re-renders) | **No cold start** |
| WF-5: Bookmark Mgmt | WF-2 (text loaded for position), WF-6 (persists) | WF-2 (navigates to bookmark) | **No cold start** (IndexedDB v1.0) |
| WF-6: Session & Persistence | WF-3 (prefs), WF-5 (bookmarks), WF-2 (reading position) | WF-2 (restores session) | **No cold start** |
| WF-7: Text Chunk Loading | CBETA API Proxy (serverless), WF-2 (metadata loaded) | WF-2 (ongoing reading) | Cold start on first fascicle |
| WF-8: CBETA API Proxy | CBETA API (external) | WF-1, WF-2, WF-7 | **Cold start: 1-3s** |

---

## Shared Data Contracts (Serverless)

### User Preferences (shared by WF-3, WF-4, WF-6)
```json
{
  "fontSize": "number — 12 to 48, default 18, unit: px",
  "fontFamily": "string — from allowed CSS font list, default 'Noto Serif SC'",
  "lineSpacing": "number — 1.0 to 3.0, default 1.8, unit: ratio",
  "language": "string — 'TC' or 'SC', default 'TC'",
  "updatedAt": "string — ISO 8601 timestamp"
}
```
**Storage**: `localStorage` key `buddha_reader_prefs`

### Bookmark (shared by WF-5, WF-6)
```json
{
  "id": "string — UUID",
  "workId": "string — CBETA work ID",
  "volume": "string — volume number",
  "lineRef": "string — CBETA line reference",
  "paragraphIndex": "number",
  "title": "string | null",
  "note": "string | null",
  "createdAt": "number — epoch ms",
  "syncStatus": "string — 'synced' (v1.0 always synced)"
}
```
**Storage**: IndexedDB `bookmarks` object store (v1.0)

### Reading Position (shared by WF-2, WF-5, WF-6)
```json
{
  "bookId": "string",
  "title": "string",
  "fascicleId": "string",
  "page": "number",
  "scrollY": "number",
  "characterOffset": "number",
  "timestamp": "number — epoch ms"
}
```
**Storage**: IndexedDB `reading-positions` object store (v1.0)

### Session State (WF-6)
```json
{
  "version": "number — schema version",
  "current_book": "ReadingPosition | null",
  "reading_position": "ReadingPosition | null",
  "language": "TC | SC",
  "preferences": "UserPreferences",
  "last_active": "string — ISO 8601",
  "unsaved_changes": "boolean"
}
```
**Storage**: `localStorage` key `buddha_reader_session`

---

## Storage Architecture (Serverless v1.0)

| Storage | Key / Store | Data | Max Size | TTL |
|---|---|---|---|---|
| localStorage | `buddha_reader_prefs` | User preferences | ~1KB | None (persistent) |
| localStorage | `buddha_reader_session` | Session state | ~10KB | 30 days |
| IndexedDB | `buddha-reader` / `bookmarks` | Bookmark collection | ~500KB (500 bookmarks) | None (persistent) |
| IndexedDB | `buddha-reader` / `reading-positions` | Per-book reading positions | ~100KB | 90 days |
| IndexedDB | `buddha-reader` / `text-cache` | Cached parsed text (JSON) | ~50MB (LRU, max 20 texts) | 7 days |
| IndexedDB | `buddha-cbeta-cache` / `responses` | CBETA API responses | ~50MB | 24h |
| Memory (TanStack Query) | Query cache | Recent API responses | ~10MB | 30 min (staleTime) |
| Vercel Edge Cache | Per-URL cache | Proxy responses | Unlimited | Per Cache-Control headers |

---

## Critical Failure Modes (Cross-Workflow, Serverless)

| Failure Mode | Affected Workflows | Recovery |
|---|---|---|
| CBETA API unreachable | WF-1, WF-2, WF-4, WF-7, WF-8 | Retry with backoff, show cached data if available, error state |
| Serverless function timeout (10s) | WF-1, WF-2, WF-7, WF-8 | Client-side retry (function likely warm on retry), then error |
| Cold start latency (1-3s) | WF-1, WF-2, WF-7, WF-8 | Skeleton UI, IndexedDB cache, Vercel Edge Cache |
| localStorage blocked | WF-3, WF-5, WF-6 | In-memory only, warning to user, no persistence |
| IndexedDB quota exceeded | WF-5, WF-6, WF-7 | LRU eviction, user warning, graceful degradation |
| SC conversion fails | WF-2, WF-4 | Fall back to TC text with warning |
| Text too large for browser | WF-2 | Chunk into smaller segments, virtual scroll |
| Session data corrupt | WF-6 | Clear corrupt data, start fresh |
| Concurrent tab writes | WF-3, WF-5, WF-6 | Last-write-wins with storage event listeners |
| Book removed from CBETA | WF-2, WF-5 | Error on load, offer to delete stale bookmarks |
| Browser data cleared by user | WF-5, WF-6 | All bookmarks/progress lost — recommend export/import |

---

## Next Steps

1. **CBETA API Inspection** — Before implementation, inspect the actual CBETA API to verify:
   - Search endpoint URL and parameters
   - Text content format (XML, HTML, plain text?)
   - Rate limits and authentication requirements
   - Fascicle-level vs. full-text endpoints

2. **Reality Checker Pass** — After initial implementation of each workflow, run Reality Checker against the code to verify spec matches reality.

3. **Security Review** — Review all data flows for:
   - XSS risk from CBETA text content (must sanitize before rendering)
   - localStorage data sensitivity (reading habits may be private)
   - API proxy security (prevent abuse of proxy endpoint — rate limiting, input validation)

4. **Performance Budget** — Define and measure:
   - Time to first text render: < 6s on 3G (includes cold start budget)
   - Time to first text render (warm): < 3s on 3G
   - SC conversion time: < 5s per 50K chars
   - Bookmark save time: < 200ms (IndexedDB, instant)
   - Session save time: < 200ms (IndexedDB, instant)

---

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial architecture created — greenfield project | — |
| 2026-04-05 | Serverless architecture mandate — all workflows updated to v0.2+ | Removed PostgreSQL/Redis from v1.0; added cold start analysis to all serverless workflows; updated storage architecture; updated dependency matrix |
