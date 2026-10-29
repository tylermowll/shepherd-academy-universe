# Repository instructions

Shepherd Academy Universe is a multi-subject AI tutor. Exact checking is optional
domain evidence, not the primary product. The approved stack is React/TypeScript/
Vite, a FastAPI modular monolith and local SQLite, with one API process and one
worker on the same host (D004/D009). New frameworks, services or database engines
need a documented need and architecture decision. The app has no autonomous
external tools.

## Find the relevant context

Apply the root and relevant nested `AGENTS.md` instructions. Load only the context
needed for the requested change:

- [README](README.md) and [Makefile](Makefile): supported behavior and commands.
- [TASKS](docs/TASKS.md) and the [implementation skill](.agents/skills/implement-task/SKILL.md):
  scope, contracts and evidence when implementing or continuing a tracked task.
- [SPECIFICATION](docs/SPECIFICATION.md): the affected product contracts;
  [DECISIONS](docs/DECISIONS.md): architecture, storage and compatibility choices.
- [RUNBOOK](docs/RUNBOOK.md): operations and deployment;
  [ACCEPTANCE](docs/ACCEPTANCE.md): outstanding real-world verification.
- [UI/UX review skill](.agents/skills/ui-ux-review/SKILL.md): requested interface
  audits or design critiques, with references selected for the review's scope.

Report material conflicts between instructions, current code and requirements.
Historical task evidence does not override current contracts.

## Product and data boundaries

- Do not open live `.env` files, private provider configuration, credentials,
  uploads, learner records or private logs. Use examples and synthetic fixtures.
  Never commit secrets, real learner data, private logs or employer material.
- Keep provider keys, hidden answers and administrator data out of learner
  responses and bundles. Enforce capability, audience, ownership and retention
  in backend code; model output cannot change permissions or workflow state.
- Treat learner/model text as untrusted data; never execute it or use unsafe
  expression evaluators. Verified verdicts and answer keys remain authoritative;
  AI reasoning feedback must not appear as verified grades.
- Show photo interpretation before tutoring feedback. Clear task-relevant
  readings continue automatically in the worker, without approval. Give specific
  clarification advice only when uncertainty prevents useful feedback; incidental
  uncertainty must not block readable work. Retain rejected reader reports as
  explicitly uncertain conversational context.
- Uploaded/pasted assignments are references for concepts and distinct analogous
  practice. Guide and explain without answering the learner's active assignment.
  Do not add fixed-template catalogs or authored-hint fallbacks to the tutor.
- Do not send local/private work to cloud providers without explicit permission.
  Paid application/test inference, provisioning, public deployment, destructive
  migration, Git push and model downloads require maintainer authorization.
  Authorization already given for the task remains valid; do not ask again.

## Delivery and verification

Inspect Git status and preserve unrelated work. Complete the requested scope;
local edits and tests with disposable synthetic fixtures may proceed without
additional approval. Identify affected contracts and useful checks before editing;
scale planning and regression coverage to the change. Generate API clients from
their schemas. Add modules and Make targets only when they have real behavior.

This is pre-production: prefer one current implementation over legacy shims or
development-schema bridges unless requested (D005). Real migrations, current-schema
integrity and rollback checks still apply; disposable development databases may be
recreated, retained installations may not be silently reset.

Use the Makefile's implemented checks and SPECIFICATION section 16's release
gates. Documentation-only work needs relevant document/skill validation, not new
application tests. Do not weaken assertions or requirements to hide failures.
Keep builds sequential with integration/browser runs that use `apps/web/dist`.
Live evaluation is separate and opt-in.

For tracked work, record changed files, commands/outcomes, unresolved failures and
checks not run in TASKS. Distinguish observed behavior from source inspection,
screenshots and model judgments; none alone proves correctness or teaching quality.
When updating agent guidance, recheck current primary sources and date the research
in task evidence; keep transient model/version advice out of persistent rules.
