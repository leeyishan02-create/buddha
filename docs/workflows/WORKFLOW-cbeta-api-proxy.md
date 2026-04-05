# WORKFLOW: CBETA API Proxy (Serverless)
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft (v0.2 — Serverless)
**Implements**: Serverless function proxy for all CBETA API communication with client-side caching

---

## ⚠️ Serverless Changes from v0.1

| Aspect | v0.1 (Persistent Backend) | v0.2 (Serverless) |
|---|---|---|
| **Runtime** | Persistent Node.js process | Vercel serverless function (cold starts) |
| **Timeout** | No hard limit (process lives) | **10s on Vercel free tier**, 60s on Pro |
| **Cache** | Redis (Upstash) — persistent across invocations | **Client-side IndexedDB cache** + Vercel Edge Cache (HTTP) |
| **Rate limiting** | Server-side tracking via Redis | Client-side tracking + CBETA `Retry-After` header |
| **State** | In-memory state persists between requests | **Every invocation is stateless** — no in-memory state |
| **Circuit breaker** | In-memory circuit breaker state | Not feasible (stateless) — rely on retries + client cache |
| **Cache stampede** | Single-flight via in-memory locks | Not feasible (stateless) — rely on HTTP caching headers |

---

## Overview

All communication with the external CBETA API flows through a **stateless serverless function** (Next.js Route Handler at `/api/cbeta/[...path]`). This workflow handles request validation, CBETA API calls with retry logic, response parsing/transformation, and error handling. **Caching is moved to the client side** (IndexedDB) and the HTTP layer (Vercel Edge Cache / Cache-Control headers), since there is no persistent server-side cache (Redis removed in v1.0).

## Actors

| Actor | Role in this workflow |
|---|---|
| Frontend Client (Browser) | Sends requests to the serverless proxy; maintains IndexedDB cache |
| CBETA API Proxy (Serverless fn) | Stateless proxy — validates, forwards, transforms, returns |
| Vercel Edge Cache | HTTP-level caching for proxy responses (Cache-Control headers) |
| CBETA API (External) | Source of Buddhist text data at `cbdata.dila.edu.tw` |
| IndexedDB (Client) | Client-side cache for CBETA responses (replaces Redis) |

## Prerequisites

- CBETA API is reachable from Vercel serverless execution environment
- Next.js API routes are deployed on Vercel
- `CBETA_BASE_URL` and `CBETA_REFERER` environment variables configured in Vercel project settings
- Client has IndexedDB available (modern browsers)

## ⚠️ Cold Start Analysis

**Cold start budget**: 10s total on Vercel free tier. This includes:
1. Serverless function initialization: ~1-3s (cold) / ~50-200ms (warm)
2. CBETA API call: up to 10s
3. Response transformation: <1s

**Critical constraint**: If cold start takes 3s and CBETA takes 8s, total = 11s → **timeout**. The proxy must use a **reduced CBETA timeout during cold start** or the client must implement its own timeout that accounts for cold start overhead.

**Mitigation strategy**:
- Client-side timeout: 15s (accounts for 3s cold start + 10s CBETA + 2s buffer)
- Serverless function CBETA timeout: 8s (leaves 2s for cold start + transformation)
- On Vercel Pro (60s limit): CBETA timeout can be 10s, client timeout 17s

## Trigger

Frontend client sends a request to any `/api/cbeta/*` endpoint:
- `GET /api/cbeta/catalog/{canon}` — List works in a canon
- `GET /api/cbeta/work/{workId}/metadata` — Get work metadata
- `GET /api/cbeta/work/{workId}/{volume}` — Get text of a specific volume
- `GET /api/cbeta/search?q={query}` — Full-text search

## Workflow Tree

### STEP 1: Cold Start & Receive Request
**Actor**: Vercel Serverless Function
**Action**: Function initializes (cold start if first invocation in ~60s window), parse incoming request
**Timeout**: 3s (cold start initialization only — not counted against CBETA timeout)
**Input**: HTTP request with path params and query string
**Output on SUCCESS**: `{ requestType: "catalog" | "metadata" | "text" | "search", normalizedParams: object }` -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(cold_start_timeout)`: Function fails to initialize within 3s -> [recovery: Vercel retries automatically; client sees 504 after 10s total]
  - `FAILURE(missing_params)`: Required path/query params missing -> [recovery: return 400 with `{ ok: false, error: "Missing required parameter: {param}", code: "INVALID_REQUEST" }`]
  - `FAILURE(invalid_work_id_format)`: Work ID doesn't match pattern -> [recovery: return 400 with `{ ok: false, error: "Invalid work identifier", code: "INVALID_REQUEST" }`]

**Observable states during this step**:
  - Customer sees: Loading spinner (may take 1-3s longer on cold start)
  - Database: No changes
  - Logs: `[cbeta-proxy] cold start request type="text" workId="T0235" volume="001"`

### STEP 2: Check Vercel Edge Cache (HTTP Layer)
**Actor**: Vercel Edge Network
**Action**: Vercel's edge cache checks if a cached response exists for this URL + Cache-Control headers
**Timeout**: 50ms
**Input**: Request URL + headers
**Output on SUCCESS (cache hit)**: Cached response returned directly to client -> **WORKFLOW COMPLETE** (no serverless function invoked)
**Output on SUCCESS (cache miss)**: Request forwarded to serverless function -> GO TO STEP 3

**⚠️ TIMING ASSUMPTION**: Vercel Edge Cache is checked **before** the serverless function is invoked. A cache hit means **zero cold start latency** for the client. This is the primary defense against cold starts.

**Cache-Control headers set by proxy**:
```
catalog:  public, max-age=3600, stale-while-revalidate=7200
metadata: public, max-age=86400, stale-while-revalidate=86400
text:     public, max-age=86400, stale-while-revalidate=86400
search:   public, max-age=3600, stale-while-revalidate=3600
```

### STEP 3: Call CBETA API
**Actor**: Serverless Function → CBETA API
**Action**: Construct and send HTTP request to CBETA API with proper headers and timeout
**Timeout**: 8s (reduced from 10s to account for cold start overhead within 10s Vercel limit)
**Input**: `{ requestType, normalizedParams }`
**Output on SUCCESS**: Raw CBETA API response (HTTP status + body) -> GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(cbeta_timeout)`: CBETA API does not respond within 8s -> [recovery: retry x1 with 10s timeout — but ONLY if total function execution time < 8s remaining; otherwise return 504 immediately]
  - `FAILURE(cbeta_5xx)`: CBETA API returns 5xx -> [recovery: retry x1 with 2s backoff — ONLY if time budget allows; otherwise return 502]
  - `FAILURE(cbeta_4xx)`: CBETA API returns 4xx (not 404) -> [recovery: return 400 to frontend with CBETA error details]
  - `FAILURE(cbeta_404)`: CBETA API returns 404 -> [recovery: return 404 to frontend with `{ ok: false, error: "Resource not found", code: "NOT_FOUND", retryable: false }`]
  - `FAILURE(cbeta_429)`: CBETA API rate limits -> [recovery: return 429 to frontend with `Retry-After` header — client handles backoff]
  - `FAILURE(dns_failure)`: Cannot resolve CBETA hostname -> [recovery: return 502 to frontend]
  - `FAILURE(connection_refused)`: CBETA server unreachable -> [recovery: return 502 to frontend]

**CBETA API request details**:
```
GET https://cbdata.dila.edu.tw/stable/api/v3/{path}
Headers:
  Referer: {process.env.CBETA_REFERER}
  Accept: application/json
Timeout: 8s (serverless function budget)
Retry: 1x with 2s backoff (only if time budget allows)
```

**⚠️ CRITICAL**: Unlike v0.1, the serverless function **cannot** retry indefinitely. Each retry consumes from the 10s Vercel timeout budget. The retry logic MUST check elapsed time before each retry attempt.

**Observable states during this step**:
  - Customer sees: Loading spinner
  - Logs: `[cbeta-proxy] calling CBETA method=GET path="/work/T0235/001" timeout=8s elapsed=3200ms`

### STEP 4: Parse and Transform Response
**Actor**: Serverless Function
**Action**: Parse CBETA response, normalize field names, structure data for frontend consumption
**Timeout**: 1s
**Input**: Raw CBETA API response body
**Output on SUCCESS**: `{ transformedData: object, charCount?: number, fascicleCount?: number }` -> GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(parse_error)`: Response is not valid JSON or unexpected schema -> [recovery: log full response body (truncated), return 502 to frontend]
  - `FAILURE(xml_parse_error)`: XML response cannot be parsed -> [recovery: log raw XML (truncated), return 502 with parse error details]

**Transformation rules by request type**:
```
catalog:  [{ id, title, author, translator, volumeCount }]
metadata: { id, title, author, translator, fascicles: [{ id, title, charCount }], totalChars }
text:     { fascicleId, fascicleTitle, rawText, lineRefs, charCount }
search:   { results: [{ workId, title, matchContext, lineRef }], total, page }
```

**Observable states during this step**:
  - Customer sees: Still loading
  - Logs: `[cbeta-proxy] transformed response type="text" fascicle="001" chars=8500`

### STEP 5: Return Response with Cache Headers
**Actor**: Serverless Function
**Action**: Serialize transformed data, set Cache-Control headers for Vercel Edge Cache, return response
**Timeout**: 100ms
**Input**: `{ data: object, requestType: string }`
**Output on SUCCESS**: HTTP 200 with JSON body + Cache-Control headers -> **WORKFLOW COMPLETE**
**Output on FAILURE**: None

**Response headers**:
```
Content-Type: application/json
Cache-Control: public, max-age=3600 (catalog/search) or max-age=86400 (metadata/text)
X-Cache: MISS (always MISS when serverless fn runs — HIT means edge cache served it)
X-Response-Time: {duration}ms
X-Cold-Start: true|false (for debugging)
```

**Response body**:
```json
{
  "ok": true,
  "data": { ...transformed data... },
  "meta": {
    "fromCache": false,
    "responseTime": number,
    "coldStart": true|false
  }
}
```

---

### ERROR_UPSTREAM_TIMEOUT
**Triggered by**: STEP 3 CBETA timeout after retries exhausted or time budget exceeded
**Response**:
```json
{
  "ok": false,
  "error": "CBETA API timed out. Please try again.",
  "code": "UPSTREAM_TIMEOUT",
  "retryable": true
}
```
**HTTP Status**: 504 Gateway Timeout
**Actions**: Log error with context (elapsed time, retry count)

### ERROR_UPSTREAM_ERROR
**Triggered by**: STEP 3 CBETA 5xx after retries exhausted or time budget exceeded
**Response**:
```json
{
  "ok": false,
  "error": "CBETA service is temporarily unavailable.",
  "code": "UPSTREAM_ERROR",
  "retryable": true
}
```
**HTTP Status**: 502 Bad Gateway

---

## State Transitions

```
[received] -> (validation success) -> [edge_cache_check]
[received] -> (validation failure) -> [rejected] (400)
[edge_cache_check] -> (cache HIT at edge) -> [complete] (no serverless fn invoked)
[edge_cache_check] -> (cache MISS) -> [fetching]
[fetching] -> (CBETA success) -> [transforming]
[fetching] -> (CBETA failure, retry succeeds) -> [transforming]
[fetching] -> (CBETA failure, retries exhausted or time budget exceeded) -> [error]
[transforming] -> (transform success) -> [responding]
[transforming] -> (transform failure) -> [error]
[responding] -> (response sent with cache headers) -> [complete]
```

## Handoff Contracts

### Frontend → CBETA API Proxy (Serverless)
**Endpoint**: `GET /api/cbeta/{path}`
**Headers**: None required
**Timeout**: 15s (client-side — accounts for 3s cold start + 8s CBETA + 2s transformation + 2s network buffer)
**Success response**:
```json
{
  "ok": true,
  "data": { ... },
  "meta": {
    "fromCache": false,
    "responseTime": 4200,
    "coldStart": true
  }
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "code": "INVALID_REQUEST | UPSTREAM_TIMEOUT | UPSTREAM_ERROR | NOT_FOUND | RATE_LIMITED | PARSE_ERROR",
  "retryable": boolean
}
```

### Serverless Function → CBETA API
**Endpoint**: `GET https://cbdata.dila.edu.tw/stable/api/v3/{path}`
**Headers**:
```json
{
  "Referer": "<process.env.CBETA_REFERER>",
  "Accept": "application/json"
}
```
**Timeout**: 8s (reduced from 10s to fit within Vercel 10s limit including cold start)
**Retry**: 1x with 2s backoff (only if time budget allows — check elapsed time before retry)
**Rate limit handling**: Return 429 to client with `Retry-After` header — client handles backoff

### Client → IndexedDB Cache (Client-Side, replaces Redis)
**Database**: `buddha-cbeta-cache`
**Object store**: `responses`
**Key format**: `{requestType}:{params}` (e.g., `text:T0235:001`)
**Value**: Full response body (JSON)
**TTL**: 24 hours (client-side expiry check on read)
**Max size**: 50MB total (browser IndexedDB quota is generous, but we cap to be safe)

## Cleanup Inventory

| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| In-flight CBETA request | STEP 3 | STEP 3 timeout or AbortController | AbortController.abort() |
| Serverless function invocation | STEP 1 | Vercel platform | Automatic (stateless) |
| Vercel Edge Cache entry | STEP 5 | TTL expiry (Cache-Control max-age) | Automatic |
| Client-side IndexedDB cache entry | Client-side (after receiving response) | Client-side TTL expiry (24h) or LRU eviction | IndexedDB.delete() |

## Cold Start Mitigation Strategies

### Strategy 1: Vercel Edge Cache (Primary)
- Set `Cache-Control: public, max-age=86400` on text/metadata responses
- Vercel's edge network caches the response globally
- Subsequent requests for the same URL hit the edge cache — **zero cold start**
- **Limitation**: Cache is per-URL. Different query params = different cache entries.

### Strategy 2: Client-Side IndexedDB Cache (Secondary)
- After receiving a response from the proxy, the client stores it in IndexedDB
- On subsequent requests, the client checks IndexedDB first
- If IndexedDB has a fresh copy (< 24h old), **skip the serverless function entirely**
- **This is the most effective cold start mitigation** for repeat readers

### Strategy 3: Prefetch on Navigation (Proactive)
- When a user clicks a search result, prefetch the book metadata immediately
- This warms the serverless function before the user actually opens the reader
- Reduces perceived cold start latency

### Strategy 4: Vercel Cron Pre-warming (Optional, Pro tier)
- Set up a cron job that periodically hits popular endpoints (Diamond Sutra, Heart Sutra)
- Keeps the serverless function warm for the most common requests
- **Cost**: Uses serverless function invocations; only viable on Pro tier

## Reality Checker Findings

| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | Redis cache removed — client-side IndexedDB cache must handle all caching needs | High | Entire workflow | Client cache must implement TTL, LRU eviction, and stale-while-revalidate |
| RC-2 | Vercel free tier 10s timeout is tight for cold start + CBETA call | High | STEP 3 | CBETA timeout reduced to 8s; client timeout set to 15s |
| RC-3 | No circuit breaker possible in stateless serverless functions | Medium | Error handling | Client-side circuit breaker pattern (track failures in localStorage) |
| RC-4 | CBETA API may return XML instead of JSON for some endpoints | High | STEP 4 | Parser must handle both JSON and XML (use fast-xml-parser) |
| RC-5 | No cache stampede protection without server-side state | Medium | STEP 2 | Rely on Vercel Edge Cache + client-side deduplication via TanStack Query |

## Test Cases

| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — cold start | First request after 60s idle | Function initializes (~2s), calls CBETA, returns response within 15s |
| TC-02: Happy path — warm function | Second request within 60s | Function already warm, calls CBETA, returns within 10s |
| TC-03: Happy path — Vercel Edge Cache hit | Third request for same URL | Edge cache serves response, serverless function NOT invoked |
| TC-04: Happy path — client IndexedDB cache hit | Client requests cached fascicle | Client serves from IndexedDB, no network request at all |
| TC-05: Invalid work ID format | Request `/api/cbeta/work/INVALID/001` | 400 returned with validation error |
| TC-06: Missing required params | Request `/api/cbeta/work/` (no volume) | 400 returned with missing param error |
| TC-07: CBETA timeout | CBETA API takes >8s | Retry once (if time budget allows), then 504 |
| TC-08: CBETA 500 error | CBETA returns 500 | Retry once (if time budget allows), then 502 |
| TC-09: CBETA 404 | CBETA returns 404 | 404 returned to frontend, not cached |
| TC-10: CBETA 429 rate limit | CBETA returns 429 | 429 returned to client with Retry-After header |
| TC-11: Malformed CBETA response | CBETA returns invalid JSON | 502 returned with parse error |
| TC-12: XML response handling | CBETA returns XML instead of JSON | XML parsed, transformed, returned as JSON |
| TC-13: Cache headers present | Any successful response | Cache-Control, X-Cache, X-Response-Time headers present |
| TC-14: Cold start detection | First request after idle | Response includes `meta.coldStart: true` |
| TC-15: Time budget enforcement | CBETA takes 7s, retry would exceed 10s | No retry attempted, 504 returned |
| TC-16: Concurrent identical requests | Two requests for same resource simultaneously | Both hit serverless fn (no single-flight), both get same response |

## Assumptions

| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | CBETA API base URL is `https://cbdata.dila.edu.tw/stable/api/v3` | Architecture doc research | Critical: all proxy calls fail if URL is wrong |
| A2 | CBETA API requires `Referer` header | Architecture doc | High: requests rejected without Referer |
| A3 | CBETA API does not require authentication (API key, OAuth) | Assumed from public API nature | Critical: all calls fail with 401 if auth required |
| A4 | Vercel free tier 10s timeout applies to all API routes | Vercel docs | High: if timeout is shorter, CBETA calls will fail |
| A5 | Vercel cold start is ~1-3s for Next.js API routes | Vercel community reports | Medium: if cold start is 5s+, no time budget for CBETA |
| A6 | Vercel Edge Cache respects Cache-Control headers from serverless functions | Vercel docs | Low: if not, all requests hit serverless fn (cold start every time) |
| A7 | CBETA API responses are idempotent (same request = same response) | Nature of Buddhist texts | Low: if responses vary, caching may serve stale data |
| A8 | 24-hour cache TTL is appropriate for text content | Texts are stable historical documents | Low: if CBETA updates texts, stale data served for up to 24h |
| A9 | Client-side IndexedDB can store 50MB+ of text data | Browser capability | Low: most browsers allow 50MB+ per origin |
| A10 | Serverless function has access to `fast-xml-parser` npm package | Vercel supports npm | Low: if not, need alternative XML parser |

## Open Questions

- Does CBETA API require any form of authentication or API key?
- What is the exact rate limit of CBETA API (requests per minute/hour)?
- Should the CBETA proxy use Vercel Edge Runtime (faster cold start, limited API) or Node.js Runtime?
- Should there be a client-side circuit breaker that tracks failures in localStorage?
- What is the maximum response size from CBETA API that we need to handle?
- Should popular sutras be pre-cached at build time (ISR/SSG) to avoid serverless calls entirely?

## Spec vs Reality Audit Log

| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — greenfield project | — |
| 2026-04-05 | Serverless migration: Redis removed, cold start analysis added, timeouts adjusted | CBETA timeout reduced to 8s; client timeout 15s; Vercel Edge Cache as primary cache |
