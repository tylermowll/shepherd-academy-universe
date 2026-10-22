---
name: ui-ux-review
description: Review Shepherd Academy workflows, accessibility, and interface copy when a UI/UX audit or design critique is requested.
---

# Review the application experience

Evaluate whether the intended person can understand and complete a task, including
failure and recovery. Cover administration as deliberately as learning. Use the
current product contracts and existing visual language to judge the interface.

## Establish scope and coverage

Read root/nested AGENTS.md, inspect git status, and read the current task and
applicable README/SPECIFICATION sections. Use
[ACCEPTANCE](../../../docs/ACCEPTANCE.md) to distinguish previously recorded gaps
from new observations. Report conflicting requirements before proposing changes.

Use [the workflow inventory](references/workflows.md) to build a coverage matrix.
For a whole-app review, include every workflow group, with administrator and learner
journeys tracked separately. For a focused request, select the relevant rows and
their transitions; do not expand it into an unrelated audit. Verify the inventory
against current source and tests rather than assuming every documented capability
is implemented.

Each coverage row records:

- workflow, role, goal and entry screen/route;
- relevant normal, empty, pending, failure and recovery states;
- review lenses, browser/viewport/input method and evidence;
- status: **exercised**, **source-only**, **not reviewed**, **blocked**, or
  **outside scope**; include the reason for unexercised work.

These statuses describe coverage, not a verdict. Existing test files and historical
passes identify useful scenarios; they do not prove this revision passed.

## Apply the requested review lenses

Read the references needed for the requested review. A whole UI/UX review uses all
three; a focused copy or accessibility review can use just that reference.

- [Design critique](references/design-critique.md): task completion, navigation,
  visual hierarchy and consistent interaction.
- [Accessibility](references/accessibility.md): the repository's WCAG 2.2 AA
  target, measured checks and manual-testing limits.
- [UX writing](references/ux-writing.md): understandable actions, permissions,
  teaching language, disclosures and recovery advice.

Review complete transitions, not only initial screenshots. Include keyboard and
touch use where relevant; administrator forms, long content, errors and pending
operations deserve the same attention as the learner's first screen. Preserve
working conventions unless a change addresses an evidenced user problem.

## Use the existing evidence harness

Follow the root [Makefile](../../../Makefile) and inspect
[Playwright configuration](../../../playwright.config.ts) and the selected
`tests/smoke` cases before choosing commands. `make smoke` builds and runs isolated
desktop/mobile browser checks; `make smoke-built` uses an already-built app.
Focused Playwright selections use that same configuration and fixture server.
Confirm a build matches the reviewed source before claiming rendered evidence.
Keep builds and browser runs sequential: they share output directories and ports.

Use disposable synthetic data. The harness runs `serve-demo.py --mode private`
with a temporary database and mock provider; the public `make demo` deliberately
blocks tutoring and uploads. Neither is the user's private installation. Check
environment isolation without printing values; disable environment-file loading
and exclude inherited operator/provider settings from any ad hoc runner. Do not
replace the harness with a new tour script, browser stack or dependency unless the
requested task demonstrates a concrete need.

Exercise account changes, revocation, export and deletion only on disposable
fixtures. Do not open live environment files, provider configuration, uploads,
learner records or private logs. Inspect secrets as write-only UI behavior using
synthetic placeholders. The skill does not authorize live provider tests, model
downloads, deployment or external ticket creation.

When browser or assistive tools are unavailable, continue useful source inspection
and label its limits. DOM checks and mobile emulation cannot establish screen-reader,
physical-camera or Safari behavior. Screenshots support visual findings; actual
interaction checks establish the behavior exercised. Mock feedback does not
establish teaching quality.

## Report actionable findings

Lead with findings ordered by user impact. For each, include the affected role and
workflow, route/state, reproduction or source location, expected versus observed
behavior, supporting evidence, and a concrete correction. Name the governing
product requirement or accessibility criterion when applicable. Distinguish an
observed defect, a source-based concern, and a design suggestion; merge duplicate
findings from different lenses. Do not require an arbitrary number of findings.

Use severity according to consequence: blocking access, leaking another account's
content or losing work takes priority over avoidable friction and cosmetic polish.
Keep uncertainties explicit; never invent contrast measurements, tool output,
screen-reader announcements, user feedback or successful tests.

Return the coverage matrix, actual commands/outcomes, and remaining checks with the
findings. Keep existing acceptance follow-ups visibly separate from new findings.
An unexercised workflow prevents a claim of a complete whole-app audit; a clean
subset does not establish WCAG conformance or release readiness.

Review requests leave application files unchanged unless fixes are also authorized.
When fixes are authorized, follow the normal bounded task protocol, preserve
unrelated edits, add meaningful regression coverage and update docs/TASKS.md with
actual evidence. Existing authorization remains valid; the skill adds no approval
gate.

The review approach is informed by [these upstream sources](references/sources.md).
