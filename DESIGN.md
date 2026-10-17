---
version: alpha
name: Asterism
description: Desktop analytics for the GitHub repositories a developer actually tracks, read in short scans between other work.
colors:
  void: "#111111"
  panel: "#1c1c1c"
  raised: "#232323"
  line: "#2e2e2e"
  hairline: "#252525"
  paper: "#ececec"
  mist: "#a3a3a3"
  faint: "#a3a3a3"
  accent: "#d71921"
  accent-strong: "#ef4444"
  ok: "#28c840"
  on-accent: "#ffffff"
typography:
  display:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  title:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body:
    fontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  label:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: 10.5px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.08em
  mono:
    fontFamily: "'Geist Mono Variable', ui-monospace, monospace"
    fontSize: 12.5px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  sm: 8px
  md: 12px
  card: 14px
  pill: 999px
spacing:
  1: 4px
  2: 8px
  3: 12px
  4: 16px
  5: 20px
  6: 24px
  8: 32px
  12: 48px
components:
  rail:
    backgroundColor: "{colors.panel}"
    width: 184px
    collapsedWidth: 64px
  page-bar:
    backgroundColor: "{colors.void}"
    height: 46px
  nav-item:
    textColor: "{colors.mist}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2}"
    height: 32px
  nav-item-selected:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.void}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "{spacing.2}"
  section:
    textColor: "{colors.paper}"
    padding: "{spacing.4}"
  kpi-value:
    textColor: "{colors.paper}"
    typography: "{typography.display}"
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    height: 30px
---

# Asterism design system

## Overview
- Surface: product. Dense desktop analytics, not a marketing surface.
- Audience and job: a developer who tracks a handful of their own repositories and wants one scan of stars, forks, clone and download counts before going back to work.
- Subject world: GitHub telemetry. Release asset downloads, clone counts, star history, repo slugs, monospace numerals that line up in columns.
- Signature element: cards on one plane. A 184px hairline-separated rail on the left holds the mark, the navigation and the account; on the content plane every module is its own card. The pull request feed goes one step further and makes each entry a row card of the same family; a selectable table such as the repository picker stays one card with hairline rows. A tinted 26px icon tile opens each card so a heading is never a bare line of text.
- Will not: nested cards around the app chrome, a floating card sidebar that duplicates the window title bar, gradient or glow decoration, more than one blurred surface at a time.

## Colors
Dark is the default theme and the front matter records it.

| Token | Dark | Light | OKLCH (dark) | Job | Pairs (measured) |
|---|---|---|---|---|---|
| void | #111111 | #f7f7f7 | 0.178 0.000 90 | page plane, scroll ground | |
| panel | #1c1c1c | #ffffff | 0.226 0.000 90 | rail, raised rows, inputs | |
| raised | #232323 | #eeeeee | 0.256 0.000 90 | header strips, hover fills | |
| line | #2e2e2e | #d6d6d6 | 0.301 0.000 90 | control borders that must read as edges | |
| hairline | #252525 | #e6e6e6 | 0.264 0.000 90 | section and row dividers | |
| paper | #ececec | #171717 | 0.943 0.000 90 | primary text, selected nav pill | text on void 15.98:1 / 16.73:1 |
| mist | #a3a3a3 | #595959 | 0.715 0.000 90 | secondary text, row metadata | text on void 7.49:1 / 6.54:1 |
| faint | #a3a3a3 | #595959 | 0.715 0.000 90 | labels, timestamps, empty states | text on void 7.49:1 / 6.54:1 |
| accent | #d71921 | #c4161d | 0.561 0.218 27 | brand mark, primary fill, focus ring | ui on void 3.64:1 / 5.63:1 |
| accent-strong | #ef4444 | #a8141b | 0.637 0.208 25 | accent text, negative deltas, failing rows | text on void 5.02:1 / 7.05:1 |
| on-accent | #ffffff | #ffffff | 1.000 0.000 0 | labels on the accent fill | text on accent 5.18:1 / 6.04:1 |
| ok | #28c840 | #207a37 | 0.728 0.217 145 | positive deltas, healthy states | text on void 8.48:1 / 5.03:1 |

Accent is a fill and edge colour, never body text: at 3.64:1 on the dark plane it fails the text floor. Text that must carry the accent hue uses accent-strong (5.02:1 dark, 7.05:1 light).

Transparency is a composited mode, not a second palette: with `data-transparency="on"` every surface mixes toward transparent (`void` 80%, `panel` 74%) and the rail alone gets a `backdrop-filter`. Contrast was measured against the opaque tokens, and the 80% content ground keeps text above 7:1 even over a white wallpaper.

## Typography
- Families: Geist Variable (OFL-1.1, already vendored in `src/styles/fonts.css`, inherits the system's neutral grotesque without a webfont fetch); Geist Mono Variable (OFL-1.1, the only face used for numerals and repo slugs so columns align).
- Scale ratio: 1.2 from a 13px body. Product density, not reading measure.

| Role | Size | Weight | Line height | Tracking | Use |
|---|---|---|---|---|---|
| display | 21px | 600 | 1.2 | -0.02em | page title, KPI values |
| title | 15px | 600 | 1.3 | -0.01em | section titles, repo names |
| body | 13px | 400 | 1.5 | 0 | table cells, descriptions, copy |
| label | 10.5px | 500 | 1.2 | 0.08em | uppercase mono section labels |
| mono | 12.5px | 500 | 1.4 | 0 | counts, stars, timestamps, deltas |

## Layout and spacing
- Scale: 4, 8, 12, 16, 20, 24, 32, 48.
- Grid: the page bar spans the whole window, and the two-column grid (rail then content) starts underneath it. The rail is a flat `panel` column with a hairline edge, never a card; it is 184px wide and collapses to a 56px icon strip from the toggle that sits in the page bar beside the page title. Because the bar owns the top of the window, the native traffic lights sit on the bar and never on the rail. The content column is one plane with 24px side padding and no outer frame. Two-column modules use `minmax(0,1.65fr)` / `minmax(260px,1fr)`; charts split evenly.
- Lists are windows: the repository table, the pull request list and the repository picker own their scroll viewport and virtualise their rows, so page chrome, KPIs and filters never move. On the overview the secondary modules scroll in the right column instead of the page.
- Every screen fills the plane: Settings and Create use the same width as Overview, Pulls and the picker, so moving between screens never changes the measure.
- Density: page bar 46px with a 92px start inset on macOS for the window controls, rail 184px wide (56px collapsed), nav item 32px, section padding 16px vertical, table rows 44px, pull rows 76px, controls 28–34px high. The traffic lights sit at `trafficLightPosition` `{ x: 20, y: 25 }`: AppKit centres the buttons at `y - 2` from the top, so 25 puts them on the bar's 23px centreline next to the toggle and title.
- Collapsed rail: labels, counts, the brand mark and the account name give way to their icons; the label survives as the item's tooltip and accessible name, so nothing is lost to a screen reader. The rail narrows to 56px — one 36px square per row plus 10px each side — because the page bar, not the rail, now clears the macOS traffic lights (`x=20` to `x=72`, which the bar answers with a 92px start inset). The expand/collapse control lives in the page bar, immediately before the page title, so it stays in the same place in both rail states.

## Elevation and depth
- Strategy: two steps, one shadow each. A module is a `panel` card with a 1px `hairline` and `--card-shadow` (1px contact plus a wide, very low-alpha drop). A list item repeats that recipe smaller with `--row-shadow`, and lifts to `--row-shadow-hover` on hover. The rail stays flat.
- A card never holds another card: nested blocks are `app-section-flush` (padding, border, radius and shadow removed).
- Floating layers (menus, popovers, dialogs, drag ghost) keep their own larger shadow, `0 10px 28px` at `0.32` dark / `0.12` light.
- One reading carries accent: the hero KPI card takes an 8% accent wash and a 26% accent border so the strip has a focal point.

## Shapes
| Step | Value | Used on |
|---|---|---|
| pill | 999px | nav items, badges, status pills, account chip |
| sm | 8px | buttons, inputs, icon buttons, icon chips |
| row | 12px | list items (pull requests, picker repositories) |
| card | 14px | sections, KPI cards, table cards |
| none | 0 | the content plane, the rail |

## Components
| Component | Tokens | States covered |
|---|---|---|
| Rail | panel, hairline, width 184 / 56 collapsed | expanded, collapsed, transparency on/off, window drag, narrow window |
| Nav item | mist, radius 8, height 32 | default, hover, selected (paper fill, void text), icon-only with tooltip, focus-visible |
| Section | panel, card radius, card shadow, spacing.4, chip + label | default, empty, loading skeleton |
| Icon chip | wash fill, radius 8, 26px; accent variant at 12% accent | muted, accent |
| List row card | panel, row radius, row shadow | default, hover (pull request feed) |
| KPI card | panel, card radius, card shadow, chip | value, loading, zero, delta positive/negative, hero (accent wash) |
| Button primary | accent, paper, sm, height 30 | default, hover, active, disabled, focus-visible |
| Table row | hairline, body, mono | default, hover, selected, failing data |

## Motion
| Token | Value | Used for |
|---|---|---|
| --dur-press | 120ms | press scale 0.97 on buttons and nav items |
| --dur-hover | 150ms | colour and background transitions |
| --dur-menu | 200ms | menus, popovers, tooltips |
| --dur-view | 250ms | route view transition |
| --ease-out | ease-out | enter and exit |
- Reduced motion: view transitions and the press scale drop out; opacity changes stay at 150ms or less.

## Accessibility
- Contrast target: WCAG 2.2 AA. Body text 4.5:1, large text and UI edges 3:1.
- Targets: 28px minimum for desktop controls, 34px for primary actions, 44px for rows and nav items.
- Focus ring: 2px solid accent at 2px offset, never removed.
- Exceptions: none. The accent hue is not used for text.

## Responsive behaviour
| Breakpoint | What changes |
|---|---|
| 960px (window minimum) | the rail keeps its 184px, full labels and the account, or collapses to 56px for more content width; the pull filters wrap to two rows and the overview keeps both columns |
| 1440px and up | content keeps a single plane; two-column modules gain the extra width, no new columns |

## Do's and Don'ts
- Do keep exactly one content plane; separate modules with card edges and 16px gaps rather than dividers.
- Do give every card an icon chip and a mono label, so headings scan the same way everywhere.
- Do make an actionable feed (the pull request list) out of row cards; keep a selectable table (the repository picker) as one card with hairline rows, since its rows are compared and scanned in place.
- Do keep one filled primary action per view.
- Do use accent-strong for any text that must read as red.
- Don't wrap the app chrome in a card, and never put a card inside a card.
- Don't stack more than one `backdrop-filter`; only the rail blurs.
- Don't use accent (#d71921) for text at body size.

## Overrides
| Row | Project value | Reason |
|---|---|---|
| T4 | Section labels at 10.5px mono uppercase | They label a region, never carry information on their own, and always sit beside 13px text; raising them to 12px would compete with the table content. |
| C1 | Accent fill up to 12% of the overview viewport | The single KPI that matters (downloads) and the primary button both carry it; the rest of the page stays neutral. |
| M2 | `--ease-out ease-out` | The project already ships this token in `src/styles/transitions-root.css` and every transition consumes it; redefining the easing curve would change motion across screens outside this redesign. |

## References
| Atlas page (`sites/<slug>.md`) | Live example and visual evidence | What we adapted | Licence class | Reviewed |
|---|---|---|---|---|
| sites/navbar-gallery.md | https://navbar.gallery, inspected 2026-10-17 at 1280×860 | One filled active pill and a brand at the leading edge; the pills moved into the left rail after the top capsule was tried | not-stated: ideas only, no code or assets | 2026-09-25 |
| sites/droppy-code.md | https://getdroppycode.app, not visually inspected | A native macOS workspace where the chrome is one translucent band, not a framed panel; panels blur at most once | open-source-copyleft: composition only, AGPL | 2026-09-26 |
| outside Atlas | User-supplied Dribbble shots (Insighta, Solis, Nexus, Leads overview) | Flat content plane and a KPI strip with no card frame around the app | not-stated: ideas only | 2026-10-17 |
| outside Atlas | User-supplied dashboard shots (green analytics overview, Rexora) | Rounded module cards on a quiet ground, tinted icon tiles at each card head, pill status badges, one highlighted metric | not-stated: ideas only | 2026-10-17 |

## Agent guide
- To add a component: read this file, reuse the section primitive and existing tokens, add states (hover, focus-visible, active, disabled) and empty/loading/error for data views, then verify in dark and light with transparency both off and on.
- Example requests: "add a languages section to the overview", "make the pull list denser", "give the picker the same rail as the rest".
- Known gaps: Settings, Create and Setup now share the section primitive, but their row labels are still 14px while the data screens use 13px. Glass mode assumes the Tauri window effects (HUD in dark, header/content material in light); on a platform without them, a light wallpaper can drop secondary text below 4.5:1 because the scrim is 80% of the plane colour.

## Provenance
- Date: 2026-10-17
- Read: `src/styles.css`, `src/components/{Chrome,KpiCard,Section,PageHeader}.tsx`, `src/app/Shell.tsx`, `src/lib/appearance.ts`, `src/features/list/components/{ListView,ListSidebar,ListCharts,RepositoryTable}.tsx`, `src/features/pulls/components/{PullsView,PullRow,PullDetailBody}.tsx`, `src/features/detail/components/{DetailBody,Kpis,HistoryCharts,TrafficSection,InsightsSection,MetaFacts,ReleasesTable}.tsx`, `src-tauri/tauri.conf.json`.
- Measured: theme tokens read from `getComputedStyle` in the running app (dark and light); contrast ratios computed from those hex values.
- Inferred: light-theme shadow alpha, the 184px rail width, and the 12% accent-fill estimate.
- Unverified: Droppy Code's live interface; the user-supplied Dribbble shots are static images without a live product to inspect. Native window vibrancy was not rendered here: the desktop effects only exist inside the Tauri window, so glass mode was checked in the browser over a white and a dark backdrop.
- Screenshots: 1200×780 and 960×640 in dark and light, transparency off and on (browser over a white backdrop), plus the pull list, the repository picker, a repository detail, a pull detail, Settings, Create and Setup. `bunx tsc --noEmit`, `bun run check`, `bun test` (63 tests) and `bunx vite build` all exited 0 after the last edit.
