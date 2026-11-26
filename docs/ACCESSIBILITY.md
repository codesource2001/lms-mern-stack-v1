# Accessibility checklist — Atrium LMS frontend

| Field         | Value                     |
| ------------- | ------------------------- |
| Current build | Phase 15 — final sign-off |
| Last reviewed | 26 November 2026          |

## Baseline rules

- One `h1` per page; logical heading order.
- Every interactive element is keyboard reachable with a visible focus state.
- Every input has a label; errors are announced and associated with the field.
- Images have meaningful alt text or are marked decorative.
- Do not remove focus outlines without an accessible replacement.
- Respect `prefers-reduced-motion`; animation must never be required to understand or operate the UI.
- Target WCAG 2.2 AA for contrast and interaction.

## Phase 4 checklist

- [x] Semantic landmarks in public, auth, and app layouts.
- [x] Form fields have labels and field-level error text.
- [x] Buttons and links are keyboard operable.
- [x] Reduced-motion friendly transitions only; no required animation.
- [x] Theme toggle does not rely on color alone.
- [x] Automated axe checks for public home and login pages (WCAG 2/2.1 A/AA tags)
- [~] Full keyboard-navigation audit for sidebar, dropdowns, dialogs, and selects (automated focus checks only)
- [ ] Dark-mode contrast verification for every primitive

Phase 15 axe scans found low-opacity text on the dark home sections. The affected labels and paragraphs were raised to `text-background/85` and the scans now pass with no serious or critical violations. The sign-off in [`SIGN-OFF.md`](SIGN-OFF.md) records the remaining manual checks.
