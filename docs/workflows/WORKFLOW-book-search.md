# WORKFLOW: Book Search — SERVERLESS
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Search books by title, author name, translator name
**Serverless**: Yes — uses serverless proxy function with Vercel edge cache

## Overview
User enters a search query (title, author, or translator), the system queries the CBETA API via a **serverless proxy function** (not a persistent server), returns paginated results, and the user selects a book to read. Cold starts add 1-3s on the first search after idle. Vercel edge cache mitigates this for repeated queries. No server-side Redis cache — caching is handled by Vercel edge cache + TanStack Query client cache.

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (User) | Enters search query, reviews results, selects a book |
| Search UI Component | Captures input, debounces, displays results, handles selection |
| Serverless Proxy Function | `/api/search` — Vercel serverless function, proxies to CBETA |
| Vercel Edge Cache | Caches proxy responses at the edge (replaces Redis) |
| CBETA API | External search endpoint for Buddhist texts |
| TanStack Query (client) | Client-side cache with stale-while-revalidate |

## Prerequisites
- Vercel serverless function `/api/search` is deployed
- CBETA API is reachable from Vercel's serverless runtime
- Frontend application is loaded and rendered
- **No Redis, no PostgreSQL** — v1.0 is pure client-side + serverless proxy

## Trigger
User types into the search input field on `/search` page or search modal.

## Cold Start Impact
| Scenario | Latency | User Experience |
|---|---|---|
| First search after deployment | 2-5s | Loading skeleton displayed |
| First search after 5+ min idle | 1-3s | Loading skeleton displayed |
| Subsequent searches (edge cache hit) | < 200ms | Near-instant results |
| Subsequent searches (edge cache miss, warm function) | 500ms-2s | Brief loading indicator |

## Workflow Tree

### STEP 1: Query Input & Debounce
**Actor**: Search UI Component
**Action**: Capture keystrokes, debounce for 400ms, validate minimum query length
**Timeout**: N/A (user-driven)
**Input**: Keystroke events from search input
**Output on SUCCESS**: Debounced query string (≥ 2 characters) -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(query_too_short)`: Query < 2 characters -> [recovery: show "Enter at least 2 characters" hint, do not call API, stay on STEP 1]
  - `FAILURE(empty_query)`: Query is empty or whitespace only -> [recovery: clear results, show placeholder, stay on STEP 1]
  - `FAILURE(special_chars_only)`: Query contains only punctuation/symbols -> [recovery: show "Please enter valid search terms", stay on STEP 1]

**Observable states during this step**:
  - Customer sees: Search input with current text, optional "searching..." indicator if debounce expired and API call pending
  - Database: No changes (no server-side DB in v1.0)
  - Logs: N/A (client-side only)

### STEP 2: Query Validation & Sanitization
**Actor**: Search UI Component (client) → Serverless Proxy Function (server)
**Action**: Validate query format, sanitize for injection, encode for URL
**Timeout**: 1s (client-side validation)
**Input**: `{ query: string }`
**Output on SUCCESS**: `{ sanitized_query: string, encoded_query: string }` -> GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(invalid_encoding)`: Query contains unencodable characters -> [recovery: return 400, show "Invalid search query", stay on STEP 1]

**Observable states during this step**:
  - Customer sees: Brief loading state
  - Logs: `[proxy] search query validated query="..." len=N`

### STEP 3: Serverless API Request Dispatch
**Actor**: Serverless Proxy Function (`/api/search`)
**Action**: Construct CBETA API search request with sanitized query, send with timeout

**⚠️ COLD START WARNING**: This serverless function may need 1-3s to cold start. The 10s Vercel timeout means the CBETA API call itself must complete within ~7s.

**Timeout**: 7s for CBETA call (leaving 3s budget for cold start + transformation)
**Input**: `{ sanitized_query: string, page: number = 1, per_page: number = 20 }`
**Output on SUCCESS**: CBETA API responds with search results -> GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(cbeta_timeout)`: CBETA API does not respond within 7s -> [recovery: function returns 504 to client → client retries x1 with 12s timeout → if still fails, GO TO ERROR_SEARCH_FAILED]
  - `FAILURE(cbeta_5xx)`: CBETA API returns 5xx -> [recovery: function returns 502 to client → client retries x1 with 3s backoff → if still fails, GO TO ERROR_SEARCH_FAILED]
  - `FAILURE(cbeta_4xx)`: CBETA API returns 4xx (bad request) -> [recovery: return 400 to frontend with CBETA error message, GO TO STEP 1]
  - `FAILURE(cbeta_rate_limit)`: CBETA API returns 429 -> [recovery: wait `Retry-After` header value (or 30s default), retry x1 → if still 429, GO TO ERROR_RATE_LIMITED]
  - `FAILURE(network_unreachable)`: Cannot reach CBETA API -> [recovery: check TanStack Query cache for this query → if cache hit, GO TO STEP 5 with cached data; else GO TO ERROR_SEARCH_FAILED]
  - `FAILURE(vercel_timeout)`: Vercel kills function at 10s -> [recovery: client receives 504 → client retries x1 (may hit warm function) → if still fails, GO TO ERROR_SEARCH_FAILED]

**Observable states during this step**:
  - Customer sees: Loading spinner or skeleton cards in results area
  - Database: No changes
  - Logs: `[proxy] calling CBETA search query="..." page=1 timeout=7s`

### STEP 4: Response Transformation & Edge Cache
**Actor**: Serverless Proxy Function
**Action**: Parse CBETA API response, normalize field names, extract metadata, paginate, set Cache-Control headers for Vercel edge cache
**Timeout**: 2s
**Input**: Raw CBETA API JSON response
**Output on SUCCESS**: `{ results: [...], total, page, per_page, has_more }` with `Cache-Control: public, max-age=3600` header -> GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(parse_error)`: CBETA response is malformed or unexpected schema -> [recovery: log full response body, return 502 to frontend with "Search service returned unexpected data", GO TO ERROR_SEARCH_FAILED]
  - `FAILURE(empty_results)`: CBETA returns 0 results -> [recovery: return empty results array with total=0, GO TO STEP 5 (this is a valid outcome, not an error)]

**Observable states during this step**:
  - Customer sees: Still loading (transformation is fast)
  - Database: No changes
  - Logs: `[proxy] CBETA response parsed results=N total=M`

### STEP 5: Result Rendering
**Actor**: Search UI Component
**Action**: Render search results as cards/list, show pagination controls if has_more. Store in TanStack Query cache for future requests.
**Timeout**: N/A (rendering)
**Input**: Transformed results from STEP 4
**Output on SUCCESS**: Results displayed, user can scroll and select -> GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(render_error)`: Browser fails to render (extremely unlikely) -> [recovery: show "Results could not be displayed. Please refresh.", GO TO STEP 1]

**Observable states during this step**:
  - Customer sees: List of book cards with title, author, translator, volume info. If no results: "No books found matching your search."
  - Database: No changes

### STEP 6: Result Selection
**Actor**: Reader (User) → Search UI Component
**Action**: User clicks a search result card
**Timeout**: N/A (user-driven)
**Input**: Click event on result card with `{ book_id: string }`
**Output on SUCCESS**: Navigate to reader view with selected book_id -> GO TO TEXT READING WORKFLOW (STEP 1)
**Output on FAILURE**:
  - `FAILURE(book_not_found)`: Book ID no longer valid (rare) -> [recovery: show "This text is no longer available", refresh search results, stay on STEP 5]

**Observable states during this step**:
  - Customer sees: Brief highlight on clicked card, then navigation to reader
  - Database: No changes

---

### ERROR_SEARCH_FAILED
**Triggered by**: STEP 3 failures (timeout, 5xx, network, vercel_timeout) after retries exhausted, STEP 4 parse errors
**Actions**:
  1. Display error banner: "Search is temporarily unavailable. Please try again."
  2. Show retry button
  3. If TanStack Query cache has results for this query, show them with "Showing cached results" label
  4. Log error with full context for debugging
**What customer sees**: Error state with retry option
**What operator sees**: Error logged with request ID, CBETA response status, duration

### ERROR_RATE_LIMITED
**Triggered by**: STEP 3 CBETA 429 after retries
**Actions**:
  1. Display message: "Too many searches. Please wait a moment and try again."
  2. Disable search input for the backoff period (show countdown)
  3. After backoff period, re-enable search input
**What customer sees**: Disabled search input with countdown timer
**What operator sees**: Rate limit event logged

---

## State Transitions
```
[idle] -> (user types ≥ 2 chars) -> [querying]
[querying] -> (API success) -> [results_displayed]
[querying] -> (API failure, retry succeeds) -> [results_displayed]
[querying] -> (API failure, retries exhausted) -> [error]
[error] -> (user clicks retry) -> [querying]
[results_displayed] -> (user selects book) -> [navigating_to_reader]
[results_displayed] -> (user types new query) -> [querying]
[results_displayed] -> (user navigates to next page) -> [querying]
```

## Handoff Contracts

### Search UI → Serverless Proxy Function
**Endpoint**: `GET /api/search?q={query}&page={page}&per_page={per_page}`
**Payload**: Query parameters
**Success response**:
```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "id": "string — CBETA work ID (e.g., T0001)",
        "title": "string — Book title in Traditional Chinese",
        "author": "string — Author name or null",
        "translator": "string — Translator name or null",
        "volume": "string — Volume identifier",
        "fascicle_count": "number — Number of fascicles (chapters)",
        "description": "string — Brief description or null"
      }
    ],
    "total": "number — Total matching results",
    "page": "number — Current page",
    "per_page": "number — Results per page",
    "has_more": "boolean"
  }
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string — Human-readable error message",
  "code": "SEARCH_TIMEOUT | SEARCH_SERVICE_ERROR | SEARCH_RATE_LIMITED | SEARCH_PARSE_ERROR | VERCEL_TIMEOUT",
  "retryable": "boolean"
}
```
**Timeout**: 12s (client-side timeout for the whole request — accounts for 10s Vercel limit + 2s network)
**Cache headers on success**: `Cache-Control: public, max-age=3600` (Vercel edge cache)

### Serverless Proxy Function → CBETA API
**Endpoint**: CBETA search endpoint (exact URL to be determined during implementation)
**Payload**: CBETA-specific search parameters
**Timeout**: 7s (server-side, leaving 3s budget for cold start + transformation within Vercel's 10s limit)
**Failure response**: CBETA error format (to be documented when API is inspected)

### Client-Side Retry Contract (for vercel_timeout)
**Trigger**: Client receives HTTP 504 from `/api/search`
**Action**: Retry the same request after 1s backoff (function likely warm on retry)
**Max retries**: 1
**If retry also fails**: Show ERROR_SEARCH_FAILED

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| In-flight API request | STEP 3 | User types new query (debounce cancels previous) | AbortController.abort() |
| Loading state indicator | STEP 3 | STEP 5 or ERROR_SEARCH_FAILED | UI state reset |
| Search query in URL params | STEP 2 | User clears search | URL update |
| TanStack Query cache entry | STEP 5 | TanStack Query gcTime expiry (1h) | Automatic GC |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — single result | Valid query, 1 match | 1 result card displayed, clickable |
| TC-02: Happy path — multiple results | Valid query, N matches | N result cards displayed with pagination if N > per_page |
| TC-03: Happy path — no results | Valid query, 0 matches | "No books found" message displayed |
| TC-04: Query too short | 1 character entered | No API call, hint message shown |
| TC-05: Empty query | Whitespace only | No API call, results cleared |
| TC-06: Special characters only | "!!!" entered | Validation error shown, no API call |
| TC-07: CBETA timeout | CBETA API takes > 7s | Serverless function returns 504, client retries once, then error state |
| TC-08: CBETA 500 error | CBETA returns 500 | Serverless function returns 502, client retries once, then error state |
| TC-09: CBETA 429 rate limit | CBETA returns 429 | Wait Retry-After or 30s, retry once, then rate-limited state |
| TC-10: Network unreachable | No internet connection | Show error, or show TanStack Query cached results if available |
| TC-11: Malformed CBETA response | CBETA returns unexpected JSON | 502 returned to frontend, error state shown |
| TC-12: Rapid typing | User types 10 chars in 2 seconds | Only 1 API call after final debounce (400ms) |
| TC-13: Pagination | User clicks "next page" | New API call with page=2, results replaced |
| TC-14: Result selection | User clicks a result card | Navigate to reader with correct book_id |
| TC-15: Concurrent search | User types query A, then quickly types query B | Query A's response is discarded, only B's results shown |
| TC-16: Cold start on first search | First search after 5+ min idle | Loading skeleton shown for 1-3s, then results appear |
| TC-17: Vercel edge cache hit | Repeat same search within 1h | Results appear in < 200ms (served from edge cache) |
| TC-18: Vercel 10s timeout | CBETA takes > 7s, function killed at 10s | Client receives 504, retries once, shows error if retry fails |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | CBETA API does not require authentication | Not verified — greenfield | All API calls fail with 401 |
| A2 | CBETA API returns results in a consistent JSON schema | Not verified — API not inspected | STEP 4 parse errors on every response |
| A3 | CBETA API supports search by title, author, and translator in a single query | Not verified | May need separate search endpoints per field |
| A4 | 400ms debounce is sufficient to reduce API load while feeling responsive | UX best practice, not verified | Too slow (user frustration) or too fast (excessive API calls) |
| A5 | Book IDs from CBETA are stable across sessions | Not verified | Bookmarks and deep links break if IDs change |
| A6 | CBETA API supports pagination | Not verified | Cannot implement pagination, must load all results |
| A7 | Vercel edge cache honors Cache-Control headers for API routes | Vercel docs | If not, every search hits CBETA directly |
| A8 | 7s timeout for CBETA call is sufficient for search queries | Estimate based on CBETA API | If CBETA search is slower, function will be killed at 10s |

## Open Questions
- What is the exact CBETA API search endpoint URL and parameter format?
- Does CBETA API support fuzzy search or only exact match?
- Should search history be persisted locally for the user?
- Should there be advanced search (filter by dynasty, category, etc.)?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created | — |
| 2026-04-05 | Serverless revision — Redis removed, Vercel edge cache added, 10s timeout constraint, client-side retry for vercel_timeout | Updated all steps, added cold start analysis, added TC-16/17/18 |
