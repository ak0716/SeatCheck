# components.md
# Seatcheck — Component Isolation Rules
# Place this file in .cursor/rules/

## What this file covers
Rules for how UI components are structured and organized.
Apply in ALL phases including skeleton phases.

---

## Isolation Rule
Every UI element must be its own isolated file in /components.
Never put more than one UI concern in a single component file.
Never create monolithic page files even in unstyled skeleton phases.

## Example components (each must be a separate file)
- WatchCard.tsx
- StatusBadge.tsx
- AlertRow.tsx
- AddWatchForm.tsx
- AlertHistoryPanel.tsx
- FrequencySelector.tsx

## Data fetching
Components must accept data as props only.
No direct Supabase calls inside component files.
All data fetching happens in page files or API routes.

## Styling in Phases 1–7
Use only structural Tailwind classes (flex, grid, p-4, gap-2, w-full, etc.).
Use CSS custom properties from design-brief.md for any color values.
Do not apply decorative styling — Phase 8 handles visual design.

## Phase 8
Design retrofit applies one component at a time.
Clean isolation in earlier phases is what makes Phase 8 a styling pass rather than a rewrite.