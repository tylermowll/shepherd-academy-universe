---
name: ui-ux-review
description: Review Shepherd Academy workflows, accessibility or interface copy when an audit or design critique is requested.
---

# Review the requested experience

Judge whether the intended person can understand and complete their task,
including interruption and recovery. Use the applicable product contracts and
current interface; distinguish defects from design preferences. A review request
authorizes findings. Apply fixes when the user also requests them, without adding
an approval checkpoint.

## Choose scope and references

For a whole-app review, use the [workflow inventory](references/workflows.md) to
cover each implemented group, tracking administrator and learner journeys
separately. For focused work, select only relevant journeys and transitions.
Check inventory claims against current source/tests, and consult
[ACCEPTANCE](../../../docs/ACCEPTANCE.md) for previously recorded gaps.

Load the lenses the request needs:

- [Design](references/design-critique.md): navigation, hierarchy and interaction.
- [Accessibility](references/accessibility.md): WCAG 2.2 AA checks and manual limits.
- [Wording](references/ux-writing.md): actions, teaching claims and recovery copy.

A focused copy review does not require a whole-app audit or all three lenses.
For whole-app coverage, record role/goal, route/state, evidence method and status:
**exercised**, **source-only**, **not reviewed**, **blocked** or **outside scope**.
Explain unexercised work. Test names and historical passes are leads, not fresh
evidence.

## Gather evidence with the existing harness

Use the root [Makefile](../../../Makefile),
[Playwright configuration](../../../playwright.config.ts) and relevant
`tests/smoke` cases. `make smoke` builds then runs isolated desktop/mobile checks;
`make smoke-built` reuses a build matching the source. Focused Playwright
selections use the same fixture server. Keep builds and browser runs sequential;
they share output directories and ports.

Before any harness or ad hoc launch, disable environment-file loading and exclude
inherited operator/provider settings without printing them. In particular, remove
`SHEPHERD_OWNER_SOCKET` and `SHEPARD_SETUP_TOKEN`; temporary database settings alone
do not isolate an operator's owner channel. The harness uses
`serve-demo.py --mode private`, temporary SQLite and a mock provider. Public
`make demo` intentionally blocks tutoring/uploads. Account changes, revocation,
export and deletion belong on disposable fixtures. Reuse existing tools rather
than creating a new tour script or dependencies without a demonstrated need.

Exercise relevant transitions, long content, pending/error/recovery states,
keyboard and touch behavior. Preserve root product/privacy rules. Where browser
or assistive tools are unavailable, continue source review and label its limits.
Mobile emulation does not establish real-phone, Safari, camera or screen-reader
behavior; mock feedback does not establish teaching quality.

## Return findings and their limits

Prioritize findings by user consequence. Include the role/workflow, route/state,
reproduction or source location, expected/observed behavior, evidence and a
concrete correction. Cite the product requirement or accessibility criterion when
applicable; merge duplicates and distinguish observed defects, source concerns
and design suggestions. Do not invent measurements or require a finding quota.

For a focused review, report the checked scope and gaps concisely. For a whole-app
review, include the coverage matrix and actual commands/results; unexercised
journeys prevent a complete-audit claim. Keep prior acceptance gaps separate.
Screenshots, DOM inspection and a clean automated subset cannot establish WCAG
conformance or release readiness. For authorized fixes, use the normal task
workflow and record meaningful regression evidence in TASKS.

The review references retain their [source provenance](references/sources.md).
