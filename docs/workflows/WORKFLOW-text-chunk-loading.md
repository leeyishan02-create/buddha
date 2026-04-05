# WORKFLOW: Text Chunk Loading (Serverless)
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft (v0.2 — Serverless)
**Implements**: Pagination/scroll-based loading of large Buddhist texts via fascicle-level fetching through serverless proxy

---

## ⚠️ Serverless Changes from v0.1

| Aspect | v0.1 (Persistent Backend) | v0.2 (Serverless) |
|---|---|---|
| **Server-side cache** | Redis (Upstash) — persistent across invocations | **Removed** — replaced with client-side IndexedDB + Vercel Edge Cache |
| **Cold start** | N/A (persistent server) | **1-3s cold start** on first fascicle fetch after idle |
| **Proxy timeout** | No hard limit | **10s Vercel limit** — CBETA timeout reduced to 8s |
| **Client timeout** | 15s | **17s** (accounts for 3s cold start + 8s CBETA + 2s transform + 4s buffer) |
| **Cache stampede** | Server-side single-flight locks | Not feasible (stateless) — rely on Vercel Edge Cache + TanStack Query dedup |
| **Prefetch** | Always available (server always running) | May trigger cold start if serverless fn hasn't run recently |

---

## Overview

Buddhist texts from CBETA can be enormous (hundreds of fascicles, millions of characters). This workflow manages the on-demand loading of text chunks (fascicles/volumes) as the user reads. It handles initial chunk loading, scroll-triggered prefetching of adjacent chunks, chunk caching via **IndexedDB** (replacing Redis), and graceful degradation when chunks fail to load. The workflow delegates to the **serverless CBETA API Proxy** (see WORKFLOW-cbeta-api-proxy.md) for actual data fetching.

## Actors

| Actor | Role in this workflow |
|---|---|
| Reader (user) | Scrolls through text, navigates between fascicles |
| Text Chunk Loader | Orchestrates chunk fetching, caching, and delivery |
| Virtual Scroller (@tanstack/react-virtual) | Determines which chunks are in/near viewport |
| Serverless CBETA API Proxy | Fetches fascicle text from CBETA API (stateless, cold starts) |
| Vercel Edge Cache | HTTP-level caching for proxy responses (replaces Redis) |
| CBETA API | External source of Buddhist text content |
| IndexedDB (Client) | Client-side cache for fascicle text (TTL 24h, replaces Redis) |
| TanStack Query (client cache) | Client-side cache with stale-while-revalidate |
| Reader UI Component | Displays loaded chunks, shows loading placeholders |

## Prerequisites

- Book metadata is loaded (fascicle list with IDs and titles)
- Serverless CBETA API Proxy is deployed on Vercel
- CBETA API is reachable from Vercel serverless environment
- At least one fascicle is already loaded (the initial one from Text Reading workflow)
- Virtual scroller is initialized with total item count
- Client has IndexedDB available

## ⚠️ Cold Start Impact

**First fascicle fetch after idle**: Adds 1-3s cold start latency before the request even reaches CBETA.

**Subsequent fascicle fetches (within ~60s)**: Serverless function is warm, no cold start penalty.

**Mitigation**:
1. **IndexedDB cache**: Previously-read fascicles are served from IndexedDB — **zero cold start, zero network**.
2. **Vercel Edge Cache**: Fascicle responses have `Cache-Control: public, max-age=86400` — subsequent identical requests hit the edge cache — **zero cold start**.
3. **Prefetch adjacent fascicles**: When the user is reading fascicle 1, fascicle 2 is prefetched in the background — by the time the user scrolls to it, the serverless function is already warm.
4. **TanStack Query deduplication**: If multiple components request the same fascicle simultaneously, TanStack Query deduplicates to a single network request.

## Trigger

- **Initial**: First fascicle loaded by Text Reading workflow (STEP 4)
- **Scroll-based**: User scrolls within 2 fascicles of the last loaded chunk boundary
- **Navigation-based**: User clicks a fascicle in the table of contents
- **Prefetch**: Browser idle time, prefetch adjacent fascicles

## Workflow Tree

### === SUB-WORKFLOW: Initial Chunk Load ===

### STEP I1: Determine Initial Fascicle
**Actor**: Text Chunk Loader
**Action**: Determine which fascicle to load first (from URL params, saved position, or default to fascicle 1)
**Timeout**: 50ms
**Input**: `{ bookId: string, initialPosition?: { fascicleId: string }, savedPosition?: { fascicleId: string } }`
**Output on SUCCESS**: `{ targetFascicleId: string, reason: "url" | "saved" | "default" }` -> GO TO STEP I2
**Output on FAILURE**:
  - `FAILURE(no_fascicle_list)`: Book metadata not loaded, no fascicle list available -> [recovery: wait for metadata to load, retry in 500ms, max 3 attempts -> if still fails, GO TO ERROR_NO_METADATA]
  - `FAILURE(invalid_fascicle_id)`: Requested fascicle ID not in fascicle list -> [recovery: fall back to first fascicle, log warning, GO TO STEP I2]

**Observable states during this step**:
  - Customer sees: Loading state for the text area
  - Operator sees: N/A
  - Database: No changes
  - Logs: `[chunk-loader] determining initial fascicle bookId="T0235" reason="saved" fascicle="001"`

### STEP I2: Check IndexedDB Cache (Primary) → TanStack Query (Secondary)
**Actor**: Text Chunk Loader
**Action**: Check if the requested fascicle text is already in IndexedDB (persistent client cache), then TanStack Query (session cache)
**Timeout**: 100ms
**Input**: `{ bookId: string, fascicleId: string }`
**Output on SUCCESS (IndexedDB hit, fresh < 24h)**: `{ text: string, fromCache: true, source: "indexeddb", fresh: true }` -> GO TO STEP I5
**Output on SUCCESS (IndexedDB hit, stale > 24h)**: `{ text: string, fromCache: true, source: "indexeddb", fresh: false }` -> GO TO STEP I3 (revalidate in background) AND GO TO STEP I5 (show cached immediately)
**Output on SUCCESS (TanStack Query hit, fresh)**: `{ text: string, fromCache: true, source: "tanstack", fresh: true }` -> GO TO STEP I5
**Output on SUCCESS (TanStack Query hit, stale)**: `{ text: string, fromCache: true, source: "tanstack", fresh: false }` -> GO TO STEP I3 (revalidate in background) AND GO TO STEP I5 (show cached immediately)
**Output on SUCCESS (cache miss)**: `{ bookId, fascicleId }` -> GO TO STEP I3

**⚠️ TIMING ASSUMPTION**: IndexedDB read is ~10-50ms. TanStack Query check is ~5ms. Combined cache check adds < 100ms but can eliminate a 3-11s cold start + network round-trip.

### STEP I3: Request from Serverless CBETA API Proxy
**Actor**: Text Chunk Loader → Serverless CBETA API Proxy
**Action**: Send request to serverless proxy for fascicle text
**Timeout**: 17s (client-side — accounts for 3s cold start + 8s CBETA + 2s transform + 4s buffer)
**Input**: `{ bookId: string, fascicleId: string }`
**Output on SUCCESS**: `{ text: string, fascicleId: string, charCount: number, lineRefs: string[] }` -> GO TO STEP I4
**Output on FAILURE**:
  - `FAILURE(proxy_timeout)`: Proxy does not respond within 17s -> [recovery: retry x1 with 20s timeout (function likely warm on retry) -> if still fails, GO TO ERROR_CHUNK_LOAD_FAILED]
  - `FAILURE(proxy_5xx)`: Proxy returns 5xx -> [recovery: retry x1 with 3s backoff -> if still fails, GO TO ERROR_CHUNK_LOAD_FAILED]
  - `FAILURE(proxy_404)`: Fascicle not found at CBETA -> [recovery: mark fascicle as unavailable, show placeholder, GO TO STEP I5 with empty text]
  - `FAILURE(network_unreachable)`: Cannot reach proxy -> [recovery: check if stale cache exists in IndexedDB -> if yes, show stale data with "offline" banner; if no, GO TO ERROR_CHUNK_LOAD_FAILED]
  - `FAILURE(vercel_timeout)`: Vercel kills function at 10s -> [recovery: client receives 504 after 17s total -> retry x1 (function likely warm) -> if still fails, GO TO ERROR_CHUNK_LOAD_FAILED]

**Observable states during this step**:
  - Customer sees: Loading skeleton for this fascicle's content area (may take 3-11s on cold start)
  - Operator sees: N/A
  - Database: No changes
  - Logs: `[chunk-loader] requesting fascicle bookId="T0235" fascicle="001" timeout=17s coldStart=unknown`

### STEP I4: Parse and Structure Text
**Actor**: Text Chunk Loader
**Action**: Parse the CBETA response (XML/JSON) into structured paragraphs with line references
**Timeout**: 2s
**Input**: Raw CBETA response (may be XML P5 format)
**Output on SUCCESS**: `{ paragraphs: [{ id: string, content: string, lineRef: string }], fascicleId: string, charCount: number }` -> GO TO STEP I5
**Output on FAILURE**:
  - `FAILURE(parse_error)`: Response cannot be parsed -> [recovery: log full response, attempt to render as raw text, GO TO STEP I5 with warning flag]
  - `FAILURE(empty_response)`: Response has no text content -> [recovery: show "This fascicle has no text content.", GO TO STEP I5 with empty paragraphs]

**Observable states during this step**:
  - Customer sees: Still loading
  - Logs: `[chunk-loader] parsed fascicle="001" paragraphs=142 chars=8500`

### STEP I5: Store in IndexedDB Cache & Deliver to Virtual Scroller
**Actor**: Text Chunk Loader
**Action**: Store parsed fascicle in IndexedDB (for future sessions), then pass to virtual scroller
**Timeout**: 200ms (IndexedDB write) + 200ms (scroller delivery)
**Input**: `{ paragraphs: array, fascicleId: string, bookId: string }`
**Output on SUCCESS**: Paragraphs cached in IndexedDB and registered with virtual scroller -> GO TO STEP I6
**Output on FAILURE**:
  - `FAILURE(scroller_not_ready)`: Virtual scroller not initialized -> [recovery: queue paragraphs, deliver when scroller is ready]
  - `FAILURE(indexeddb_write_error)`: Cannot write to IndexedDB -> [recovery: log warning, continue with scroller delivery (cache miss is not fatal)]

**Observable states during this step**:
  - Customer sees: Text appears in the reader viewport
  - Logs: `[chunk-loader] cached fascicle="001" in IndexedDB, delivered 142 paragraphs to scroller`

### STEP I6: Update Virtual Scroller Item Count
**Actor**: Virtual Scroller
**Action**: Update the total item count to include the newly loaded fascicle's paragraphs
**Timeout**: 50ms
**Input**: `{ newTotalItems: number }`
**Output on SUCCESS**: Scroller updated, scroll range adjusted
**Output on FAILURE**: None

**Observable states during this step**:
  - Customer sees: Scrollbar adjusts to reflect new content length
  - Logs: `[scroller] updated totalItems=142`

---

### === SUB-WORKFLOW: Scroll-Triggered Prefetch ===

### STEP P1: Detect Scroll Proximity
**Actor**: Virtual Scroller
**Action**: Monitor scroll position; detect when user is within 2 fascicles of the last loaded chunk boundary
**Timeout**: N/A (event-driven)
**Input**: Scroll events, current viewport position, loaded chunk boundaries
**Output on SUCCESS**: `{ direction: "forward" | "backward", nextFascicleId: string }` -> GO TO STEP P2
**Output on FAILURE**:
  - `FAILURE(no_next_fascicle)`: User is at the last fascicle -> [recovery: no action needed, end of text]
  - `FAILURE(no_prev_fascicle)`: User is at the first fascicle -> [recovery: no action needed]

**Observable states during this step**:
  - Customer sees: N/A (background operation)
  - Logs: `[scroller] proximity detected direction="forward" nextFascicle="002"`

### STEP P2: Check if Next Chunk is Already Loaded or Cached
**Actor**: Text Chunk Loader
**Action**: Check if the next fascicle is in TanStack Query (session cache) or IndexedDB (persistent cache)
**Timeout**: 50ms
**Input**: `{ fascicleId: string }`
**Output on SUCCESS (already loaded or cached)**: `{ loaded: true, source: "tanstack" | "indexeddb" }` -> No action needed (or revalidate in background if stale)
**Output on SUCCESS (not loaded)**: `{ loaded: false }` -> GO TO STEP P3

### STEP P3: Prefetch Next Chunk (Background)
**Actor**: Text Chunk Loader
**Action**: Fetch the next fascicle in the background (lower priority than user-visible content)
**Timeout**: 17s (non-blocking — does not block user interaction)
**Input**: `{ bookId: string, fascicleId: string, priority: "low" }`
**Output on SUCCESS**: `{ text: string, paragraphs: array }` -> GO TO STEP P4
**Output on FAILURE**:
  - `FAILURE(prefetch_failed)`: Prefetch fails -> [recovery: log warning, will retry when user actually scrolls to this fascicle, no user-facing error]

**⚠️ COLD START NOTE**: Prefetch requests may trigger a cold start if the serverless function hasn't been invoked recently. Since prefetch is low-priority and non-blocking, the cold start latency is acceptable — the user won't notice it.

**Observable states during this step**:
  - Customer sees: N/A (background operation, no loading indicator)
  - Logs: `[chunk-loader] prefetching fascicle="002" priority=low`

### STEP P4: Cache Prefetched Chunk in IndexedDB + TanStack Query
**Actor**: Text Chunk Loader
**Action**: Store prefetched text in both IndexedDB (persistent) and TanStack Query (session) for instant access when user scrolls to it
**Timeout**: 200ms
**Input**: `{ fascicleId: string, bookId: string, paragraphs: array }`
**Output on SUCCESS**: `{ cached: true, sources: ["indexeddb", "tanstack"] }` -> WORKFLOW COMPLETE (prefetch)
**Output on FAILURE**:
  - `FAILURE(cache_full)`: IndexedDB quota approaching limit -> [recovery: evict least-recently-used fascicle from IndexedDB, retry once]

---

### === SUB-WORKFLOW: Fascicle Navigation (TOC Click) ===

### STEP N1: User Selects Fascicle from TOC
**Actor**: Reader (user) → Volume Navigation Component
**Action**: User clicks a fascicle in the table of contents sidebar
**Timeout**: N/A (user-driven)
**Input**: `{ fascicleId: string, fascicleTitle: string }`
**Output on SUCCESS**: `{ targetFascicleId: string }` -> GO TO STEP N2
**Output on FAILURE**: None

### STEP N2: Cancel In-Flight Requests (if any)
**Actor**: Text Chunk Loader
**Action**: Abort any pending chunk fetches that are no longer needed
**Timeout**: 50ms
**Input**: `{ pendingRequestIds: string[] }`
**Output on SUCCESS**: `{ cancelled: number }` -> GO TO STEP N3
**Output on FAILURE**: None

**Observable states during this step**:
  - Customer sees: N/A
  - Logs: `[chunk-loader] cancelled 1 in-flight request(s)`

### STEP N3: Load Target Fascicle
**Actor**: Text Chunk Loader
**Action**: Same as STEP I2-I5 but for the navigation target
**Timeout**: 17s (client-side)
**Input**: `{ bookId: string, fascicleId: string }`
**Output on SUCCESS**: Fascicle loaded and rendered -> GO TO STEP N4
**Output on FAILURE**: Same failure modes as STEP I3

### STEP N4: Scroll to Top of Fascicle
**Actor**: Reader UI Component
**Action**: Scroll viewport to the beginning of the newly loaded fascicle
**Timeout**: 200ms
**Input**: `{ fascicleId: string }`
**Output on SUCCESS**: Viewport at top of fascicle -> WORKFLOW COMPLETE (navigate)
**Output on FAILURE**: None

**Observable states during this step**:
  - Customer sees: Text scrolls to top of selected fascicle
  - Logs: `[reader] scrolled to top of fascicle="003"`

---

### ERROR_CHUNK_LOAD_FAILED
**Triggered by**: STEP I3 or STEP P3 failures after retries exhausted
**Actions**:
  1. Show inline error placeholder at the fascicle position: "Unable to load this section. Please try again."
  2. Show retry button within the placeholder
  3. Log error with bookId, fascicleId, error type, duration
**What customer sees**: Error placeholder inline with the text, other fascicles still readable
**What operator sees**: Error logged with full context

### ERROR_NO_METADATA
**Triggered by**: STEP I1 failure — fascicle list not available
**Actions**:
  1. Show error: "Unable to load text structure. Please try again."
  2. Show retry button
  3. Offer "Return to catalog" link
**What customer sees**: Full-page error state
**What operator sees**: Metadata fetch failure logged

---

## State Transitions

### Chunk States
```
[not_requested] -> (user scrolls near boundary) -> [prefetching]
[prefetching] -> (prefetch success) -> [cached_indexeddb]
[prefetching] -> (prefetch failure) -> [not_requested] (will retry on demand)
[not_requested] -> (user navigates to fascicle) -> [loading]
[loading] -> (load success) -> [loaded]
[loading] -> (load failure) -> [error]
[error] -> (user retries) -> [loading]
[loaded] -> (cache eviction) -> [not_requested]
[cached_indexeddb] -> (user scrolls to it) -> [loaded] (instant, no network)
[cached_indexeddb] -> (TTL expired > 24h) -> [not_requested]
```

### Virtual Scroller States
```
[initializing] -> (first chunk loaded) -> [active]
[active] -> (new chunk loaded) -> [active] (item count updated)
[active] -> (user navigates to different fascicle) -> [active] (scroll position reset)
```

## Handoff Contracts

### Text Chunk Loader → Serverless CBETA API Proxy
**Endpoint**: `GET /api/cbeta/work/{bookId}/{fascicleId}`
**Success response**:
```json
{
  "ok": true,
  "data": {
    "fascicleId": "string",
    "fascicleTitle": "string",
    "text": "string — Raw text (may be XML P5)",
    "charCount": "number",
    "lineRefs": ["string — CBETA line references for each paragraph"]
  },
  "meta": {
    "fromCache": false,
    "responseTime": number,
    "coldStart": true|false
  }
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "code": "FASCICLE_NOT_FOUND | PROXY_TIMEOUT | PROXY_ERROR | PARSE_ERROR | VERCEL_TIMEOUT",
  "retryable": "boolean"
}
```
**Timeout**: 17s (client-side — accounts for 3s cold start + 8s CBETA + 2s transform + 4s buffer)

### Serverless CBETA API Proxy → CBETA API
**Endpoint**: `GET https://cbdata.dila.edu.tw/stable/api/v3/work/{bookId}/{fascicleId}`
**Headers**: `{ "Referer": "<app domain>", "Accept": "application/json" }`
**Timeout**: 8s (server-side — reduced from 10s to fit within Vercel 10s limit including cold start)
**Cache**: Vercel Edge Cache, `Cache-Control: public, max-age=86400`

### Text Chunk Loader → IndexedDB Cache (Client-Side)
**Database**: `buddha-cbeta-cache`
**Object store**: `fascicles`
**Key**: `{bookId}:{fascicleId}` (e.g., `T0235:001`)
**Value**: `{ paragraphs: [...], fascicleId, charCount, lineRefs, cachedAt: timestamp }`
**TTL**: 24 hours
**Max size**: 50MB total (LRU eviction when approaching limit)

### Virtual Scroller → Text Chunk Loader (proximity event)
**Event**: `chunkProximity`
**Payload**:
```
{
  direction: "forward" | "backward",
  nextFascicleId: string,
  distanceInFascicles: number
}
```

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| In-flight fetch request | STEP I3/P3 | STEP N2 (navigation cancel) or component unmount | AbortController.abort() |
| Loading skeleton for fascicle | STEP I3 | STEP I5 (delivery) or error state | DOM removal |
| Cached fascicle in TanStack Query | STEP I4 | TanStack Query GC (gcTime=1h) or manual invalidation | queryClient.removeQueries() |
| Cached fascicle in IndexedDB | STEP I5 | TTL expiry (24h) or LRU eviction (50MB cap) | IndexedDB.delete() |
| Vercel Edge Cache entry | Serverless proxy | TTL expiry (Cache-Control max-age=86400) | Automatic |
| Prefetch queue entry | STEP P3 | STEP P4 (cache) or component unmount | Remove from queue |

## Cold Start Mitigation for Chunk Loading

### Strategy 1: IndexedDB Cache (Primary — Most Effective)
- Every loaded fascicle is stored in IndexedDB with 24h TTL
- On subsequent reads (same session or next day), fascicles load from IndexedDB — **zero cold start, zero network**
- This is the single most important cold start mitigation for the reading experience

### Strategy 2: Vercel Edge Cache (Secondary)
- Fascicle responses have `Cache-Control: public, max-age=86400`
- Vercel's edge network caches responses globally
- Subsequent requests for the same fascicle hit the edge cache — **zero cold start**
- Works across different users (shared cache)

### Strategy 3: Prefetch Adjacent Fascicles (Proactive)
- When reading fascicle N, prefetch fascicle N+1 and N+2 in the background
- This warms the serverless function and populates IndexedDB before the user needs it
- By the time the user scrolls to fascicle N+1, it's already cached — **instant display**

### Strategy 4: TanStack Query Deduplication (Concurrency)
- If multiple components request the same fascicle simultaneously, TanStack Query deduplicates to a single request
- Prevents multiple cold starts for the same resource

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | CBETA API returns XML P5 format, not JSON — parsing is mandatory | High | STEP I4 | Must use fast-xml-parser to convert XML to structured paragraphs |
| RC-2 | CBETA line references (e.g., T01n0001_p0001a01) are essential for bookmark precision | High | STEP I4 | Line refs must be preserved in parsed output |
| RC-3 | Prefetch distance (N fascicles) needs tuning — too aggressive wastes bandwidth, too conservative causes loading pauses | Medium | STEP P1 | Start with 2 fascicles ahead, measure and adjust |
| RC-4 | Virtual scrolling with variable-height paragraphs is complex — Chinese text line wrapping varies with font size | Medium | STEP I5, I6 | Use estimated heights with dynamic correction |
| RC-5 | Redis cache removed — IndexedDB must handle all persistent caching | High | Entire workflow | IndexedDB cache must implement TTL, LRU eviction, and 50MB cap |
| RC-6 | Serverless cold start may cause visible loading pauses on first fascicle fetch | High | STEP I3 | Mitigated by IndexedDB cache + prefetch + Vercel Edge Cache |

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — initial fascicle load | Open a book, first fascicle loads | Text renders within 3s (warm) or 6s (cold start) |
| TC-02: Happy path — scroll prefetch | Scroll near end of fascicle 1 | Fascicle 2 prefetched in background, stored in IndexedDB |
| TC-03: Happy path — cached fascicle (IndexedDB) | Scroll to prefetched fascicle | Instant render from IndexedDB, no network request |
| TC-04: Happy path — TOC navigation | Click fascicle 5 in TOC | Fascicle 5 loads, scrolls to top |
| TC-05: Cache hit (stale revalidation) | Stale fascicle in IndexedDB (>24h) | Show cached immediately, revalidate in background |
| TC-06: Fascicle not found (404) | Request removed fascicle | Error placeholder shown, other fascicles unaffected |
| TC-07: Proxy timeout | CBETA API slow to respond | Retry once, then error placeholder |
| TC-08: Network unreachable (offline) | No internet, no cache | Error placeholder with offline message |
| TC-09: Network unreachable with stale cache | No internet, stale IndexedDB cache available | Show stale data with "offline" banner |
| TC-10: XML parse error | CBETA returns malformed XML | Attempt raw text render, show warning |
| TC-11: Empty fascicle | Fascicle has no text content | "No text content" message shown |
| TC-12: Cancel in-flight on navigation | Start loading fascicle 2, click fascicle 5 | Fascicle 2 request cancelled, fascicle 5 loads |
| TC-13: Prefetch failure (non-blocking) | Prefetch of fascicle 3 fails | No user-facing error, retry on demand |
| TC-14: Rapid fascicle navigation | Click fascicles 1→2→3→4 rapidly | Only fascicle 4 loads, intermediate requests cancelled |
| TC-15: Last fascicle reached | Scroll to final fascicle | No prefetch attempt, end-of-text indicator |
| TC-16: Variable paragraph heights | Change font size, scroll through text | Virtual scroller adjusts heights dynamically |
| TC-17: Cold start on first fascicle | First fascicle fetch after 60s+ idle | Loading shown for 3-6s, then text appears |
| TC-18: Vercel Edge Cache hit | Repeat fascicle fetch, edge cache warm | Serverless fn not invoked, response from edge cache |
| TC-19: IndexedDB quota exceeded | Fill IndexedDB to 50MB | LRU eviction of oldest fascicles, new fascicle cached |
| TC-20: Cross-session cache persistence | Read fascicle, close browser, reopen | Fascicle loads from IndexedDB instantly |

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | CBETA API returns XML P5 format that can be parsed into paragraphs | Architecture doc mentions fast-xml-parser | Medium: if format is different, parser must be rewritten |
| A2 | Each fascicle is a reasonable size for a single API call (< 500KB) | CBETA convention | Low: if fascicles are huge, need sub-fascicle chunking |
| A3 | 2-fascicle prefetch distance balances bandwidth and responsiveness | Heuristic | Medium: may need tuning based on actual fascicle sizes |
| A4 | TanStack Query gcTime=1h is sufficient for reading sessions | Design decision | Low: can be adjusted |
| A5 | Vercel Edge Cache honors Cache-Control headers for API routes | Vercel docs | Low: if not, every request hits serverless fn |
| A6 | Virtual scrolling can handle variable-height Chinese paragraphs | @tanstack/react-virtual capability | Medium: may need custom height estimation |
| A7 | Client-side IndexedDB can store 50MB+ of text data | Browser capability | Low: most browsers allow 50MB+ per origin |
| A8 | 24h IndexedDB TTL is appropriate for text content (rarely changes) | Texts are stable historical documents | Low: if CBETA updates texts, stale data served for up to 24h |
| A9 | 17s client-side timeout is sufficient for cold start + CBETA call | Estimate: 3s cold + 8s CBETA + 2s transform + 4s buffer | Medium: if cold start exceeds 3s, timeout may be too tight |

## Open Questions

- What is the exact XML structure returned by CBETA API? (Need to inspect actual response)
- Should sub-fascicle chunking be supported for very large fascicles?
- What is the optimal prefetch distance (number of fascicles ahead)?
- Should the reader show a progress indicator for total text loaded vs. total available?
- Should adjacent fascicle prefetching respect user's scroll speed (faster scroll = more aggressive prefetch)?
- Should the IndexedDB cache have a per-book limit (e.g., max 10 fascicles per book) to prevent one large book from filling the cache?

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — greenfield project | — |
| 2026-04-05 | Serverless migration: Redis removed, cold start analysis added | IndexedDB cache replaces Redis; client timeout increased to 17s; Vercel Edge Cache as primary server-side cache; prefetch strategy updated |
