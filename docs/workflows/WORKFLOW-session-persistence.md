# WORKFLOW: Session/Persistence Flow — SERVERLESS
**Version**: 0.3
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Session state persistence, restoration, and lifecycle management
**Serverless**: Pure client-side — no server involvement in v1.0

## Overview
This workflow manages the persistence and restoration of all user state across visits: reading positions for each book, display preferences, bookmarks, and the last-viewed book. It handles app initialization (loading saved state), ongoing state updates (debounced saves), and cleanup (tab close, navigation away). The goal is a seamless experience where users return to exactly where they left off with their preferred display settings. **This workflow is entirely client-side — no serverless functions, no cold starts, no network calls, no server-side database.**

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (user) | Opens, uses, and closes the application |
| Session Manager | Orchestrates all persistence operations |
| Preference Store | Provides and receives preference data |
| Bookmark Store | Provides and receives bookmark data |
| Reader UI | Reports reading position changes |
| localStorage | Persistent storage for preferences and small session data |
| IndexedDB | Persistent storage for bookmarks, reading positions, and text cache |
| Browser (window/tab lifecycle) | Fires beforeunload, visibilitychange, and storage events |

## Prerequisites
- Browser storage APIs (localStorage, IndexedDB) are available
- **No server-side session** — this is a client-only application in v1.0
- All stores (Preference Store, Bookmark Store) are initialized before Session Manager runs

## Trigger
- **App load**: User opens the website (first visit or return visit)
- **Ongoing**: User interacts with the reader (scrolls, changes preferences, adds bookmarks)
- **App unload**: User closes the tab, navigates away, or the browser suspends the tab

## Serverless Impact
**None.** This workflow is 100% client-side. All storage operations are local. No cold starts, no timeouts, no network calls. The only latency is IndexedDB open/read/write operations (typically 10-200ms).

## Workflow Tree

### === PHASE A: App Initialization ===

### STEP A1: Detect First Visit vs. Return Visit
**Actor**: Session Manager
**Action**: Check localStorage for a session marker
**Timeout**: 50ms
**Input**: None
**Output on SUCCESS (first visit)**: `{ sessionType: "fresh" }` -> GO TO STEP A2a
**Output on SUCCESS (return visit)**: `{ sessionType: "return", lastVisit: number }` -> GO TO STEP A2b
**Output on FAILURE**:
  - `FAILURE(storage_unavailable)`: localStorage cannot be read -> [recovery: treat as fresh visit, show warning "Session data cannot be loaded"]

**Observable states during this step**:
  - Reader sees: Loading screen or splash
  - Logs: `[Session] first visit detected` or `[Session] return visit, lastVisit=2026-04-04T15:30:00Z`

### STEP A2a: Initialize Fresh Session
**Actor**: Session Manager
**Action**: Set up default session state, no restoration needed
**Timeout**: 50ms
**Input**: None
**Output on SUCCESS**: `{ session: { type: "fresh", preferences: defaults, bookmarks: [], lastBook: null } }` -> GO TO STEP A3
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: Homepage or search page with default settings
  - Logs: `[Session] initialized fresh session`

### STEP A2b: Restore Saved Session
**Actor**: Session Manager
**Action**: Load all persisted state from storage (localStorage for prefs/session, IndexedDB for bookmarks and reading positions)
**Timeout**: 500ms (total for all storage reads)
**Input**: None (reads from localStorage and IndexedDB)
**Output on SUCCESS**:
```
{
  session: {
    type: "return",
    preferences: { fontSize, fontFamily, lineHeight, language },
    bookmarks: Bookmark[],
    lastBook: { bookId, title, position: { page, scrollY, characterOffset }, timestamp },
    searchHistory: string[]  // optional
  }
}
```
-> GO TO STEP A3

**Output on FAILURE**:
  - `FAILURE(partial_restore)`: Some data restored, some failed -> [recovery: restore what is available, log which parts failed, continue]
  - `FAILURE(full_restore_failure)`: All storage reads fail -> [recovery: treat as fresh visit, log error]
  - `FAILURE(corrupted_data)`: Stored data is malformed (invalid JSON, schema mismatch) -> [recovery: discard corrupted data, treat as fresh visit for that component, log error]

**Observable states during this step**:
  - Reader sees: Loading screen (slightly longer than fresh visit)
  - Logs: `[Session] restored prefs, 12 bookmarks, lastBook="T01n0001" page=15`

### STEP A3: Validate Restored Data
**Actor**: Session Manager
**Action**: Validate all restored data against current schemas
**Timeout**: 100ms
**Input**: `{ preferences, bookmarks, lastBook }`
**Output on SUCCESS**: `{ valid: true }` -> GO TO STEP A4
**Output on FAILURE**:
  - `FAILURE(invalid_preferences)`: Preferences have invalid values -> [recovery: use defaults for invalid fields, log warning]
  - `FAILURE(invalid_bookmarks)`: Some bookmarks have invalid data -> [recovery: discard invalid bookmarks, keep valid ones, log warning]
  - `FAILURE(invalid_lastBook)`: lastBook references non-existent or invalid data -> [recovery: clear lastBook, log warning]

**Validation rules**:
```
preferences:
  fontSize: number, 12-48
  fontFamily: string, must be in allowed list
  lineHeight: number, 1.0-3.0
  language: "tc" | "sc"

bookmarks:
  each bookmark must have: id, bookId, bookTitle, page, characterOffset, createdAt

lastBook:
  must have: bookId, title, position (page >= 1, characterOffset >= 0)
```

### STEP A4: Apply Restored Preferences
**Actor**: Preference Store
**Action**: Set the preference store to the restored (or default) values
**Timeout**: 50ms
**Input**: `{ preferences: { fontSize, fontFamily, lineHeight, language } }`
**Output on SUCCESS**: `{ applied: true }` -> GO TO STEP A5
**Output on FAILURE**: None (defaults used if validation failed)

**Observable states during this step**:
  - Reader sees: No visible change yet (preferences applied before text renders)
  - Logs: `[PrefsStore] applied restored preferences`

### STEP A5: Load Bookmarks into Store
**Actor**: Bookmark Store
**Action**: Load restored bookmarks from IndexedDB into the in-memory collection
**Timeout**: 200ms (IndexedDB read)
**Input**: None (reads from IndexedDB)
**Output on SUCCESS**: `{ loaded: true, count: number }` -> GO TO STEP A6
**Output on FAILURE**: None (empty array if validation failed)

### STEP A6: Determine Initial View
**Actor**: Session Manager
**Action**: Decide what to show the user on load
**Timeout**: 50ms
**Input**: `{ lastBook: { bookId, position } | null, urlPath: string }`
**Output on SUCCESS**:
  - If URL has a specific book path (`/read/:workId/:volume`): Navigate to that book -> HANDOFF to Reading Flow
  - If URL is root (`/`) and lastBook exists: Show homepage with "Continue reading" prompt for lastBook -> GO TO STEP A7
  - If URL is root and no lastBook: Show homepage with search -> GO TO STEP A7
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: Homepage with "Continue reading: {lastBookTitle}" card, or search page
  - Logs: `[Session] determined initial view: homepage with lastBook="T01n0001"`

### STEP A7: App Ready
**Actor**: Session Manager
**Action**: Mark session as active, enable all event listeners
**Timeout**: 50ms
**Input**: None
**Output on SUCCESS**: `{ sessionState: "active" }` -> PHASE B begins
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: Fully interactive application
  - Logs: `[Session] app ready, session active`

---

### === PHASE B: Ongoing State Updates ===

### STEP B1: Listen for Reading Position Changes
**Actor**: Session Manager
**Action**: Register scroll/position change listener on the Reader UI
**Timeout**: N/A (event-driven)
**Input**: Scroll events from Reader UI
**Output on SUCCESS**: Position change detected -> GO TO STEP B2
**Output on FAILURE**: None

### STEP B2: Debounce Position Save
**Actor**: Session Manager
**Action**: On position change, start/restart a 1-second debounce timer
**Timeout**: 1000ms (debounce window)
**Input**: `{ bookId, page, scrollY, characterOffset, timestamp }`
**Output on SUCCESS (debounce fires)**: `{ position: { bookId, page, scrollY, characterOffset, timestamp } }` -> GO TO STEP B3
**Output on SUCCESS (debounce cancelled)**: New position change arrived before timer fired -> restart timer
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: No visible change
  - Logs: `[Session] debounce started for bookId="T01n0001"` or `[Session] debounce fired`

### STEP B3: Save Reading Position to IndexedDB
**Actor**: Session Manager
**Action**: Persist the current reading position to IndexedDB `reading-positions` store
**Timeout**: 100ms
**Input**: `{ bookId, page, scrollY, characterOffset, timestamp }`
**Output on SUCCESS**: `{ persisted: true }` -> remain in PHASE B
**Output on FAILURE**:
  - `FAILURE(storage_error)`: Write fails -> [recovery: log error, retry on next position change]

**Observable states during this step**:
  - Reader sees: No visible change
  - Logs: `[Session] saved position bookId="T01n0001" page=16`

### STEP B4: Listen for Preference Changes
**Actor**: Session Manager
**Action**: Subscribe to Preference Store updates
**Timeout**: N/A (event-driven)
**Input**: Preference change event
**Output on SUCCESS**: Preference changed -> GO TO STEP B5
**Output on FAILURE**: None

### STEP B5: Persist Updated Preferences to localStorage
**Actor**: Preference Store (triggered by Session Manager subscription)
**Action**: Write updated preferences to localStorage
**Timeout**: 50ms
**Input**: `{ preferences: { fontSize, fontFamily, lineHeight, language } }`
**Output on SUCCESS**: `{ persisted: true }` -> remain in PHASE B
**Output on FAILURE**:
  - `FAILURE(storage_error)`: Write fails -> [recovery: log error, preferences remain in memory]

### STEP B6: Listen for Bookmark Changes
**Actor**: Session Manager
**Action**: Subscribe to Bookmark Store updates
**Timeout**: N/A (event-driven)
**Input**: Bookmark add/remove/update event
**Output on SUCCESS**: Bookmark changed -> GO TO STEP B7
**Output on FAILURE**: None

### STEP B7: Persist Updated Bookmarks to IndexedDB
**Actor**: Bookmark Store (triggered by Session Manager subscription)
**Action**: Write updated bookmarks to IndexedDB `bookmarks` store
**Timeout**: 200ms
**Input**: `{ bookmarks: Bookmark[] }` (full collection)
**Output on SUCCESS**: `{ persisted: true }` -> remain in PHASE B
**Output on FAILURE**:
  - `FAILURE(storage_error)`: Write fails -> [recovery: log error, retry on next bookmark change]

---

### === PHASE C: App Unload / Cleanup ===

### STEP C1: Detect App Unload
**Actor**: Browser + Session Manager
**Action**: Listen for `beforeunload`, `visibilitychange` (hidden), and `pagehide` events
**Timeout**: N/A (event-driven)
**Input**: Browser lifecycle event
**Output on SUCCESS**: `{ event: "beforeunload" | "visibilitychange" | "pagehide" }` -> GO TO STEP C2
**Output on FAILURE**: None

**⚠️ TIMING ASSUMPTION**: The `beforeunload` event gives very limited time (~100ms) for synchronous operations. All critical saves should happen before this event (via debounced saves in PHASE B). The unload handler should only flush any pending debounced saves.

### STEP C2: Flush Pending Saves
**Actor**: Session Manager
**Action**: Immediately save any pending debounced position, preferences, or bookmarks
**Timeout**: 100ms (synchronous if possible)
**Input**: Any pending state changes
**Output on SUCCESS**: `{ flushed: true }` -> GO TO STEP C3
**Output on FAILURE**:
  - `FAILURE(time_exceeded)`: Not enough time to complete save -> [recovery: best-effort save; some data may be lost, but debounced saves should have caught most changes]

**Observable states during this step**:
  - Reader sees: Tab closing — no visible feedback
  - Logs: `[Session] flushing pending saves before unload`

### STEP C3: Update Session Marker
**Actor**: Session Manager
**Action**: Write the current timestamp as the last-visit marker
**Timeout**: 50ms (synchronous)
**Input**: `{ lastVisit: number }` (epoch ms)
**Output on SUCCESS**: `{ markerUpdated: true }` -> GO TO STEP C4
**Output on FAILURE**:
  - `FAILURE(storage_error)`: Cannot write marker -> [recovery: next visit will be treated as fresh visit for session detection]

### STEP C4: Clear In-Memory State
**Actor**: Session Manager
**Action**: Clear all in-memory stores (preferences, bookmarks, reading positions)
**Timeout**: 10ms
**Input**: None
**Output on SUCCESS**: `{ cleared: true }` -> Session ends
**Output on FAILURE**: None (browser will reclaim memory anyway)

## State Transitions
```
[fresh] -> (STEP A2a) -> [initialized]
[return] -> (STEP A2b success) -> [restoring]
[return] -> (STEP A2b failure) -> [fresh] (fallback)
[restoring] -> (STEP A3 validation success) -> [applying]
[restoring] -> (STEP A3 partial failure) -> [applying] (with warnings)
[applying] -> (STEP A4-A6 complete) -> [active]
[active] -> (STEP B1-B7 ongoing) -> [active] (state updates)
[active] -> (STEP C1 unload detected) -> [flushing]
[flushing] -> (STEP C2-C4 complete) -> [ended]
[ended] -> (user reopens app) -> [fresh] or [return]
```

## Handoff Contracts

### Session Manager -> localStorage
**Keys used**:
```
"buddha_reader_prefs"         -> { fontSize, fontFamily, lineHeight, language }
"buddha_reader_session"       -> { lastBook: { bookId, title, position, timestamp }, lastVisit }
"buddha_reader_search_history" -> string[] (optional, max 20 entries)
```

### Session Manager -> IndexedDB
**Database**: `buddha-reader`
**Object stores**:
```
"bookmarks"           -> Bookmark[] (keyPath: "id")
"reading-positions"   -> { bookId, page, scrollY, characterOffset, timestamp } (keyPath: "bookId")
"text-cache"          -> { bookId, fascicleId, paragraphs, cachedAt } (keyPath: "bookId:fascicleId")
```

### Reader UI -> Session Manager (position updates)
**Event**: `positionChange`
**Payload**:
```
{
  bookId: string,
  page: number,
  scrollY: number,
  characterOffset: number,
  timestamp: number
}
```

### Preference Store -> Session Manager (preference updates)
**Event**: `preferenceChange`
**Payload**:
```
{
  fontSize: number,
  fontFamily: string,
  lineHeight: number,
  language: "tc" | "sc"
}
```

### Bookmark Store -> Session Manager (bookmark updates)
**Event**: `bookmarkChange`
**Payload**:
```
{
  action: "add" | "remove" | "update",
  bookmark?: Bookmark,
  bookmarks?: Bookmark[]  // full collection for bulk save
}
```

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Debounce timer | STEP B2 | STEP B2 (new event) or STEP C2 (flush) | clearTimeout() |
| Event listeners | STEP A7 | STEP C4 (clear) or browser unload | removeEventListener() |
| In-memory stores | STEP A4-A5 | STEP C4 | Clear arrays/objects |
| Pending save queue | STEP B2-B7 | STEP C2 (flush) | Process and clear queue |
| Stale reading positions | Ongoing | Periodic cleanup (positions older than 90 days) | IndexedDB.delete() |
| Stale text cache entries | Ongoing | Cache eviction (LRU, max 20 texts, TTL 7 days) | IndexedDB.delete() |

## Reality Checker Findings
| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | `beforeunload` event may not fire on mobile browsers (tab suspension) | High | STEP C1-C2 | Use `visibilitychange` as primary signal, `beforeunload` as backup |
| RC-2 | IndexedDB operations are async and cannot complete synchronously during unload | High | STEP C2 | Use synchronous localStorage for critical last-position save; IndexedDB for bookmarks (less time-critical) |
| RC-3 | Multiple tabs open simultaneously may cause race conditions on shared storage | Medium | STEP B3, B5, B7 | Use storage event listeners to detect cross-tab changes, or use BroadcastChannel for coordination |
| RC-4 | Stale data (old reading positions, evicted books) will accumulate over time | Low | Cleanup Inventory | Implement periodic cleanup on app initialization (STEP A3) |

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: First visit — happy path | Open app for the first time | Fresh session, default prefs, homepage shown |
| TC-02: Return visit — full restore | Open app after previous session | Prefs, bookmarks, and last-book prompt restored |
| TC-03: Return visit — partial restore | Some storage data corrupted | Valid data restored, corrupted data discarded with warning |
| TC-04: Return visit — full restore failure | All storage inaccessible | Treated as fresh visit |
| TC-05: Position save on scroll | Scroll through text | Position saved after 1s debounce |
| TC-06: Rapid position changes | Scroll rapidly | Only final position saved (debounce) |
| TC-07: Preference change persistence | Change font size | New preference saved to localStorage |
| TC-08: Bookmark change persistence | Add bookmark | Bookmark saved to IndexedDB |
| TC-09: Tab close — flush pending | Change position, immediately close tab | Pending position saved before unload |
| TC-10: Mobile tab suspension | Switch away from app on mobile | Position saved via visibilitychange |
| TC-11: Multi-tab conflict | Open app in two tabs, change prefs in one | Other tab detects change via storage event |
| TC-12: Corrupted preferences | Manually corrupt localStorage prefs | Defaults used, warning logged |
| TC-13: Corrupted bookmarks | Manually corrupt IndexedDB bookmarks | Invalid bookmarks discarded, valid ones kept |
| TC-14: Stale data cleanup | Open app with 90-day-old reading positions | Old positions cleaned up on init |
| TC-15: Storage quota exceeded | Fill localStorage to capacity | Graceful degradation, warnings shown |
| TC-16: URL with specific book | Navigate to `/read/T0235/001` | Book opens directly, ignoring lastBook |
| TC-17: URL with invalid book | Navigate to `/read/nonexistent/001` | Error shown, fallback to homepage |
| TC-18: Schema migration | Stored prefs use old schema format | Migrated to current schema on load |

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | localStorage and IndexedDB are available in all target browsers | Modern browser standard | Medium: need fallback strategy for restricted environments |
| A2 | 1-second debounce for position save is sufficient | Heuristic | Low: may need tuning based on user behavior |
| A3 | Reading positions older than 90 days can be safely deleted | Design decision | Low: users who return after 90+ days start from page 1 |
| A4 | Text cache limit of 20 texts balances performance with storage | Heuristic | Low: can be adjusted |
| A5 | No server-side session or authentication in v1.0 | ADR-S003 | High: if auth is added later, session architecture changes significantly |
| A6 | Multiple tabs will not cause data corruption (localStorage is synchronous) | Browser behavior | Medium: IndexedDB is async and may have race conditions |
| A7 | Schema versioning is not needed initially (v1 schema) | Design decision | Medium: if schema changes, migration logic needed |

## Open Questions
- Should there be a schema version in stored data to support future migrations?
- Should the app support a "clear all data" option in settings?
- Should reading positions be stored per-book or as a single "last position" record? (Spec: per-book in IndexedDB, plus last-book in localStorage)
- Should there be a limit on search history entries?
- Should the app support importing/exporting all user data (bookmarks, preferences)?
- Should multi-tab coordination use BroadcastChannel or storage events?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — greenfield project | — |
| 2026-04-05 | Serverless revision — confirmed pure client-side, no server involvement | Updated actor descriptions to reflect client-only storage, no changes to workflow logic needed |
