---
name: implement-task
description: Deliver a Shepherd Academy task from docs/TASKS.md. Use when implementing or continuing tracked work.
---

# Deliver the tracked outcome

Use the requested task's scope, affected SPECIFICATION contracts and exit checks.
Read those sections as needed rather than loading task history or the whole spec.
The maintainer's request authorizes the work; the task record is context, not an
additional approval gate. Keep later user corrections in the active scope.

Before editing, identify the affected behavior and useful evidence. Scale the
plan to uncertainty: a small correction may need no written itinerary; a change
across API, worker and UI needs a coherent slice with explicit acceptance cases.
Keep unrelated backlog work separate.

For behavior changes, cover the changed outcome and relevant failure, ownership
or policy boundaries. Regenerate public API contracts when schemas change. Use
real migrations and on-disk SQLite checks for persistence changes; D005 permits
correcting initial migrations for disposable development data, not resetting a
retained installation.

Choose checks from [verification guidance](references/verification.md). The
Makefile and the task's required gates define completion; the skill does not add
new dependencies, mandatory test counts or a plan-approval checkpoint.

Record actual changes, commands/results and remaining limits in
[TASKS](../../../docs/TASKS.md). If something blocks completion, finish independent
authorized work and identify the precise blocker and next bounded action. Do not
present a partial result as a completed task.
