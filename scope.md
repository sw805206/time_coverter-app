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

## Three-Tab Flow

### Tab 1 — Setup
- **Home city:** defaults to system timezone; user can overwrite
- **Date picker:** defaults to today (home city's date); user can change; date is used for DST accuracy
- **Meeting duration:** default 30 min; increments of 30 min; 30 min minimum
- **Availability zone editor:**
  - 24-hour draggable timeline (similar to iPhone Focus / Google Calendar working hours UI)
  - Zones are color-coded: Red, Yellow, Light Green, Dark Green
  - Users can drag zone boundaries, add new zones, remove zones, merge zones
  - No fixed number of zones
  - **Default zones:**

    | Time Range | Color |
    |---|---|
    | 00:00 – 06:29 | Red |
    | 06:30 – 07:59 | Yellow |
    | 08:00 – 09:29 | Light Green |
    | 09:30 – 11:59 | Dark Green |
    | 12:00 – 12:59 | Yellow |
    | 13:00 – 16:29 | Dark Green |
    | 16:30 – 19:29 | Light Green |
    | 19:30 – 21:29 | Yellow |
    | 21:30 – 23:59 | Red |

- **Restart button** — resets entire app to defaults

---

### Tab 2 — Cities
- User adds up to 5 cities (in addition to home city)
- **Numbering:** Home city = 0; added cities = 1, 2, 3, 4, 5
- **Labels:** City name displayed; hover reveals UTC offset
- **Mobile behavior:** If city names no longer fit, display the number only; hover (or tap-and-hold) reveals full city name. Same design applies on web (unlikely needed but consistent)
- **Restart button** — resets entire app to defaults

---

### Tab 3 — Slots
- **Grid view:**
  - Left axis: home city time labels only
  - Starts at current time of home city; spans 24 hours; includes date label for DST accuracy
  - Each added city gets a color-coded column (no time labels repeated)
  - City columns labeled by name (or number on mobile); hover for UTC offset
  - Horizontal scroll for city columns on mobile; time axis stays fixed on left
- **"Next" button:** opens the Recommended Slots panel
- **"Back" button** in Recommended Slots panel: returns to grid view; all settings and cities preserved
- **Restart button** — resets entire app to defaults

---

## Recommended Slots Panel

### Layout
- Header row: city names (same numbering/labeling convention as grid)
- Sections: **Best → Great → Acceptable** (empty sections hidden)
- Each slot row shows: time range (home city time) + one color swatch per city
- Slots within each section sorted: sum descending, then start time ascending

### Slot Generation
- Slots are generated for every possible meeting start time at the selected duration interval (e.g., every 30 min)
- Overlapping slots are listed individually (e.g., 17:00–17:30, 17:30–18:00, 18:00–18:30 are separate entries)

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
Each slot's score = sum of all city scores (including home city = City 0).

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

- User selects a slot from the Recommended Slots panel
- User clicks **"Go to Calendar"**
- App generates an **`.ics` file** for download (works with Google Calendar, Apple Calendar, Outlook, and all major calendar apps)
- No OAuth, no login, no attendee emails — user adds those manually in their calendar app after importing
- User can click **Cancel** at any point to return to the Recommended Slots panel

> **Stretch goal (post-launch):** Google Calendar deep link (requires app registration and OAuth client ID — deferred)

---

## Shareable URL

- Available on Tab 3 (Recommended Slots panel)
- Encodes in the URL: home city, added cities, date, meeting duration, availability zone configuration
- Recipient opens the URL and lands directly on Tab 3 with the full setup pre-loaded
- "Share the app" (Tab 1 URL) is always available from the browser address bar

---

## Restart

- **Restart button** is present on all three tabs
- Resets: home city (back to system timezone), date (back to today), duration (back to 30 min), availability zones (back to default), all added cities (cleared)
- Returns user to Tab 1

---

## Responsive / Mobile Behavior

| Element | Desktop | Mobile |
|---|---|---|
| City labels | Full city name | Number only; tap-and-hold for name |
| UTC offset | Hover | Tap-and-hold |
| Grid scroll | Horizontal scroll if needed | Horizontal scroll; time axis fixed |
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
