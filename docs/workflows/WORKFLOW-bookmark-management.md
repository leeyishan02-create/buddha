# WORKFLOW: Bookmark Management — SERVERLESS v1.0
**Version**: 0.3
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Add bookmarks at specific positions, bookmark list, navigate to bookmark
**Serverless**: v1.0 = pure client-side (IndexedDB); v2.0 = serverless DB sync (Turso/D1)

## Overview
Users can save bookmarks at their current reading position within any text. Bookmarks store the book ID (workId), volume, line reference (CBETA format), paragraph index, and optional user notes. In **v1.0**, bookmarks are stored in **IndexedDB** (per-browser, no cross-device sync, no auth). In **v2.0**, bookmarks sync to a serverless database (Turso/D1) with auth for cross-device access. This spec covers v1.0 with explicit migration notes for v2.0.

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (User) | Adds, views, navigates to, and deletes bookmarks |
| Bookmark UI Component | Bookmark button, bookmark list panel, bookmark context menu |
| Bookmark Store (Zustand) | Manages bookmark CRUD operations with IndexedDB persistence |
| Reader UI Component | Navigates to bookmarked position, highlights bookmark location |
| IndexedDB | Persistent storage for bookmarks (v1.0) |
| **v2.0**: Serverless DB API | `/api/bookmarks` — Turso/D1 CRUD via serverless function |
| **v2.0**: Auth Layer | Validates user session for bookmark operations |

## Prerequisites
- Text is loaded and rendered in the reader (for adding bookmarks)
- Bookmark Store is initialized (loaded from IndexedDB on app init)
- **v1.0: No authentication required** — bookmarks are per-browser
- **v1.0: No server-side API route** — all operations are client-side

## Trigger
- **Add bookmark**: User clicks bookmark button or uses keyboard shortcut (e.g., Ctrl+B)
- **View bookmarks**: User opens bookmark list panel
- **Navigate to bookmark**: User clicks a bookmark in the list
- **Delete bookmark**: User clicks delete/remove on a bookmark entry

## Serverless Impact
| Aspect | v1.0 (Client-Side) | v2.0 (Serverless DB Sync) |
|---|---|---|
| Storage | IndexedDB (per-browser) | Turso/D1 (serverless SQLite, edge-compatible) |
| Auth | None | Required (Clerk / Better-Auth edge) |
| Cross-device sync | No | Yes |
| Cold start | None (instant) | 1-3s on first sync after idle |
| Offline support | Full | Partial (queue changes, sync when online) |
| Data loss risk | High (browser data cleared) | Low (server-side backup) |

## Migration Path (v1.0 → v2.0)
When v2.0 is implemented:
1. Add auth layer (Clerk recommended for edge compatibility)
2. Add serverless `/api/bookmarks` route (Turso/D1 CRUD)
3. On app init: if user is authenticated, merge IndexedDB bookmarks with server bookmarks (server wins on conflict)
4. On bookmark add: save to IndexedDB immediately (optimistic), then sync to server in background
5. On bookmark delete: remove from IndexedDB immediately, sync to server in background
6. Periodic sync: every 30s, push pending IndexedDB changes to server
7. On first auth: migrate all existing IndexedDB bookmarks to server

## Workflow Tree

### === SUB-WORKFLOW: Add Bookmark ===

### STEP A1: Capture Current Position
**Actor**: Bookmark UI Component
**Action**: Read current reading position from Reader UI
**Timeout**: 100ms
**Input**: Current reader state
**Output on SUCCESS**: `{ book_id: string, book_title: string, fascicle_id: string, fascicle_title: string, scroll_offset: number, char_offset: number, line_ref: string, timestamp: string, context_text: string }` -> GO TO STEP A2
**Output on FAILURE**:
  - `FAILURE(no_text_loaded)`: No text is currently displayed -> [recovery: show "Cannot bookmark — no text is open", disable bookmark button]
  - `FAILURE(position_unknown)`: Cannot determine current position -> [recovery: use default position (fascicle start, offset 0), log warning, GO TO STEP A2]

**Observable states during this step**:
  - Customer sees: Brief visual feedback on bookmark button (e.g., button highlights)
  - Database: No changes (yet)
  - Logs: `[bookmark] capturing position book_id="..." fascicle="..." offset=N`

### STEP A2: Validate Bookmark Uniqueness
**Actor**: Bookmark Store
**Action**: Check if a bookmark already exists at approximately the same position (same book + fascicle, within 100 char offset)
**Timeout**: 50ms
**Input**: New bookmark data + existing bookmarks array (from IndexedDB)
**Output on SUCCESS**: No duplicate found -> GO TO STEP A3
**Output on FAILURE**:
  - `FAILURE(duplicate_bookmark)`: Bookmark exists within 100 chars of same position -> [recovery: show "Bookmark already exists at this location", highlight existing bookmark in list, ABORT]

**Observable states during this step**:
  - Customer sees: N/A (fast internal check)
  - Database: No changes
  - Logs: `[bookmark] uniqueness check result=unique|duplicate`

### STEP A3: Create Bookmark Object
**Actor**: Bookmark Store
**Action**: Generate unique bookmark ID, create bookmark object with metadata
**Timeout**: 50ms
**Input**: Position data from STEP A1
**Output on SUCCESS**: `{ id: string (UUID), book_id, book_title, fascicle_id, fascicle_title, scroll_offset, char_offset, line_ref, timestamp, context_text, created_at }` -> GO TO STEP A4
**Output on FAILURE**:
  - `FAILURE(uuid_generation_error)`: Cannot generate unique ID -> [recovery: use timestamp-based ID, log warning, GO TO STEP A4]

**Observable states during this step**:
  - Customer sees: N/A
  - Database: No changes
  - Logs: `[bookmark] bookmark created id="..."`

### STEP A4: Persist Bookmark to IndexedDB
**Actor**: Bookmark Store → IndexedDB
**Action**: Write bookmark to IndexedDB `bookmarks` object store
**Timeout**: 200ms
**Input**: Bookmark object
**Output on SUCCESS**: Bookmark saved to IndexedDB -> GO TO STEP A5
**Output on FAILURE**:
  - `FAILURE(indexeddb_unavailable)`: IndexedDB disabled or blocked -> [recovery: store in memory only, show "Bookmarks will not persist after closing the browser"]
  - `FAILURE(storage_full)`: IndexedDB quota exceeded -> [recovery: show "Storage full. Cannot save bookmark. Consider clearing old bookmarks."]
  - `FAILURE(write_error)`: Write fails for unknown reason -> [recovery: store in memory with "pending" status, retry on next app load]

**Observable states during this step**:
  - Customer sees: Bookmark button shows "saved" state (e.g., filled icon)
  - Database: IndexedDB `bookmarks` store has new entry
  - Logs: `[bookmark] persisted to IndexedDB total_bookmarks=N`

### STEP A5: Confirm to User
**Actor**: Bookmark UI Component
**Action**: Show brief confirmation toast/notification
**Timeout**: 2s (auto-dismiss)
**Input**: Bookmark created successfully
**Output on SUCCESS**: Toast shown for 2s, then auto-dismisses -> WORKFLOW COMPLETE (add)
**Output on FAILURE**: N/A

**Observable states during this step**:
  - Customer sees: "Bookmark saved" toast notification
  - Database: No changes
  - Logs: N/A

---

### === SUB-WORKFLOW: View Bookmarks ===

### STEP B1: Open Bookmark List Panel
**Actor**: Bookmark UI Component
**Action**: Load bookmarks from IndexedDB via Bookmark Store, render list sorted by most recent
**Timeout**: 200ms (IndexedDB read)
**Input**: None
**Output on SUCCESS**: List rendered with bookmark entries -> GO TO STEP B2
**Output on FAILURE**:
  - `FAILURE(store_not_initialized)`: Bookmark Store not ready -> [recovery: initialize store from IndexedDB, retry, if still fails show empty list with "No bookmarks"]
  - `FAILURE(indexeddb_read_error)`: Cannot read from IndexedDB -> [recovery: show "Unable to load bookmarks", offer retry]

**Observable states during this step**:
  - Customer sees: Bookmark list panel opens with entries showing book title, fascicle title, context text snippet, timestamp
  - Database: No changes (read-only)
  - Logs: `[bookmark] list opened count=N`

### STEP B2: Display Bookmark Entries
**Actor**: Bookmark UI Component
**Action**: Render each bookmark with book title, fascicle title, context snippet (first 50 chars from saved position), relative timestamp ("2 hours ago"), and delete button
**Timeout**: N/A (rendering)
**Input**: Sorted bookmarks array
**Output on SUCCESS**: Full list displayed -> WORKFLOW COMPLETE (view)
**Output on FAILURE**:
  - `FAILURE(empty_list)`: No bookmarks exist -> [recovery: show "No bookmarks yet. Open a text and click the bookmark button to save your place."]

**Observable states during this step**:
  - Customer sees: List of bookmark cards or rows, each clickable
  - Database: No changes
  - Logs: N/A

---

### === SUB-WORKFLOW: Navigate to Bookmark ===

### STEP N1: Bookmark Selection
**Actor**: Reader (User) → Bookmark UI Component
**Action**: User clicks a bookmark entry
**Timeout**: N/A (user-driven)
**Input**: `{ bookmark_id: string }`
**Output on SUCCESS**: Bookmark data retrieved -> GO TO STEP N2
**Output on FAILURE**:
  - `FAILURE(bookmark_not_found)`: Bookmark ID no longer exists -> [recovery: refresh list, show "Bookmark no longer exists"]

**Observable states during this step**:
  - Customer sees: Bookmark entry highlights briefly
  - Database: No changes
  - Logs: `[bookmark] navigating to bookmark id="..."`

### STEP N2: Load Target Book (if not already open)
**Actor**: Reader UI Component (delegates to WORKFLOW-text-reading)
**Action**: If the bookmarked book is not currently open, load it
**Timeout**: 15s (full text loading, accounts for serverless cold start)
**Input**: `{ book_id: string, fascicle_id: string }`
**Output on SUCCESS**: Book loaded, target fascicle displayed -> GO TO STEP N3
**Output on FAILURE**:
  - `FAILURE(book_load_failed)`: Text cannot be loaded -> [recovery: show "Unable to open this bookmarked text. It may no longer be available.", offer to delete stale bookmark]
  - `FAILURE(fascicle_not_found)`: Bookmarked fascicle no longer exists -> [recovery: load book with first fascicle, show "The bookmarked chapter is no longer available. Showing the first chapter.", GO TO STEP N3]

**Observable states during this step**:
  - Customer sees: Loading state if book needs to be loaded, or instant transition if already open
  - Database: No changes
  - Logs: `[reader] loading bookmarked book book_id="..."`

### STEP N3: Navigate to Saved Position
**Actor**: Reader UI Component
**Action**: Scroll to saved position, highlight the bookmarked location briefly
**Timeout**: 1s
**Input**: `{ scroll_offset: number, char_offset: number, context_text: string }`
**Output on SUCCESS**: Viewport scrolled to position, brief highlight animation -> GO TO STEP N4
**Output on FAILURE**:
  - `FAILURE(position_out_of_range)`: Saved scroll_offset exceeds current text length (text may have changed) -> [recovery: scroll to top, show "Saved position is no longer valid. Showing from the beginning.", GO TO STEP N4]

**Observable states during this step**:
  - Customer sees: Text scrolls to bookmarked position, brief yellow highlight fades out
  - Database: No changes
  - Logs: `[reader] navigated to bookmark position offset=N`

### STEP N4: Close Bookmark Panel
**Actor**: Bookmark UI Component
**Action**: Close bookmark list panel, return focus to reader
**Timeout**: 200ms
**Input**: Navigation complete
**Output on SUCCESS**: Panel closed, reader focused -> WORKFLOW COMPLETE (navigate)
**Output on FAILURE**: N/A

**Observable states during this step**:
  - Customer sees: Bookmark panel closes, reader returns to full view
  - Database: No changes
  - Logs: `[bookmark] panel closed after navigation`

---

### === SUB-WORKFLOW: Delete Bookmark ===

### STEP D1: Delete Confirmation
**Actor**: Bookmark UI Component
**Action**: User clicks delete button on a bookmark entry
**Timeout**: N/A (user-driven)
**Input**: `{ bookmark_id: string }`
**Output on SUCCESS**: (Optionally confirm) -> GO TO STEP D2
**Output on FAILURE**: N/A

**Observable states during this step**:
  - Customer sees: Delete button clicked, optional confirmation dialog
  - Database: No changes
  - Logs: N/A

### STEP D2: Remove Bookmark from IndexedDB
**Actor**: Bookmark Store → IndexedDB
**Action**: Remove bookmark from IndexedDB `bookmarks` store, update in-memory array
**Timeout**: 200ms
**Input**: `{ bookmark_id: string }`
**Output on SUCCESS**: Bookmark removed from IndexedDB, in-memory array updated -> GO TO STEP D3
**Output on FAILURE**:
  - `FAILURE(bookmark_not_found)`: Bookmark already deleted -> [recovery: no-op, refresh list]
  - `FAILURE(indexeddb_write_error)`: Cannot update IndexedDB -> [recovery: remove from memory only, show warning "Bookmark removed from this session only"]

**Observable states during this step**:
  - Customer sees: Bookmark entry removed from list
  - Database: IndexedDB `bookmarks` store entry deleted
  - Logs: `[bookmark] deleted from IndexedDB id="..." remaining=N`

### STEP D3: Update UI
**Actor**: Bookmark UI Component
**Action**: Refresh bookmark list, close panel if list is now empty
**Timeout**: 100ms
**Input**: Updated bookmarks array
**Output on SUCCESS**: List refreshed or panel closed -> WORKFLOW COMPLETE (delete)
**Output on FAILURE**: N/A

---

## State Transitions

### Bookmark Entity States
```
[pending_save] -> (IndexedDB write success) -> [saved]
[pending_save] -> (IndexedDB write failure) -> [save_failed]
[save_failed] -> (retry success) -> [saved]
[save_failed] -> (retry failure) -> [save_failed] (persistent — user must retry manually)
[saved] -> (user deletes) -> [deleted]
[deleted] -> (terminal)
```

### Bookmark Panel States
```
[closed] -> (user opens) -> [open]
[open] -> (user navigates to bookmark) -> [navigating]
[navigating] -> (navigation complete) -> [closed]
[open] -> (user deletes bookmark) -> [open] (list refreshed)
[open] -> (user closes panel) -> [closed]
```

## Handoff Contracts

### Bookmark UI → Bookmark Store (Add)
**Input**:
```json
{
  "workId": "string — CBETA work ID (e.g., T0235)",
  "volume": "string — volume number (e.g., 001)",
  "lineRef": "string — CBETA line reference (e.g., T01n0235_p0748a10)",
  "paragraphIndex": "number — index within fascicle",
  "title": "string — user-given bookmark name (optional)",
  "note": "string — user annotation (optional)"
}
```
**Success response (optimistic)**:
```json
{
  "ok": true,
  "data": {
    "id": "string — client-generated UUID",
    "status": "saved"
  }
}
```

### Bookmark Store → IndexedDB
**Database**: `buddha-reader`
**Object Store**: `bookmarks`
**Key Path**: `id`
**Operation**: `put(bookmark)` for add, `delete(bookmarkId)` for remove, `getAll()` for list
**Indexes**:
- `by_book`: `workId` (for filtering bookmarks by book)
- `by_created`: `created_at` (for sorting by most recent)

**Schema**:
```typescript
interface Bookmark {
  id: string;              // UUID
  userId: null;            // v1.0: no auth; v2.0: user ID
  workId: string;          // e.g., "T0235"
  volume: string;          // e.g., "001"
  lineRef: string;         // e.g., "T01n0235_p0748a10"
  paragraphIndex: number;
  title: string | null;
  note: string | null;
  createdAt: number;       // epoch ms
  updatedAt: number;       // epoch ms
  syncStatus: "synced";    // v1.0: always "synced"; v2.0: "pending" | "synced" | "failed"
}
```

### v2.0: Bookmark Store → Serverless DB API (future)
**Endpoint**: `POST /api/bookmarks` (serverless function → Turso/D1)
**Headers**: `{ "Authorization": "Bearer {session_token}" }`
**Payload**: Same as v1.0 bookmark object
**Timeout**: 5s
**Cold start**: 1-3s on first call after idle
**Sync strategy**: Optimistic IndexedDB write + background server sync

---

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Toast notification | STEP A5 | Auto-dismiss after 2s | UI timer removal |
| In-memory bookmark object | STEP A3 | STEP A4 (persisted) or ABORT | GC (JavaScript) |
| Bookmark in IndexedDB | STEP A4 | STEP D2 (user delete) | IndexedDB.delete() |
| Highlight animation | STEP N3 | Auto-complete after 1.5s | CSS animation end |
| Stale bookmarks (book no longer exists) | Ongoing | Periodic cleanup on app init | IndexedDB.delete() |

---

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — add bookmark | User clicks bookmark button | Bookmark saved to IndexedDB, toast shown |
| TC-02: Happy path — view bookmarks | User opens bookmark list | List shows all bookmarks from IndexedDB, sorted by most recent |
| TC-03: Happy path — navigate to bookmark (same book) | User clicks bookmark for currently open book | Scrolls to saved position, highlight shown |
| TC-04: Happy path — navigate to bookmark (different book) | User clicks bookmark for different book | Book loads (may have cold start), scrolls to saved position |
| TC-05: Happy path — delete bookmark | User clicks delete on bookmark | Bookmark removed from IndexedDB, removed from list |
| TC-06: IndexedDB unavailable | Browser blocks IndexedDB | Bookmark stored in memory only, warning shown |
| TC-07: IndexedDB quota exceeded | Storage full | Error message shown, bookmark not saved |
| TC-08: Duplicate bookmark | User bookmarks same position twice | Duplicate detected, no second bookmark created |
| TC-09: No text loaded | User tries to bookmark with no text open | "Cannot bookmark" message shown |
| TC-10: Navigate to stale bookmark | Bookmarked work no longer exists | Error shown, offer to delete stale bookmark |
| TC-11: Navigate to missing volume | Bookmarked volume removed | Book loads with first volume, warning shown |
| TC-12: Position out of range | Text changed since bookmark saved | Scroll to top, warning shown |
| TC-13: Empty bookmark list | User opens list with no bookmarks | "No bookmarks yet" message shown |
| TC-14: Rapid bookmark attempts | User clicks bookmark button 5 times rapidly | Only first bookmark saved, subsequent show duplicate or no-op |
| TC-15: Bookmark persists across reload | Add bookmark, reload page | Bookmark still present after reload |
| TC-16: Bookmark with note | Add bookmark with user note | Note saved and displayed in list |
| TC-17: IndexedDB write error on delete | IndexedDB fails during delete | Bookmark removed from memory only, warning shown |

---

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | No authentication required in v1.0 | ADR-S003 | Critical: if auth is needed, entire workflow changes |
| A2 | IndexedDB is available in all target browsers | Modern browser standard | Medium: need fallback strategy for restricted environments |
| A3 | CBETA line references (e.g., T01n0235_p0748a10) are stable identifiers | CBETA convention | Medium: if CBETA changes line ref format, bookmarks break |
| A4 | IndexedDB can handle expected bookmark volume (thousands per user) | IndexedDB capability | Low: well within IndexedDB capacity |
| A5 | 200ms IndexedDB write timeout is sufficient | IndexedDB performance | Low: can be increased if needed |
| A6 | Bookmark titles and work titles are stable between sessions | CBETA assumption | Low: bookmarks may show stale titles if CBETA updates metadata |
| A7 | v2.0 migration from IndexedDB to serverless DB is feasible | Design decision | Medium: migration logic needs careful design |

## Open Questions
- Should bookmarks support tags/categories for organization?
- Should bookmarks be exportable/importable (JSON file)? — **Recommended for v1.0 as data loss mitigation**
- Should there be a "last read" auto-bookmark that updates as the user reads?
- Should bookmark notes support rich text or just plain text?
- Should the export/import feature be in v1.0 or deferred?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — PostgreSQL-based with auth | — |
| 2026-04-05 | Serverless revision — PostgreSQL removed, IndexedDB for v1.0, auth deferred, v2.0 migration path added | Rewrote entire spec: removed auth, removed server API, added IndexedDB handoff, added v2.0 migration notes |
