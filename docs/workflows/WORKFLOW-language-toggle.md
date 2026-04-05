# WORKFLOW: Language Toggle Flow — SERVERLESS
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Toggle between Simplified Chinese and Traditional Chinese
**Serverless**: Pure client-side — no server involvement

## Overview
CBETA provides all texts in Traditional Chinese (TC). Users can toggle between TC and Simplified Chinese (SC) display. When SC is selected, the full text is converted from TC to SC using a client-side translation library (opencc-js). The language preference is persisted to **localStorage** so it survives page reloads. The toggle can be performed at any time while reading, and the conversion must handle texts of arbitrary size efficiently. **This workflow is entirely client-side — no serverless functions, no cold starts, no network calls.**

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (user) | Toggles between TC and SC via UI control |
| Language Toggle UI | Button or switch in the reader toolbar |
| Translation Service (opencc-js) | Converts TC text to SC (client-side library, lazy-loaded) |
| Text Renderer | Re-renders text in the target language |
| Preference Store | Stores and persists the language preference to localStorage |
| Text Cache (IndexedDB) | Stores both TC and SC versions of cached texts |
| Session Manager | May need to adjust reading position after re-render |

## Prerequisites
- Text is loaded and rendered (reader in `[active]` state)
- Translation service (opencc-js) is loaded and initialized (lazy-loaded on first use)
- TC source text is available (either in memory or IndexedDB cache)
- Preference Store is initialized

## Trigger
User clicks the language toggle button (显示 "简/繁" or "TC/SC") in the reader toolbar.
- Entry point: Language toggle button click

## Serverless Impact
**None.** This workflow is 100% client-side. No cold starts, no timeouts, no network calls. The only latency is opencc-js lazy-load (~200-500ms on first use) and conversion time (O(n) where n is character count).

## Workflow Tree

### STEP 1: Capture Toggle Request
**Actor**: Language Toggle UI
**Action**: User clicks toggle button
**Timeout**: N/A (user-driven)
**Input**: Click event
**Output on SUCCESS**: `{ targetLang: "sc" | "tc", currentLang: "tc" | "sc" }` -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(no_text_loaded)`: No text is currently displayed -> [recovery: show "No text is open. Open a book first."]

**Observable states during this step**:
  - Reader sees: Toggle button clicked
  - Logs: `[LangToggle] requested tc -> sc`

### STEP 2: Check if Target Language is Already Available
**Actor**: Text Cache (IndexedDB + in-memory)
**Action**: Check if the converted text for the target language is already cached in IndexedDB or in-memory
**Timeout**: 50ms
**Input**: `{ bookId: string, fascicleId: string, targetLang: "sc" | "tc" }`
**Output on SUCCESS (cache hit)**: `{ convertedText: string, fromCache: true }` -> GO TO STEP 5
**Output on SUCCESS (cache miss)**: `{ bookId: string, fascicleId: string, targetLang }` -> GO TO STEP 3
**Output on SUCCESS (target is TC)**: TC is the source — no conversion needed -> GO TO STEP 5 with original text

**Observable states during this step**:
  - Reader sees: Brief pause or immediate switch (if cached)
  - Logs: `[TextCache] sc version found for bookId="T01n0001"` or `[TextCache] sc version not found`

### STEP 3: Load opencc-js (if not already loaded) + Perform TC → SC Conversion
**Actor**: Translation Service
**Action**: Lazy-load opencc-js (if first toggle), then convert the full TC text to SC using character-level mapping
**Timeout**: 3s for texts ≤500KB; 10s for texts ≤5MB
**Input**: `{ text: string, direction: "tc-to-sc" }`
**Output on SUCCESS**: `{ convertedText: string, charCount: number, conversionTime: number }` -> GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(conversion_error)`: Translation library throws -> [recovery: show "Language conversion failed. Displaying Traditional Chinese.", revert toggle button to TC]
  - `FAILURE(timeout)`: Conversion exceeds timeout -> [recovery: show "Conversion is taking longer than expected. Please wait or try again.", if still not done after 2x timeout, fall back to TC]
  - `FAILURE(empty_text)`: Source text is empty -> [recovery: show "No text to convert."]
  - `FAILURE(opencc_load_error)`: opencc-js fails to lazy-load -> [recovery: show "Language conversion library failed to load. Displaying Traditional Chinese.", revert toggle to TC]

**Observable states during this step**:
  - Reader sees: Loading indicator in the text area (e.g., "Converting to Simplified Chinese...")
  - Database: No changes
  - Logs: `[Translation] converting tc->sc bookId="T01n0001" size=245KB` then `[Translation] complete in 1.2s`

**⚠️ TIMING ASSUMPTION**: Character-level TC→SC conversion is O(n) where n is the character count. For a 5MB text (~1.5M Chinese characters), this may take 2-5s in JavaScript. The conversion should run in a Web Worker to avoid blocking the main thread.

### STEP 4: Cache the Converted Text
**Actor**: Text Cache (IndexedDB)
**Action**: Store the SC version in IndexedDB alongside the TC version
**Timeout**: 500ms
**Input**: `{ bookId: string, fascicleId: string, text: string, language: "sc" }`
**Output on SUCCESS**: `{ cached: true }` -> GO TO STEP 5
**Output on FAILURE**:
  - `FAILURE(storage_full)`: IndexedDB quota exceeded -> [recovery: evict least-recently-used book's SC version, retry once]

**Observable states during this step**:
  - Reader sees: Still showing loading indicator
  - Logs: `[TextCache] stored sc version bookId="T01n0001" fascicle="001" size=240KB`

### STEP 5: Re-render Text in Target Language
**Actor**: Text Renderer
**Action**: Replace the displayed text with the target language version, apply current preferences
**Timeout**: 300ms
**Input**: `{ text: string, preferences: { fontSize, fontFamily, lineHeight }, language: "sc" | "tc" }`
**Output on SUCCESS**: Text re-rendered in target language -> GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(render_error)`: DOM update fails -> [recovery: show "Unable to update display. Please refresh the page."]

**Observable states during this step**:
  - Reader sees: Text switches from TC to SC (or vice versa)
  - Database: No changes
  - Logs: `[Renderer] re-rendered language=sc bookId="T01n0001"`

### STEP 6: Update Language Preference
**Actor**: Preference Store
**Action**: Update the stored language preference
**Timeout**: 10ms (in-memory)
**Input**: `{ language: "sc" | "tc" }`
**Output on SUCCESS**: `{ store: updated }` -> GO TO STEP 7
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: Toggle button reflects new state (e.g., shows "繁" when in SC mode)
  - Logs: `[PrefsStore] updated language=sc`

### STEP 7: Persist Language Preference
**Actor**: Preference Store
**Action**: Write full preferences (including new language) to localStorage
**Timeout**: 50ms
**Input**: `{ fontSize, fontFamily, lineHeight, language }`
**Output on SUCCESS**: `{ persisted: true }` -> GO TO STEP 8
**Output on FAILURE**:
  - `FAILURE(storage_unavailable)`: localStorage disabled -> [recovery: continue with in-memory prefs, show non-blocking warning]

### STEP 8: Adjust Reading Position (if needed)
**Actor**: Session Manager
**Action**: SC and TC texts have the same character count (1:1 mapping), so position should remain stable. Verify and adjust if needed.
**Timeout**: 100ms
**Input**: `{ bookId: string, currentPosition: { page, scrollY, characterOffset } }`
**Output on SUCCESS**: Position confirmed or adjusted -> GO TO STEP 9
**Output on FAILURE**:
  - `FAILURE(position_mismatch)`: Character offset no longer valid -> [recovery: use page number as fallback, or go to top of text]

**Observable states during this step**:
  - Reader sees: Viewport stays at approximately the same position
  - Logs: `[Session] position stable after language toggle bookId="T01n0001"`

### STEP 9: Update Toggle Button State
**Actor**: Language Toggle UI
**Action**: Update the toggle button to reflect the current language
**Timeout**: 50ms
**Input**: `{ currentLang: "sc" | "tc" }`
**Output on SUCCESS**: Button shows correct label
**Output on FAILURE**: None

**Observable states during this step**:
  - Reader sees: Toggle button now shows the opposite language (e.g., "繁" meaning "switch to Traditional")
  - Logs: `[LangToggle] button updated to show "繁"`

## State Transitions
```
[tc_displayed] -> (user toggles to SC) -> [converting]
[converting] -> (conversion success) -> [sc_rendering]
[converting] -> (conversion failure) -> [tc_displayed] (reverted)
[sc_rendering] -> (render success) -> [sc_displayed]
[sc_displayed] -> (user toggles to TC) -> [tc_displayed] (instant — source text)
[sc_displayed] -> (user toggles to SC again) -> [sc_displayed] (instant — cached)
[tc_displayed] -> (no text loaded) -> [idle]
```

## Handoff Contracts

### Language Toggle UI -> Translation Service
**Method**: Internal function call (preferably via Web Worker)
**Payload**:
```
{
  text: string,           // full TC text
  direction: "tc-to-sc"   // or "sc-to-tc" (rare, only if user pastes SC text)
}
```
**Success response**:
```
{
  convertedText: string,
  charCount: number,
  conversionTime: number  // ms
}
```
**Failure response**:
```
{
  error: "string",
  code: "CONVERSION_ERROR | TIMEOUT | EMPTY_TEXT | OPENCC_LOAD_ERROR",
  retryable: boolean
}
```
**Timeout**: 3s (≤500KB) / 10s (≤5MB)

### Translation Service -> Web Worker (implementation detail)
**Contract**: The translation service should offload conversion to a Web Worker to avoid blocking the main thread. The worker receives the text as a message and returns the converted text.

### Preference Store -> localStorage
**Method**: `localStorage.setItem("buddha_reader_prefs", JSON.stringify(prefs))`
**Payload**: Same as Preference Management Flow

### Text Cache -> IndexedDB
**Store**: `buddha-reader` / `text-cache`
**Key**: `{bookId}:{fascicleId}:{language}` (e.g., `T0235:001:sc`)
**Value**: `{ convertedText: string, charCount: number, cachedAt: timestamp }`
**TTL**: 7 days (same as TC cache)

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Loading indicator | Step 3 | Step 5 (render complete) or failure | Remove from DOM |
| Web Worker instance | Step 3 (if created) | Component unmount or conversion complete | worker.terminate() |
| SC text cache entry (IndexedDB) | Step 4 | Cache eviction (LRU) or TTL expiry (7 days) | IndexedDB.delete() |
| Previous TC DOM nodes | Step 5 | DOM replacement | Garbage collected |

## Reality Checker Findings
| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | TC→SC conversion is mostly 1:1 but some TC characters map to multiple SC characters (and vice versa) — character offset may drift slightly | Medium | STEP 8 | Character offset may need tolerance window (±5 chars) |
| RC-2 | OpenCC or similar library adds ~200-500KB to bundle size | Low | Prerequisites | Lazy-loading already specified — only loaded on first toggle |
| RC-3 | Some Buddhist-specific terms may have non-standard TC→SC mappings | Medium | STEP 3 | May need custom dictionary for Buddhist terminology |
| RC-4 | Converting on every toggle is wasteful — caching is essential | Low | STEP 2 | Already addressed in spec via cache check (IndexedDB) |

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — TC to SC | Toggle from TC to SC, text loaded | Text converts and displays in SC within 3s |
| TC-02: Happy path — SC to TC | Toggle from SC back to TC | Text switches instantly (source text) |
| TC-03: Cached SC version | Toggle to SC, then to TC, then to SC again | SC displays instantly from IndexedDB cache |
| TC-04: Large text conversion | Toggle SC on a 2MB text | Conversion completes within 10s, no UI freeze |
| TC-05: Conversion failure | Translation library errors | TC text remains displayed, error shown |
| TC-06: Conversion timeout | Very large text (>5MB) | Timeout message, fallback to TC |
| TC-07: No text loaded | Toggle language with no book open | "No text is open" message |
| TC-08: Preference persistence | Toggle to SC, reload page | SC displayed on reload |
| TC-09: Position stability | Toggle language mid-text | Viewport stays at same position |
| TC-10: Position drift correction | Toggle causes character offset mismatch | Position adjusted within tolerance |
| TC-11: Rapid toggling | Toggle TC↔SC rapidly | Each toggle processed, no race conditions |
| TC-12: Web Worker isolation | Conversion runs in Web Worker | Main thread remains responsive during conversion |
| TC-13: Empty text conversion | Toggle on empty book | "No text to convert" message |
| TC-14: Cache eviction during SC display | SC version evicted from cache, toggle away and back | Re-conversion triggered, not an error |
| TC-15: opencc-js lazy-load failure | Network error during opencc-js download | TC text remains displayed, error shown |

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | TC→SC conversion is reversible (SC→TC) with acceptable accuracy | Not verified — depends on library | Medium: SC→TC may lose information |
| A2 | OpenCC or equivalent library is available for browser use | Not verified | Medium: may need to bundle or find alternative |
| A3 | Web Workers are supported in target browsers | Modern browser standard | Low: fallback to main thread with progress indicator |
| A4 | Character count is preserved between TC and SC (1:1 mapping) | Mostly true, but exceptions exist | Medium: position adjustment may need tolerance |
| A5 | Buddhist terminology has standard TC→SC mappings | Not verified — may need custom dictionary | Low: most terms convert correctly with standard mapping |
| A6 | Translation library can be lazy-loaded to reduce initial bundle | Design decision | Low: adds complexity but improves initial load |
| A7 | IndexedDB can store both TC and SC versions without exceeding quota | Storage estimate: ~20 texts × 2 langs × 250KB = ~10MB | Low: well within browser limits |

## Open Questions
- Which TC→SC conversion library should be used? (OpenCC-wasm? custom mapping?)
- Should the conversion library be lazy-loaded or included in the initial bundle?
- Are there Buddhist-specific terms that need custom TC→SC mappings?
- Should the toggle show a progress indicator for large texts, or a loading overlay?
- Should SC→TC conversion also be supported (in case users paste SC text)?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — greenfield project | — |
| 2026-04-05 | Serverless revision — confirmed pure client-side, added IndexedDB SC cache, added opencc-js lazy-load failure handling | Updated STEP 2/4 to use IndexedDB, added TC-15, added A7 |
