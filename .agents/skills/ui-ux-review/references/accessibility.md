# Accessibility review

Use the [WCAG 2.2 AA target](../../../../docs/SPECIFICATION.md#18-definition-of-done-and-public-presentation).
This is a focused review checklist, not an exhaustive conformance audit. Check
applicable criteria against [WCAG 2.2](https://www.w3.org/TR/WCAG22/) before citing
a failure. Report tested scope and remaining manual work.

## Keyboard, focus and forms

- Complete the selected journey without a pointer: role sign-in, account chooser,
  navigation, disclosures, photo controls, message actions, settings and recovery.
  Check meaningful order, reachable controls, Escape behavior and focus restoration
  where relevant. Do not require arrow keys for controls whose native semantics
  do not use them.
- Check visible control focus (2.4.7), keyboard access without traps (2.1.1, 2.1.2)
  and focus not entirely hidden by sticky headers, conversation panes, notices or
  the composer (2.4.11). Programmatic heading focus may orient navigation without
  giving the heading the appearance of an interactive control.
- Inspect labels, instructions and error association (1.3.1, 3.3.1, 3.3.2),
  accessible name/role/value (4.1.2), and async status announcements (4.1.3).
  Password changes and provider forms need the same checks as learner input.
- Check password-manager/autofill and paste support for accessible authentication
  (3.3.8); follow existing credential policy rather than inventing new password
  rules. Check selection, errors and focus without exposing any saved secret.

## Layout, contrast and input

- Inspect browser text resizing to 200% (1.4.4), reflow at 320 CSS pixels where
  applicable (1.4.10), text spacing changes (1.4.12), long names and long guidance.
  Changing the viewport alone does not establish zoom behavior. Record the actual
  viewport, zoom/input method and relevant exceptions for inherently spatial work.
- Measure rendered foreground/background contrast: normal text 4.5:1, large text
  3:1 (1.4.3); applicable control boundaries, states and graphics 3:1 (1.4.11).
  Check overlays and actual backgrounds. Do not infer ratios from screenshots or
  assume that every disabled control has the same contrast requirements.
- Check meaning without color alone (1.4.1), meaningful image alternatives (1.1.1)
  and help/status/error text that remains understandable without an icon.
- For target size, 2.5.8 AA uses 24 by 24 CSS pixels or qualifying spacing and
  exceptions. A 44 by 44 target is useful touch guidance and belongs to enhanced
  criterion 2.5.5 AAA; do not label every smaller target an AA failure. Check the
  [minimum criterion](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
  when evaluating tightly grouped account, attachment and crop controls.
- Check alternatives to dragging where applicable (2.5.7), especially crop and
  rotation interactions. Review loading animation with reduced motion enabled;
  retain an understandable text status when motion is reduced.

## Mathematics, live updates and assistive technology

- Inspect SafeText/KaTeX's accessible HTML+MathML output and the reading order of
  task text, submitted work, photo readings and feedback. Visual correctness does
  not establish how a formula is announced.
- Exercise updates, errors, request recovery, account changes and revocation.
  Check focus and announcements without reading obsolete or another account's
  content. Do not mark a live-region implementation as proof of a good announcement.
- Use actual screen-reader testing when available and record tool/browser versions,
  actions and observed announcements. If unavailable, mark that check untested.
  Keep iPhone Safari, Android camera/HEIC, installed PWA and background/resume
  checks distinct from Chromium mobile emulation, as required by
  [ACCEPTANCE](../../../../docs/ACCEPTANCE.md#items-requiring-the-maintainer).

Reuse existing keyboard/focus/browser checks. An installed automated scanner may
supplement them; do not install a new dependency or claim automated coverage from
this checklist alone. Record measured defects separately from manual concerns and
do not declare WCAG conformance from screenshots, DOM inspection or a clean scan.
