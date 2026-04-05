# WORKFLOW: Text Reading — SERVERLESS
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Read books with adjustable font size, font type, line spacing
**Serverless**: Yes — text fetching via serverless proxy, preferences from localStorage

## Overview
User selects a book (from search results or bookmarks), the system loads the text metadata and initial chunk from CBETA API via a **serverless proxy function**, applies user preferences (font, size, spacing) from **localStorage**, renders the text, and enables scrolling/pagination. Cold starts add 1-3s on first text load after idle. IndexedDB text cache eliminates network calls for previously-read texts.

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (User) | Selects a book, reads text, interacts with reader controls |
| Reader UI Component | Displays text, controls, loading states, error states |
| Text Chunk Loader | Manages fetching text chunks (see WORKFLOW-text-chunk-loading.md) |
| Language Converter | Converts Traditional Chinese to Simplified Chinese if needed (see WORKFLOW-language-toggle.md) |
| Preference Store | Provides current font/size/spacing settings from **localStorage** (see WORKFLOW-preference-management.md) |
| Serverless Proxy Function | `/api/cbeta/[...path]` — Vercel serverless function, proxies to CBETA |
| Vercel Edge Cache | Caches proxy responses at the edge (replaces Redis) |
| CBETA API | External source of Buddhist text content |
| IndexedDB Text Cache | Client-side persistent cache for parsed text content |
| Session Manager | Persists reading position to **IndexedDB** (see WORKFLOW-session-persistence.md) |

## Prerequisites
- User has selected a valid book_id (from search or bookmark)
- Serverless proxy function `/api/cbeta/[...path]` is deployed
- User preferences are loaded from **localStorage** (or defaults available)
- Language preference is known (SC or TC)
- **No PostgreSQL, no Redis, no auth** — v1.0 is pure client-side + serverless proxy

## Trigger
- User clicks a search result card (from WORKFLOW-book-search STEP 6)
- User clicks a bookmark (from WORKFLOW-bookmark-management)
- User opens a deep link `/read/{book_id}`
- Session restore loads a previously active book (from WORKFLOW-session-persistence)

## Cold Start Impact
| Scenario | Latency | User Experience |
|---|---|---|
| First text load after deployment | 3-6s | Loading skeleton displayed |
| First text load after 5+ min idle | 2-4s | Loading skeleton displayed |
| Subsequent loads (IndexedDB cache hit) | < 100ms | Near-instant text display |
| Subsequent loads (edge cache hit, warm function) | 500ms-2s | Brief loading indicator |

## Workflow Tree

### STEP 1: Book ID Resolution
**Actor**: Reader UI Component / Router
**Action**: Extract and validate book_id from URL params, navigation state, or bookmark data
**Timeout**: 100ms (client-side)
**Input**: `{ book_id: string, initial_position?: string }`
**Output on SUCCESS**: Validated book_id -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(missing_book_id)`: No book_id provided -> [recovery: redirect to /search, show "No book selected"]
  - `FAILURE(invalid_book_id_format)`: book_id does not match expected pattern -> [recovery: redirect to /search, show "Invalid book identifier"]

**Observable states during this step**:
  - Customer sees: Brief blank screen or transition animation
  - Database: No changes

### STEP 2: Reader UI Initialization + Load Preferences
**Actor**: Reader UI Component
**Action**: Set up reader layout with loading state, load user preferences from **localStorage**, prepare rendering container
**Timeout**: 200ms (localStorage read is synchronous/fast)
**Input**: `{ book_id: string }` + current preferences from localStorage
**Output on SUCCESS**: Reader UI rendered with loading skeleton, preferences applied to container -> GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(preferences_load_error)`: Cannot read preferences (corrupt localStorage) -> [recovery: use hardcoded defaults, log warning, continue to STEP 3]

**Observable states during this step**:
  - Customer sees: Reader layout with loading skeleton (placeholder lines in current font family/size)
  - Database: No changes
  - Logs: `[reader] UI initialized book_id="..." prefs={fontSize: N, fontFamily: "...", lineSpacing: N}`

### STEP 3: Check IndexedDB Text Cache
**Actor**: Text Chunk Loader
**Action**: Check if the requested text (or its metadata) is already cached in IndexedDB
**Timeout**: 100ms
**Input**: `{ book_id: string }`
**Output on SUCCESS (cache hit, fresh)**: `{ metadata: object, textChunks: array, fromCache: true, fresh: true }` -> GO TO STEP 6
**Output on SUCCESS (cache hit, stale)**: `{ metadata: object, textChunks: array, fromCache: true, fresh: false }` -> GO TO STEP 4 (revalidate in background) AND GO TO STEP 6 (show cached immediately)
**Output on SUCCESS (cache miss)**: `{ fromCache: false }` -> GO TO STEP 4

**Observable states during this step**:
  - Customer sees: Loading skeleton persists (or text appears instantly if cache hit)
  - Logs: `[chunk-loader] IndexedDB check book_id="..." hit=true|false`

### STEP 4: Fetch Book Metadata (Serverless)
**Actor**: Serverless Proxy Function (`/api/cbeta/work/{bookId}/metadata`)
**Action**: Fetch book metadata from CBETA API (title, author, translator, fascicle list, total size)

**⚠️ COLD START WARNING**: This serverless function may need 1-3s to cold start. The 10s Vercel timeout means the CBETA API call must complete within ~7s.

**Timeout**: 7s for CBETA call
**Input**: `{ book_id: string }`
**Output on SUCCESS**: `{ title: string, author: string | null, translator: string | null, fascicles: [{ id, title, char_count }], total_chars: number }` with `Cache-Control: public, max-age=86400` -> GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(metadata_timeout)`: CBETA API does not respond within 7s -> [recovery: function returns 504 → client retries x1 with 12s timeout → if still fails, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(metadata_5xx)`: CBETA API returns 5xx -> [recovery: function returns 502 → client retries x1 with 3s backoff → if still fails, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(book_not_found)`: CBETA API returns 404 -> [recovery: return 404 to frontend, GO TO ERROR_BOOK_NOT_FOUND]
  - `FAILURE(metadata_parse_error)`: Response schema mismatch -> [recovery: log full response, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(vercel_timeout)`: Vercel kills function at 10s -> [recovery: client receives 504 → client retries x1 (may hit warm function) → if still fails, GO TO ERROR_LOAD_FAILED]

**Observable states during this step**:
  - Customer sees: Loading skeleton with book title area blank
  - Database: No changes
  - Logs: `[proxy] fetching metadata book_id="..." timeout=7s`

### STEP 5: Load Initial Text Chunk (Serverless)
**Actor**: Text Chunk Loader → Serverless Proxy Function → CBETA API
**Action**: Load the first chunk of text (fascicle 1, or the fascicle/position from initial_position)

**Timeout**: 15s client-side (accounts for 10s Vercel limit + 5s network/retry buffer)
**Input**: `{ book_id: string, fascicle_id: string, language: "TC" | "SC" }`
**Output on SUCCESS**: `{ text: string, fascicle_id: string, chunk_index: number, total_chunks: number }` -> GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(text_timeout)`: CBETA API does not respond within 7s (serverless) -> [recovery: function returns 504 → client retries x1 with 12s timeout → if still fails, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(text_5xx)`: CBETA API returns 5xx -> [recovery: function returns 502 → client retries x1 with 3s backoff → if still fails, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(fascicle_not_found)`: Requested fascicle does not exist -> [recovery: fall back to fascicle 1, retry load -> if fascicle 1 also fails, GO TO ERROR_LOAD_FAILED]
  - `FAILURE(text_parse_error)`: Text content is malformed -> [recovery: log error, attempt to render raw text, GO TO STEP 6 with warning flag]
  - `FAILURE(vercel_timeout)`: Vercel kills function at 10s -> [recovery: client receives 504 → client retries x1 → if still fails, GO TO ERROR_LOAD_FAILED]

**Observable states during this step**:
  - Customer sees: Loading skeleton persists
  - Database: No changes
  - Logs: `[chunk-loader] loading text book_id="..." fascicle="..." timeout=15s client`

### STEP 6: Language Conversion (if needed)
**Actor**: Language Converter (delegates to WORKFLOW-language-toggle)
**Action**: If user preference is Simplified Chinese, convert text from Traditional to Simplified
**Timeout**: 3s (for up to 50,000 characters per chunk)
**Input**: `{ text: string, target_language: "TC" | "SC" }`
**Output on SUCCESS**: `{ converted_text: string, conversion_time_ms: number }` -> GO TO STEP 7
**Output on FAILURE**:
  - `FAILURE(conversion_error)`: Conversion library fails -> [recovery: log error, render original TC text with warning "Simplified conversion unavailable, showing Traditional Chinese", GO TO STEP 7]
  - `FAILURE(conversion_timeout)`: Conversion takes > 3s -> [recovery: render original TC text with warning, GO TO STEP 7]

**Observable states during this step**:
  - Customer sees: Still loading (conversion is fast for typical chunk sizes)
  - Database: No changes

### STEP 7: Text Rendering
**Actor**: Reader UI Component + Text Rendering Engine
**Action**: Apply preferences (font size, font family, line spacing) to text container, insert converted text, render
**Timeout**: 1s (DOM rendering)
**Input**: `{ text: string, preferences: { fontSize: number, fontFamily: string, lineSpacing: number } }`
**Output on SUCCESS**: Text rendered in reader viewport -> GO TO STEP 8
**Output on FAILURE**:
  - `FAILURE(render_oom)`: Text chunk too large for browser memory -> [recovery: split chunk into smaller sub-chunks, render first sub-chunk, GO TO STEP 7]
  - `FAILURE(font_load_error)`: Custom font fails to load -> [recovery: fall back to system default font, log warning, render with fallback]

**Observable states during this step**:
  - Customer sees: Text appears in reader with correct styling
  - Database: No changes

### STEP 8: Restore Reading Position (if applicable)
**Actor**: Session Manager
**Action**: If a saved reading position exists for this book in **IndexedDB**, scroll to that position
**Timeout**: 200ms (IndexedDB read)
**Input**: `{ book_id: string, saved_position: { fascicle_id: string, scroll_offset: number, char_offset: number } }`
**Output on SUCCESS**: Viewport scrolled to saved position -> GO TO STEP 9
**Output on FAILURE**:
  - `FAILURE(no_saved_position)`: No saved position for this book -> [recovery: scroll to top, GO TO STEP 9]
  - `FAILURE(position_invalid)`: Saved position exceeds text length (text changed since last read) -> [recovery: scroll to top, clear invalid position, GO TO STEP 9]

**Observable states during this step**:
  - Customer sees: Text appears, then scrolls to previous position (or stays at top)
  - Database: No changes (reading from IndexedDB)

### STEP 9: Cache Text in IndexedDB (if fetched from network)
**Actor**: Text Chunk Loader
**Action**: If text was fetched from CBETA (not from cache), store parsed text in IndexedDB for future visits
**Timeout**: 500ms
**Input**: `{ book_id: string, fascicle_id: string, text: string, parsed_paragraphs: array }`
**Output on SUCCESS**: `{ cached: true }` -> GO TO STEP 10
**Output on FAILURE**:
  - `FAILURE(storage_full)`: IndexedDB quota exceeded -> [recovery: evict least-recently-used text, retry once; if still fails, log warning, continue without caching]

**Observable states during this step**:
  - Customer sees: No visible change
  - Logs: `[chunk-loader] cached text in IndexedDB book_id="..." fascicle="..."`

### STEP 10: Reader Active — Enable Interactions
**Actor**: Reader UI Component
**Action**: Remove loading state, enable scroll, enable controls (bookmark, preferences, language toggle, navigation), activate scroll-based chunk loading
**Timeout**: N/A
**Input**: Rendered text in viewport
**Output on SUCCESS**: Reader fully interactive -> WORKFLOW COMPLETE (ongoing state)
**Output on FAILURE**: N/A

**Observable states during this step**:
  - Customer sees: Full reader UI — text, header with title/controls, scroll enabled, bookmark button active
  - Database: No changes

---

### ERROR_LOAD_FAILED
**Triggered by**: STEP 4, STEP 5 failures after retries exhausted
**Actions**:
  1. Display error page: "Unable to load this text. The service may be temporarily unavailable."
  2. Show retry button
  3. Show "Return to search" link
  4. If IndexedDB has cached version, offer "Show cached version" button
**What customer sees**: Error page with retry and navigation options
**What operator sees**: Error logged with book_id, error type, duration, retry count

### ERROR_BOOK_NOT_FOUND
**Triggered by**: STEP 4 CBETA 404
**Actions**:
  1. Display: "This text could not be found. It may have been removed or the identifier is incorrect."
  2. Show "Return to search" link
  3. If this book was in the user's bookmarks, mark the bookmark as stale
**What customer sees**: Book not found page
**What operator sees**: 404 event logged with book_id

---

## State Transitions
```
[idle] -> (book_id resolved) -> [initializing]
[initializing] -> (IndexedDB cache hit) -> [rendering]
[initializing] -> (IndexedDB cache miss) -> [loading_metadata]
[loading_metadata] -> (metadata loaded) -> [loading_text]
[loading_text] -> (text chunk loaded) -> [converting] (if SC) or [rendering] (if TC)
[converting] -> (conversion done) -> [rendering]
[rendering] -> (render complete) -> [restoring_position]
[restoring_position] -> (position restored or defaulted) -> [active]
[loading_text] -> (load failure) -> [error]
[error] -> (user clicks retry) -> [loading_text]
[error] -> (user clicks back) -> [idle]
[active] -> (user navigates to different fascicle) -> [loading_text]
[active] -> (user closes book) -> [idle]
```

## Handoff Contracts

### Reader UI → Serverless Proxy Function (Metadata)
**Endpoint**: `GET /api/cbeta/work/{book_id}/metadata`
**Success response**:
```json
{
  "ok": true,
  "data": {
    "id": "string — CBETA work ID",
    "title": "string — Book title in TC",
    "author": "string | null",
    "translator": "string | null",
    "fascicles": [
      { "id": "string", "title": "string", "char_count": "number" }
    ],
    "total_chars": "number"
  }
}
```
**Failure response**:
```json
{
  "ok": false,
  "error": "string",
  "code": "BOOK_NOT_FOUND | METADATA_TIMEOUT | METADATA_SERVICE_ERROR | METADATA_PARSE_ERROR | VERCEL_TIMEOUT",
  "retryable": "boolean"
}
```
**Timeout**: 12s (client-side)
**Cache headers**: `Cache-Control: public, max-age=86400`

### Reader UI → Text Chunk Loader
**Endpoint**: Internal function call or `GET /api/cbeta/work/{book_id}/{fascicle_id}`
**Payload**: `{ book_id, fascicle_id, language }`
**Success response**:
```json
{
  "ok": true,
  "data": {
    "text": "string — Raw text content (may contain CBETA markup)",
    "fascicle_id": "string",
    "chunk_index": "number",
    "total_chunks": "number",
    "language": "TC"
  }
}
```
**Timeout**: 17s (client-side, accounts for 10s Vercel limit + 7s network/retry)

### Client-Side Retry Contract (for vercel_timeout)
**Trigger**: Client receives HTTP 504 from any `/api/cbeta/*` endpoint
**Action**: Retry the same request after 1s backoff (function likely warm on retry)
**Max retries**: 1
**If retry also fails**: Show ERROR_LOAD_FAILED

### Text Chunk Loader → IndexedDB
**Store**: `buddha-reader` / `text-cache`
**Key**: `{bookId}:{fascicleId}`
**Value**: `{ paragraphs: array, charCount: number, lineRefs: array, cachedAt: timestamp }`
**TTL**: 7 days (checked on read)
**Eviction**: LRU, max 20 texts

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Loading skeleton UI | STEP 2 | STEP 10 or ERROR_LOAD_FAILED | DOM removal |
| In-flight metadata request | STEP 4 | User navigates away | AbortController.abort() |
| In-flight text request | STEP 5 | User navigates away | AbortController.abort() |
| Partially rendered text | STEP 7 | User navigates away | DOM clear |
| Conversion intermediate buffer | STEP 6 | STEP 7 complete | GC (JavaScript) |
| IndexedDB text cache entry | STEP 9 | TTL expiry (7 days) or LRU eviction | IndexedDB.delete() |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — TC, no saved position | Valid book_id, TC preference, first visit | Text renders at top with TC text |
| TC-02: Happy path — SC, no saved position | Valid book_id, SC preference, first visit | Text renders at top with SC-converted text |
| TC-03: Happy path — with saved position | Valid book_id, saved position in IndexedDB | Text renders and scrolls to saved position |
| TC-04: Missing book_id | No book_id in URL | Redirect to /search |
| TC-05: Book not found (404) | CBETA returns 404 for book_id | Book not found page shown |
| TC-06: Metadata timeout | CBETA metadata API > 7s | Serverless function returns 504, client retries once, then error page |
| TC-07: Text load timeout | CBETA text API > 7s | Serverless function returns 504, client retries once, then error page |
| TC-08: SC conversion failure | Conversion library throws error | TC text shown with warning banner |
| TC-09: SC conversion timeout | Conversion > 3s | TC text shown with warning banner |
| TC-10: Font load failure | Custom font CDN unreachable | System fallback font used |
| TC-11: Saved position invalid | Saved scroll_offset > text height | Scroll to top, position cleared |
| TC-12: Preferences corrupt | localStorage contains invalid JSON | Default preferences used, warning logged |
| TC-13: User navigates away during load | User clicks back while loading | In-flight requests aborted, no memory leak |
| TC-14: Very large fascicle (100K+ chars) | Fascicle with 100K+ characters | Text renders (may be split into sub-chunks) |
| TC-15: Offline on initial load | No network, no IndexedDB cache | Error page with offline message |
| TC-16: IndexedDB cache hit (return visit) | Re-open a previously-read book | Text renders in < 100ms from IndexedDB, no network call |
| TC-17: IndexedDB cache stale (7+ days old) | Re-open book after 7+ days | Cached text shown immediately, revalidation in background |
| TC-18: Vercel 10s timeout on text fetch | CBETA takes > 7s, function killed at 10s | Client receives 504, retries once, shows error if retry fails |
| TC-19: Cold start on first text load | First text load after 5+ min idle | Loading skeleton shown for 1-3s, then text appears |
| TC-20: IndexedDB quota exceeded | Cache 21st text | Oldest text evicted, new text cached |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | CBETA API provides a metadata endpoint separate from text content | Not verified — API not inspected | May need to fetch text to get metadata, increasing load time |
| A2 | CBETA text content is plain text or simple markup (not images/PDFs) | Not verified | Rendering approach would need complete redesign |
| A3 | Text chunks are divided by fascicle (chapter) boundaries | CBETA convention, not verified | Chunking strategy may need adjustment |
| A4 | 50,000 characters per chunk is a reasonable maximum for SC conversion | Performance estimate, not verified | Conversion may timeout on larger chunks |
| A5 | Browser can render 100K+ characters in a single DOM node without OOM | Browser capability, not verified | May need virtual scrolling for very large texts |
| A6 | Reading position can be represented as (fascicle_id, scroll_offset, char_offset) | Design decision | May not be sufficient for all use cases |
| A7 | IndexedDB text cache with 7-day TTL is sufficient for reading patterns | Design decision | Users who read slowly may find cache expired |
| A8 | 7s timeout for CBETA call within serverless function is sufficient | Estimate | If CBETA is slower, function will be killed at 10s |

## Open Questions
- What markup format does CBETA return? (XML, HTML, plain text with markers?)
- Does CBETA provide fascicle-level endpoints or only full-text?
- Should the reader support multiple books open in tabs?
- Should there be a "table of contents" sidebar showing all fascicles?
- What is the expected maximum fascicle size?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created | — |
| 2026-04-05 | Serverless revision — Redis/PostgreSQL removed, IndexedDB cache added, serverless proxy with 10s timeout, client-side retry, cold start analysis | Updated all steps, added STEP 3 (IndexedDB check), STEP 9 (cache write), added TC-16 through TC-20 |
