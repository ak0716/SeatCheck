# design-brief.md
# Seatcheck — Design Brief
# Place this file in .cursor/rules/

## What this file covers
Visual design direction for all UI components. Read this before generating any component,
page, or layout — including unstyled skeleton phases. The color system and dark mode
strategy must be established from the first component.

---

## Design Philosophy

Monochromatic, legible, and functional. Every design decision should serve clarity first.
No decorative elements for their own sake. Density should feel comfortable, not cramped —
this is a monitoring dashboard the user will check frequently.

---

## Color System

Use CSS custom properties (variables) for all colors. Never hardcode hex values in
components. This is required — not optional.

### Light mode palette
```css
--color-bg:           #ffffff;
--color-bg-subtle:    #f5f5f5;
--color-bg-raised:    #ebebeb;
--color-border:       #e0e0e0;
--color-border-strong:#c0c0c0;
--color-text:         #111111;
--color-text-secondary: #555555;
--color-text-muted:   #999999;
--color-accent:       #333333;
--color-accent-subtle:#f0f0f0;
--color-positive:     #4a7c59;
--color-positive-bg:  #f0f7f2;
--color-negative:     #8b3a3a;
--color-negative-bg:  #fdf0f0;
```

### Dark mode palette
```css
--color-bg:           #111111;
--color-bg-subtle:    #1a1a1a;
--color-bg-raised:    #222222;
--color-border:       #2a2a2a;
--color-border-strong:#3a3a3a;
--color-text:         #f0f0f0;
--color-text-secondary: #aaaaaa;
--color-text-muted:   #666666;
--color-accent:       #cccccc;
--color-accent-subtle:#1f1f1f;
--color-positive:     #5a9e6f;
--color-positive-bg:  #0f1f14;
--color-negative:     #b05555;
--color-negative-bg:  #1f0f0f;
```

### CSS variable declaration
Declare all variables in `app/globals.css` at `:root` scope. This must be the first thing in globals.css, before any other styles or Tailwind directives.

```css
:root {
  /* light mode — all --color-* variables here */
}
@media (prefers-color-scheme: dark) {
  :root {
    /* Dark mode uses the SAME variable names with different values. */
    /* Do NOT prefix with --dark- or create new variable names. */
    /* This block overrides the :root values above when dark mode is active. */
  }
}
```

### Dark mode implementation
Use `prefers-color-scheme` — do not build a manual toggle or use localStorage. Set `darkMode: "media"` in `tailwind.config.js`. Tailwind's `dark:` variant and the CSS variable overrides both activate from the same `prefers-color-scheme: dark` media query — they work together automatically. Prefer CSS variables over Tailwind's `dark:` variant for colors, since variables switch automatically without needing duplicate utility classes on every element.

---

## Typography

- Font stack: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- No custom web fonts — system fonts load instantly and suit the functional aesthetic
- Base size: 14px for dashboard content, 13px for secondary/metadata text
- Line height: 1.5 for body, 1.3 for labels and compact UI
- Font weights: 400 (regular), 500 (medium, for labels), 600 (semibold, for headings and values)
- Never use font-weight above 600

---

## Spacing & Layout

- Use an 8px base grid. All spacing values should be multiples of 4px (4, 8, 12, 16, 24, 32...)
- Component padding: 12px–16px for cards, 8px for compact rows
- Generous whitespace between sections — breathing room aids legibility
- Single-column layout on the main dashboard; no sidebars

---

## Component Style Rules

### Cards / containers
- Subtle background (`--color-bg-subtle`) with a 1px border (`--color-border`)
- Border radius: 8px for cards, 6px for inputs and buttons, 4px for tags/badges
- No drop shadows — use background color contrast and borders for elevation instead

### Buttons
- Primary action: filled, `--color-accent` background, `--color-bg` text
- Secondary action: `--color-bg-raised` background, `--color-text` text, 1px border
- Destructive action: `--color-negative-bg` background, `--color-negative` text
- All buttons: 32px height for standard, 28px for compact contexts

### Status badges / tags
- Use muted color fills from the palette — never saturated colors
- Price decrease indicator: `--color-positive` text on `--color-positive-bg` background
- Price increase indicator: `--color-negative` text on `--color-negative-bg` background
- Neutral status (Active, Paused): `--color-bg-raised` background, `--color-text-secondary` text
- Error status: `--color-negative` text, no fill

### Form inputs
- 1px border (`--color-border`), `--color-bg` background
- Focus state: border color shifts to `--color-border-strong`, no glow or shadow
- Placeholder text: `--color-text-muted`

### Dividers / separators
- Use border-bottom (`--color-border`) rather than full-width hr elements
- Let whitespace do most of the separation work

---

## Hierarchy

Establish hierarchy through:
1. Font weight (400 → 500 → 600)
2. Text color (--color-text → --color-text-secondary → --color-text-muted)
3. Background contrast (--color-bg → --color-bg-subtle → --color-bg-raised)

Do not use size variation as the primary hierarchy tool — keep type sizes tight.

---

## Form Validation & Error Messages

- Inline error messages appear directly below the invalid field
- Error text: `--color-negative`, 13px, no icon
- Required field indicators: asterisk (*) in `--color-negative` after the label
- Do not use alert boxes or toasts for inline validation — keep errors adjacent to their fields

## Empty States

- Empty state text: `--color-text-muted`, centered, 14px
- Include a brief explanation and a single action if relevant (e.g., "No watches yet. Add one above.")
- No illustrations or icons — text only

## What to Avoid

- No gradients
- No drop shadows
- No rounded corners above 8px
- No saturated or bright colors outside of the positive/negative indicators
- No animations or transitions except a simple 150ms `transition: color, background-color, border-color` on interactive elements

### Interactive states (apply to all interactive elements)
- **Button hover:** background shifts one step darker/lighter (use `--color-bg-raised` → `--color-border` for secondary; `--color-accent` darkens 10%)
- **Button focus:** 2px outline using `--color-border-strong`, offset 2px. No glow.
- **Button disabled:** `--color-text-muted` text on `--color-bg-raised` background, `cursor: not-allowed`, no hover effect
- **Input focus:** border color shifts to `--color-border-strong`. No shadow or glow.
- **Input disabled:** `--color-bg-subtle` background, `--color-text-muted` text
- **Clickable rows (AlertRow):** background shifts to `--color-bg-raised` on hover
- No icons unless absolutely necessary — use text labels instead
- No decorative borders or dividers beyond simple 1px lines

---

## Component Gallery

Two to three sentence descriptions for each key component. Use these as the baseline when generating components in Phases 2–7.

**WatchCard** — A card displaying a single watch. Shows the label prominently (600 weight), the URL or platform as secondary text below it, and status badge aligned to the right. Bottom row shows Last Checked timestamp (muted, 13px) and price threshold if set. Full-width, sits in a stacked list with 8px gap between cards. Error state: card left-border changes to `--color-negative` (3px), last_failure_reason displays below the URL in `--color-negative` at 12px. Card background does not change — border accent is sufficient.

**StatusBadge** — A compact inline tag showing watch status (Active, Paused, Error, Triggered). Uses `--color-bg-raised` background and `--color-text-secondary` text for neutral states; `--color-negative` text for Error. No fill color for error — text only. 12px, 500 weight.

**AlertRow** — A single row in the alert history panel. Shows event label, trigger type (price drop / availability change), trigger value, and timestamp in a single horizontal line. Dense layout — 36px row height. Alternate rows use `--color-bg-subtle` for legibility. Price decrease values use `--color-positive`, increases use `--color-negative`.

**AddWatchForm** — Stacked form layout, full-width inputs, 16px gap between fields. Label above each input in 13px 500 weight. Submit button right-aligned, primary style. Optional fields clearly marked with "(optional)" in `--color-text-muted` after the label. Submit button loading state: shows "Saving..." text, `--color-text-muted` on `--color-bg-raised`, disabled prop set to prevent multiple submissions. Submit button disabled state (incomplete required fields): same as loading state styling.

**AlertHistoryPanel** — A collapsible section below the watch list. Header row with "Recent Alerts" label and a count badge. Display the 10 most recent alerts. If total count exceeds 10, show a "Show older alerts" text link in `--color-text-secondary` below the list. Empty state: "No alerts sent yet" — 48px vertical padding, 14px, `--color-text-muted`, centered horizontally in the panel.

## Design Refinement (Phase 8)

Cursor generates the initial UI. In Phase 8:
- Review the generated UI and identify anything that needs adjustment
- Provide revised direction in this file, or supply specific CSS updates
- Optionally provide Figma comps for individual components that need redesign
- The owner is a UX designer — Phase 8 is a refinement pass, not a full design handoff
