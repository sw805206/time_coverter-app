# Style Guide: Timezone Meeting Scheduler

## Theme

**Pure Minimal (Theme D)** — white chrome, black accents, color only in availability zones and slot cells. Clean, flat, no gradients, no shadows.

---

## Typography

- **Font stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` — system font, no external load, feels native on every OS
- **Weights:** 400 (regular) and 500 (medium) only — never 600 or 700
- **Case:** Title Case throughout all UI labels, buttons, and headings

| Role | Size | Weight | Color |
|---|---|---|---|
| Section title | 15px | 500 | #111111 |
| City code (IATA) | 13px | 500 | #111111 |
| Body / field text | 13px | 400 | #111111 |
| Label medium | 11px | 500 | #111111 |
| Secondary text | 11px | 400 | #555555 |
| Muted / hint | 10px | 400 | #888888 |
| Micro (tags, timestamps) | 9px | 400 | #888888 |

---

## Color Tokens

### Chrome

| Token | Hex | Usage |
|---|---|---|
| `--black` | #111111 | Primary text, active tab, primary button fill, checkbox fill, Add City action |
| `--grey-dark` | #555555 | Secondary text, now marker label |
| `--grey-mid` | #888888 | Muted text, secondary button fill, restart button fill, Remove action |
| `--grey-hint` | #AAAAAA | Inactive nav tabs, placeholder text |
| `--border` | #CCCCCC | Field borders, pipe separator |
| `--divider` | #EEEEEE | Row dividers, section borders |
| `--tag-bg` | #F0F0F0 | Tag and badge backgrounds |
| `--page-bg` | #F5F5F5 | Page / app background |
| `--white` | #FFFFFF | Card backgrounds, field backgrounds |

### Availability Zones

| Zone | Background | Text | Usage |
|---|---|---|---|
| Not Available | #FFCDD2 | #B71C1C | Red — blocked time |
| Prefer Not | #FFF9C4 | #7A6200 | Yellow — undesirable |
| Acceptable | #C8E6C9 | #1B5E20 | Light green — ok |
| Normal Hours | #388E3C | #FFFFFF | Dark green — ideal |

### Slot Ranking Dots

| Bucket | Dot Color | Hex |
|---|---|---|
| Best | Dark green | #388E3C |
| Great | Mid green | #81C784 |
| Acceptable | Amber | #F9A825 |

---

## Spacing Scale

All spacing uses multiples of 4px:

`4px · 8px · 12px · 16px · 20px · 24px · 32px`

- **Component internal gaps:** 4px, 8px, 12px
- **Section padding:** 16px, 20px
- **Between sections:** 24px, 32px

---

## Border Radius

| Context | Radius |
|---|---|
| Frame / card | 8px |
| Button / input field | 4px |
| Tag / badge / zone segment | 3px |
| Zone bar top segment (first) | 4px top corners only |
| Zone bar bottom segment (last) | 4px bottom corners only |

---

## Borders

- All borders: `0.5px solid` — lighter than 1px, cleaner feel
- Field border: `0.5px solid #CCCCCC`
- Frame border: `0.5px solid #DADADA`
- Row divider: `0.5px solid #EEEEEE`
- Active tab underline: `1.5px solid #111111`

---

## Components

### Navigation Tabs
- Container: white background, `0.5px solid #EEEEEE` bottom border, `10px 16px` padding
- Active tab: 12px / 500 / #111111, `1.5px solid #111111` bottom underline
- Inactive tab: 12px / 400 / #AAAAAA, no underline
- Restart button: right-aligned in nav, secondary button style (see Buttons)

### Buttons

| Type | Background | Text | Size | Radius | Border |
|---|---|---|---|---|---|
| Primary | #111111 | #FFFFFF | 11px / 500 | 4px | none |
| Secondary / CTA | #888888 | #FFFFFF | 11px / 400 | 4px | none |
| Link style | transparent | #111111 | 11px / 400 | — | underline only |

- All secondary CTAs (Back, Next, Restart, Reset To Default) use the same secondary button style
- No border on any button — solid fill only

### Form Fields
- All fields use `<div>` (not native `<input>`) for pixel-perfect height consistency
- Style: `border: 0.5px solid #CCCCCC; border-radius: 4px; padding: 5px 10px; font-size: 13px; line-height: 1.4; background: #FFFFFF`
- City picker: IATA code 13px/500/#111111, pipe separator `#CCCCCC` with `0 6px` margin, city name 13px/400/#888888

### City IATA Code Tooltip
- On hover over any IATA code: show full city name as CSS tooltip
- Tooltip style: `background: #111111; color: #FFFFFF; font-size: 11px; border-radius: 4px; padding: 4px 8px`
- Implemented with CSS `::after` pseudo-element, no JS required
- Applies everywhere IATA codes appear: Tab 2 column headers, Tab 3 column headers, Tab 3 time range column header

### City Actions (Add / Remove)
- **Add City:** 13px / 500 / #111111 — naked text, no background, no border. Matches city code weight visually
- **Remove:** 13px / 500 / #888888 — naked text, muted to signal destructive action
- No tap target background on either

### Availability Zone Timeline
- Vertical bar, 48px wide
- Each segment: 20px height
- Segments are contiguous — no gaps between zones
- Top corners of first segment: `border-radius: 4px 4px 0 0`
- Bottom corners of last segment: `border-radius: 0 0 4px 4px`
- Time labels: 9px / 400 / #AAAAAA, right-aligned, beside the bar

### Now Marker
- Label: `Now →` — 10px / 500 / #555555
- Position: left of the time labels column, vertically aligned to the current time row
- No line — label only, arrow points right toward the bar

### Tags & Badges

| Tag | Font | Color | Background | Radius | Padding |
|---|---|---|---|---|---|
| Home | 9px / 400 | #888888 | #F0F0F0 | 3px | 2px 5px |
| Best | 10px / 500 | #333333 | #F0F0F0 | 3px | 3px 7px |
| Great | 10px / 500 | #333333 | #F0F0F0 | 3px | 3px 7px |
| Acceptable | 10px / 500 | #333333 | #F0F0F0 | 3px | 3px 7px |

- Best / Great / Acceptable badges include a colored dot (7px circle) before the label
- Dot colors: Best #388E3C · Great #81C784 · Acceptable #F9A825

### Checkbox
- Custom styled — no browser default blue
- Unchecked: `width: 13px; height: 13px; border: 1px solid #888888; border-radius: 2px; background: #FFFFFF`
- Checked: `width: 13px; height: 13px; background: #111111; border-radius: 2px` with white checkmark (`border-left: 1.5px solid #FFFFFF; border-bottom: 1.5px solid #FFFFFF`)

---

## Responsive / Breakpoint

- Single breakpoint: `max-width: 480px`
- Below 480px: city timelines scroll horizontally, column headers show IATA code only (tooltip on tap-and-hold)
- All font sizes, spacing, and component styles remain identical across breakpoints

---

## What This Style Does Not Include

- Gradients
- Drop shadows
- Dark mode
- Custom web fonts (system stack only)
- Animation or transitions (defer to later)
- Per-component hover states beyond tooltip (defer to implementation)
