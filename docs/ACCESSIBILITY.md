# Accessibility checklist — Atrium LMS frontend

| Field         | Value                         |
| ------------- | ----------------------------- |
| Current build | Phase 4 — frontend foundation |
| Last reviewed | 25 November 2026              |

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
- [ ] Full keyboard-navigation audit for sidebar, dropdowns, dialogs, and selects.
- [ ] Automated axe or Playwright accessibility checks.
- [ ] Dark-mode contrast verification for every primitive.

Automated accessibility checks are completed in Phase 14 with Playwright.
