# Scope: Timezone Meeting Scheduler

## Overview

A web-based, mobile-friendly tool that helps users find the best meeting time across multiple timezones. No login, no backend, no accounts — just a fast, shareable utility anyone can use.

---

## Architecture

- **Frontend only** — HTML / CSS / JavaScript, no server, no database
- **State management** — all state lives in the URL (shareable link) and browser memory (session only)
- **No authentication** — except optional calendar export flow
- **Local folder:** `/Users/swai/sw805206/time_coverter-app`
- **Git repo:** `https://github.com/sw805206/time_coverter-app`

---

## City Data & Timezone Logic

- **City list:** static JSON file shipped with the app, sourced from the OpenFlights open dataset and pre-processed at build time
- **Data shape:** IATA code → city name → IANA timezone ID (e.g. `LAX → Los Angeles → America/Los_Angeles`)
- **Coverage:** ~300–500 major cities with IATA codes; no free-text city entry — user must select from the curated list
- **Timezone math:** native browser `Intl` API — DST-accurate, no external library required
- **City picker format:** `LAX | Los Angeles` (3-letter IATA code first, pipe separator, full city name)
- **Column headers everywhere:** 3-letter IATA code only (e.g. `LAX`, `JFK`, `PVG`) — avoids wrapping on any screen size
- **No city numbering system** — IATA codes serve as the unique identifier on both web and mobile

---

## Three-Tab Flow

### Tab 1 — Setting
- **Home city:** auto-detected from system timezone, pre-selected as `LAX | Los Angeles`; user can override via city picker
- **Date picker:** defaults to today (home city's date); user can change; date drives DST accuracy
- **Meeting duration:** default 30 min; increments of 30 min; 30 min minimum
- **Availability zone editor:**
  - 24-hour draggable vertical timeline (similar to iPhone Focus / Google Calendar working hours UI)
  - Zones are color-coded: Red, Yellow, Light Green, Dark Green
  - Users can drag zone boundaries, add new zones, remove zones, and merge zones
  - No fixed number of zones
  - **Default zones:**

    | Time Range | Color | Label |
    |---|---|---|
    | 00:00 – 06:29 | Red | Not available |
    | 06:30 – 07:59 | Yellow | Prefer not |
    | 08:00 – 09:29 | Light Green | Acceptable |
    | 09:30 – 11:59 | Dark Green | Normal hours |
    | 12:00 – 12:59 | Yellow | Prefer not |
    | 13:00 – 16:29 | Dark Green | Normal hours |
    | 16:30 – 19:29 | Light Green | Acceptable |
    | 19:30 – 21:29 | Yellow | Prefer not |
    | 21:30 – 23:59 | Red | Not available |

- **Legend:** Red = not available · Yellow = prefer not · Light Green = acceptable · Dark Green = normal hours
- **"Reset to default"** link restores the default zone configuration
- **"Next: add cities"** link advances to Tab 2
- **Restart button** — resets entire app to defaults, returns to Tab 1

---

### Tab 2 — Cities
- User adds up to 5 cities in addition to home city (6 total)
- **Home city column:** IATA code bold, city name muted below, small `home` tag beneath
- **Added city columns:** IATA code bold, city name muted below, `− Remove` button
- **`+ Add city` button** opens the city picker (`LAX | Los Angeles` format, autocomplete from static JSON)
- Each city column shows its own vertical color timeline with local times aligned to the home city's "now" line
- A horizontal "now" line runs across all city columns simultaneously
- The subtitle line shows: date · duration · starting time in home city (e.g. `Mon Jun 16 2026 · 30 min · starting 10:15 LAX`)
- **Restart button** — resets entire app to defaults
- **Bottom nav:** `← Back to Setting` and `Select slots →`

---

### Tab 3 — Slots (Recommended)
- **Header:** "Recommended Slots" left-aligned, `share` button right-aligned
- **Column headers:** time range column header shows IATA code + small `home` tag (e.g. `LAX` + `home`); remaining columns show IATA code only (`JFK`, `PVG`)
- **Time range column:** home city local times, format `9:30 – 10:00`; unambiguous start and end
- **Checkbox column:** one checkbox per slot row; user selects preferred slot for calendar scheduling
- **Color cells:** pure color blocks per city, no text inside
- Sections displayed in order: **Best → Great → Acceptable** (empty sections hidden)
- **"Back to cities"** returns to Tab 2 with all settings preserved
- **"Schedule on calendar"** — generates `.ics` file for the selected slot
- **Restart button** — resets entire app to defaults

---

## Recommended Slots Panel

### Slot Generation
- Slots generated for every possible start time at the selected duration interval (e.g. every 30 min)
- Overlapping slots listed individually (e.g. 9:00–9:30, 9:30–10:00, 10:00–10:30 are separate entries)

---

## Scoring & Ranking Logic

### Color Scores
| Color | Score |
|---|---|
| Dark Green | 3 |
| Light Green | 2 |
| Yellow | 1 |
| Red | 0 |

### Step 1 — Exclude
Any slot where at least one city scores 0 (Red) is removed entirely and never shown.

### Step 2 — Score
Each slot's score = sum of all city scores (including home city).

### Step 3 — Sum
Calculate the sum for every remaining slot.

### Step 4 — Classify each slot individually
- Yellow ≥ 1 → **Acceptable**
- Yellow = 0 and Dark Green = 0 → **Great**
- Yellow = 0 and Dark Green ≥ 50% of total cities (including home) → **Best**
- Yellow = 0 and Dark Green > 0 but < 50% of total cities → **Great**

### Step 5 — Sort within each bucket
- Primary: sum descending
- Tiebreaker: start time ascending

### Display order
Best → Great → Acceptable (empty buckets hidden)

---

## Calendar Export

- User selects a slot via checkbox on Tab 3
- User clicks **"Schedule on calendar"**
- App generates an **`.ics` file** for download (compatible with Google Calendar, Apple Calendar, Outlook, and all major calendar apps)
- No OAuth, no login, no attendee emails — user adds those manually in their calendar app after importing
- **Stretch goal (post-launch):** Google Calendar deep link (requires app registration and OAuth client ID — deferred)

---

## Shareable URL

- `share` button on Tab 3
- Encodes in the URL: home city (IATA), added cities (IATA), date, meeting duration, availability zone configuration
- Recipient opens the URL and lands directly on Tab 3 with the full setup pre-loaded
- Sharing the app itself (Tab 1) is always available via the browser address bar

---

## Restart

- **Restart button** present on all three tabs, right-aligned in the top nav
- Resets: home city (back to system timezone), date (back to today), duration (back to 30 min), availability zones (back to default), all added cities (cleared)
- Returns user to Tab 1

---

## UI Design

### Theme
- **Theme D — Pure Minimal:** white chrome, black accents, color only in availability zones and slot cells
- Clean, flat, minimal — no gradients, no shadows

### Color System
| Zone | Color | Hex |
|---|---|---|
| Not available | Red (pastel) | `#FFCDD2` |
| Prefer not | Yellow (pastel) | `#FFF9C4` |
| Acceptable | Light Green (pastel) | `#C8E6C9` |
| Normal hours | Dark Green | `#388E3C` |

### Navigation
- Top nav bar on all tabs: `setting · cities · slots` with active tab underlined; `restart` button right-aligned
- Active tab: black text, 1.5px black underline
- Inactive tabs: muted grey text

### City Display
- **Picker:** `LAX | Los Angeles` — IATA code bold, pipe separator, full city name muted
- **Column headers:** IATA code only (e.g. `LAX`, `JFK`, `PVG`)
- **Home city:** IATA code + city name muted below + small `home` badge
- **No city numbering** anywhere in the UI

### Tab 3 Time Column
- Header: IATA code of home city + small `home` badge below
- Rows: `9:30 – 10:00` format — explicit start and end time, no ambiguity

---

## Responsive / Mobile Behavior

| Element | Desktop | Mobile |
|---|---|---|
| City labels | IATA code only | IATA code only |
| City timeline | Side by side columns | Horizontal scroll |
| Slot panel | Full width | Full width, scrollable |
| Layout | Three tabs | Three tabs |

---

## Out of Scope (for now)
- User accounts or login
- Backend or database
- Per-city availability zones (availability zone is global only)
- Google Calendar OAuth integration
- Attendee email pre-fill
- Recurring meeting support
- More than 5 added cities (6 total including home)
- Free-text city entry (IATA list only)
