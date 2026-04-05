# WORKFLOW: Preference Management Flow — SERVERLESS
**Version**: 0.2
**Date**: 2026-04-05
**Author**: Workflow Architect
**Status**: Draft
**Implements**: Core Feature — Adjustable font size, font type, line spacing with persistence
**Serverless**: Pure client-side — no server involvement

## Overview
The user adjusts display preferences (font size, font family, line spacing) while reading. Changes are applied immediately to the rendered text and persisted to **localStorage** so they survive page reloads and future visits. Preferences are global (apply to all books) rather than per-book. **This workflow is entirely client-side — no serverless functions, no cold starts, no network calls.**

## Actors
| Actor | Role in this workflow |
|---|---|
| Reader (user) | Adjusts preferences via settings panel |
| Settings UI Component | Displays current values, provides controls (sliders, dropdowns) |
| Preference Store | Holds current preferences in memory, persists to localStorage |
| Text Renderer | Re-renders text with new preferences |
| localStorage | Persistent storage for preferences |

## Prerequisites
- Reader is in `[active]` state (text is rendered and visible)
- Preference Store is initialized (loaded from localStorage or defaults)
- DOM is accessible for re-rendering

## Trigger
User opens the settings panel (via gear icon or keyboard shortcut) and changes one or more preference values.
- Entry point: Settings panel UI controls (slider for font size, dropdown for font family, slider/select for line spacing)

## Serverless Impact
**None.** This workflow is 100% client-side. No cold starts, no timeouts, no network calls. All operations complete in < 100ms.

## Workflow Tree

### STEP 1: Open Settings Panel
**Actor**: Reader (user) + Settings UI Component
**Action**: User clicks settings icon, panel opens showing current values
**Timeout**: 100ms
**Input**: Click event on settings icon
**Output on SUCCESS**: Settings panel rendered with current values -> GO TO STEP 2
**Output on FAILURE**:
  - `FAILURE(panel_render_error)`: Panel fails to render -> [recovery: show inline error "Unable to open settings"]

**Observable states during this step**:
  - Reader sees: Settings panel slides in or appears as overlay
  - Database: No changes
  - Logs: `[Settings] panel opened`

### STEP 2: User Adjusts a Preference
**Actor**: Reader (user) + Settings UI Component
**Action**: User changes a value (e.g., moves font size slider, selects different font)
**Timeout**: N/A (user-driven)
**Input**: `{ preferenceKey: "fontSize" | "fontFamily" | "lineHeight", value: number | string }`
**Output on SUCCESS**: `{ preferenceKey, value, previousValue }` -> GO TO STEP 3
**Output on FAILURE**:
  - `FAILURE(invalid_value)`: Value outside allowed range -> [recovery: clamp to min/max, show visual feedback (e.g., slider snaps to boundary)]

**Observable states during this step**:
  - Reader sees: Control value changes immediately in settings panel
  - Logs: `[Settings] changed fontSize 18 -> 20`

### STEP 3: Validate the New Value
**Actor**: Preference Store
**Action**: Validate the new value against allowed ranges
**Timeout**: 10ms
**Input**: `{ preferenceKey: string, value: number | string }`
**Output on SUCCESS**: `{ valid: true, preferenceKey, value }` -> GO TO STEP 4
**Output on FAILURE**:
  - `FAILURE(out_of_range)`: Value outside min/max -> [recovery: clamp to boundary, log warning]

**Validation rules**:
```
fontSize:    min=12, max=48, step=1, default=18  (px)
fontFamily:  enum=["serif", "sans-serif", "mono", "Noto Serif SC", "Noto Sans SC"], default="serif"
lineHeight:  min=1.0, max=3.0, step=0.1, default=1.8
```

### STEP 4: Apply Preference to Store (in-memory)
**Actor**: Preference Store
**Action**: Update the in-memory preference value, notify subscribers
**Timeout**: 10ms
**Input**: `{ preferenceKey, value }`
**Output on SUCCESS**: `{ store: updated }` -> GO TO STEP 5
**Output on FAILURE**: None (in-memory update is infallible)

**Observable states during this step**:
  - Reader sees: No visible change yet (text re-render happens in next step)
  - Logs: `[PrefsStore] updated fontSize=20`

### STEP 5: Re-render Text with New Preferences
**Actor**: Text Renderer
**Action**: Apply new CSS styles to the rendered text, re-calculate pagination if needed
**Timeout**: 500ms
**Input**: `{ preferences: { fontSize, fontFamily, lineHeight }, currentText: string }`
**Output on SUCCESS**: Text re-rendered with new styles -> GO TO STEP 6
**Output on FAILURE**:
  - `FAILURE(render_error)`: Font fails to load or CSS fails to apply -> [recovery: revert to previous value, show "This font could not be loaded. Using fallback."]
  - `FAILURE(pagination_recalc_error)`: Pagination cannot be recalculated -> [recovery: apply styles without re-paginating, may cause layout issues but text remains readable]

**Observable states during this step**:
  - Reader sees: Text size/font/spacing changes in real-time (or brief flash if font needs loading)
  - Database: No changes
  - Logs: `[Renderer] re-rendered with fontSize=20 fontFamily="serif" lineHeight=2.0`

**⚠️ TIMING ASSUMPTION**: Font loading (for web fonts like Noto Serif SC) may take 1-3s on first use. The browser's Font Loading API should be used to detect when the font is ready before declaring the render complete.

### STEP 6: Persist to localStorage
**Actor**: Preference Store
**Action**: Write updated preferences to localStorage
**Timeout**: 50ms
**Input**: `{ fontSize, fontFamily, lineHeight, language }` (full preferences object)
**Output on SUCCESS**: `{ persisted: true }` -> GO TO STEP 7
**Output on FAILURE**:
  - `FAILURE(storage_unavailable)`: localStorage disabled or blocked -> [recovery: show non-blocking warning "Preferences will not be saved after closing the browser", continue with in-memory prefs]
  - `FAILURE(storage_full)`: Quota exceeded -> [recovery: this should not happen for prefs alone (~100 bytes); log error, continue]

**Observable states during this step**:
  - Reader sees: No visible change
  - Logs: `[PrefsStore] persisted to localStorage`

### STEP 7: Update Reading Position (if pagination changed)
**Actor**: Session Manager
**Action**: If font size or line spacing changed, the page boundaries may have shifted — recalculate and adjust the saved reading position in **IndexedDB**
**Timeout**: 200ms
**Input**: `{ bookId: string, previousPage: number, newPreferences }`
**Output on SUCCESS**: `{ newPosition: { page, scrollY, characterOffset } }` -> GO TO STEP 8
**Output on SUCCESS (no position change needed)**: `{ positionUnchanged: true }` -> GO TO STEP 8
**Output on FAILURE**:
  - `FAILURE(position_recalc_error)`: Cannot map old position to new pagination -> [recovery: save position as characterOffset (most stable), fall back to page 1 if even that fails]

**Observable states during this step**:
  - Reader sees: No visible change (viewport may shift slightly if page boundaries changed)
  - Logs: `[Session] adjusted position page=15->17 after fontSize change`

### STEP 8: Close Settings Panel (or continue adjusting)
**Actor**: Reader (user) + Settings UI Component
**Action**: User closes panel or continues adjusting more preferences
**Timeout**: N/A (user-driven)
**Input**: Click on close button, click outside panel, or another preference change
**Output on SUCCESS (close)**: Settings panel hidden, reader returns to full reading view
**Output on SUCCESS (continue)**: GO TO STEP 2 (adjust another preference)

**Observable states during this step**:
  - Reader sees: Settings panel closes, full text visible
  - Logs: `[Settings] panel closed`

## State Transitions
```
[closed] -> (user opens settings) -> [panel_open]
[panel_open] -> (user changes pref) -> [validating]
[validating] -> (valid) -> [applying]
[validating] -> (invalid) -> [clamped] -> [applying]
[applying] -> (render success) -> [persisting]
[applying] -> (render failure) -> [reverted] -> [panel_open]
[persisting] -> (save success) -> [position_adjusting]
[persisting] -> (save failure) -> [warned] -> [position_adjusting]
[position_adjusting] -> (success) -> [panel_open] or [closed]
[closed] -> (user re-opens) -> [panel_open]
```

## Handoff Contracts

### Settings UI -> Preference Store
**Method**: Internal function call / event
**Payload**:
```
{
  preferenceKey: "fontSize" | "fontFamily" | "lineHeight",
  value: number | string
}
```
**Return**: `{ success: true }` or throws validation error

### Preference Store -> Text Renderer
**Method**: Pub/sub event or reactive update
**Payload**:
```
{
  fontSize: number,
  fontFamily: string,
  lineHeight: number
}
```
**Return**: Render complete or throws render error

### Preference Store -> localStorage
**Method**: `localStorage.setItem("buddha_reader_prefs", JSON.stringify(prefs))`
**Payload**:
```json
{
  "fontSize": 20,
  "fontFamily": "serif",
  "lineHeight": 2.0,
  "language": "tc"
}
```
**Return**: void (or throws QuotaExceededError)

## Cleanup Inventory
| Resource | Created at step | Destroyed by | Destroy method |
|---|---|---|---|
| Settings panel DOM | Step 1 | Step 8 (close) | Remove from DOM |
| Previous preference value | Step 2 | Step 4 (overwrite) | Garbage collected |
| Failed font load attempt | Step 5 | Browser cleanup | N/A |

## Reality Checker Findings
| # | Finding | Severity | Spec section affected | Resolution |
|---|---|---|---|---|
| RC-1 | Font loading for web fonts (Noto) may cause FOIT/FOUT — need font-display strategy | Medium | STEP 5 | Specify `font-display: swap` for web fonts |
| RC-2 | Pagination recalculation on every preference change may be expensive for large texts | Medium | STEP 5, STEP 7 | Consider debouncing pagination recalc or using virtual scroll |
| RC-3 | Character offset is more stable than page number across preference changes | Low | STEP 7 | Prioritize characterOffset as the primary position anchor |

## Test Cases
| Test | Trigger | Expected behavior |
|---|---|---|
| TC-01: Happy path — font size increase | Increase font size from 18 to 24 | Text re-renders larger, prefs saved |
| TC-02: Happy path — font family change | Change font to "Noto Serif SC" | Text re-renders in new font, prefs saved |
| TC-03: Happy path — line spacing change | Increase line height from 1.8 to 2.4 | Text re-renders with more spacing, prefs saved |
| TC-04: Multiple changes at once | Change font size and line height before closing panel | Both changes applied and saved |
| TC-05: Value clamped to max | Set font size to 50 (max is 48) | Value clamped to 48, visual feedback |
| TC-06: Value clamped to min | Set font size to 8 (min is 12) | Value clamped to 12, visual feedback |
| TC-07: Web font loading | Select "Noto Serif SC" for first time | Font loads, text re-renders (may show FOUT) |
| TC-08: Web font fails to load | Font CDN unreachable | Fallback font used, warning shown |
| TC-09: localStorage unavailable | Browser blocks localStorage | Warning shown, prefs work in-memory only |
| TC-10: Position adjustment after font change | Increase font size, check reading position | Position adjusted to maintain place in text |
| TC-11: Position adjustment fails | Cannot map old position to new pagination | Fall back to characterOffset or page 1 |
| TC-12: Rapid preference changes | Quickly toggle font size up and down | Each change applied, final value saved |
| TC-13: Panel open, navigate away | Open settings, then click different book | Panel closes, changes saved, new book loads |
| TC-14: Preferences persist across reload | Change prefs, reload page | Previous prefs loaded and applied |
| TC-15: Pagination recalculation performance | Change font size on a 500-page text | Re-render completes within 500ms (or shows progress) |

## Assumptions
| # | Assumption | Where verified | Risk if wrong |
|---|---|---|---|
| A1 | Preferences are global (not per-book) | Design decision | Medium: if per-book is needed, storage schema changes |
| A2 | localStorage is available and not blocked by browser settings | Browser standard | Low: fallback to in-memory with warning |
| A3 | Font size range 12-48px covers all user needs | UX heuristic | Low: can be adjusted later |
| A4 | Web fonts (Noto Serif SC, Noto Sans SC) are available from a CDN | Not verified — need to confirm font hosting | Medium: if CDN unavailable, need self-hosted fonts |
| A5 | Character offset is a stable position anchor across preference changes | Reasonable assumption for text content | Low: may need verification with CBETA text format |

## Open Questions
- Should preferences be per-book or global? (Spec assumes global)
- Should there be a "reset to defaults" button in the settings panel?
- Should the settings panel support keyboard navigation (arrow keys for sliders)?
- Should there be a preview of font changes before applying?
- What CDN should host the Noto fonts? Google Fonts? Self-hosted?

## Spec vs Reality Audit Log
| Date | Finding | Action taken |
|---|---|---|
| 2026-04-05 | Initial spec created — greenfield project | — |
| 2026-04-05 | Serverless revision — confirmed pure client-side, no changes needed to workflow logic | Updated actor descriptions to reflect localStorage (not server), noted IndexedDB for position storage |
