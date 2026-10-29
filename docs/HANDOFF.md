# Current handoff

Use [TASKS](TASKS.md) for current scope and dated validation evidence. The last
recorded private deployment is
[T84](TASKS.md#t84--publish-and-privately-deploy-the-learning-workbench-2026-10-29),
on October 29, 2026: the T83 learning workbench, source
`051e4e05957d0ed97d3498661d840007f9bb4a11`, with schema
`0021_published_library` and all 868 packaged public texts. Its exact image,
encrypted backup/restore rehearsal, private HTTPS/readiness, served assets and
preserved model selections are recorded there. This is a dated deployment
receipt, not a new inspection of the running private installation.

[T85](TASKS.md#t85--make-expensive-validation-local-first-2026-10-29) makes full
validation local-first while retaining automatic source CI and explicit hosted
full checks. [T86](TASKS.md#t86--publish-the-maintainers-python-patch-updates-2026-10-29)
publishes three Python patch updates; they have fresh source/integration/mock/audit
evidence but are not recorded as privately deployed. The agent-guidance and
documentation refreshes do not change runtime behavior. Publishing current source
does not replace the deployment's dependency set or its dated release evidence.

Continue the [release acceptance checklist](ACCEPTANCE.md#items-requiring-the-maintainer):
review real tutoring through the actual app/worker, use physical phones and
assistive tools, and complete restored-host sign-in/settings/key-recovery checks.
Preserved model selections do not establish teaching quality. If model choices
change, follow [provider setup](PROVIDER_STATUS.md#test-and-select-the-tutor-and-photo-reader).
Calls to real models require task-specific authorization; existing authorization
remains valid within its scope. Browser-model measurements and AWS hosting are
optional.

## Where to find current guidance

| Need                                                    | Document                                   |
| ------------------------------------------------------- | ------------------------------------------ |
| Setup, learner workflow and developer commands          | [README](../README.md)                     |
| Requirements and architecture                           | [SPECIFICATION](SPECIFICATION.md)          |
| Migrations, account recovery, backups and deployment    | [RUNBOOK](RUNBOOK.md)                      |
| Private HTTPS and phone uploads                         | [PHONE_SETUP](PHONE_SETUP.md)              |
| Model connections, policy, testing and activation       | [PROVIDER_STATUS](PROVIDER_STATUS.md)      |
| Tests with synthetic examples and human teaching review | [TUTOR_EVALUATION](TUTOR_EVALUATION.md)    |
| Release evidence and remaining acceptance               | [ACCEPTANCE](ACCEPTANCE.md)                |
| Toolchain policy and compatibility exceptions           | [DEPENDENCIES](DEPENDENCIES.md)            |
| Architecture rationale and superseded decisions         | [DECISIONS](DECISIONS.md)                  |
| Dated task and test records through October 11          | [Implementation history](history/TASKS.md) |

Apply [AGENTS](../AGENTS.md), relevant nested instructions and the affected
contracts. Use the implementation skill for tracked work and the UI/UX skill for
requested reviews, loading their references as needed. Keep the requested scope
bounded and preserve unrelated edits. Do not inspect private configuration,
learner data or logs to update public docs.

Python commands run from the repository root using its `pyproject.toml`,
`uv.lock`, `.python-version` and `.venv`; `apps/api` contains source, migrations and
tests. Use the Makefile to install locked versions and run checks, including the shared
CloudFormation validator. [DEPENDENCIES](DEPENDENCIES.md) records the current
runtime pins and dated compatibility checks; cfn-lint 1.59.0's metadata includes
Python 3.15, replacing the older upper-bound exception.

Full application releases require `make verify-local` and exact-candidate image
checks in [RUNBOOK](RUNBOOK.md#local-release-validation). Documentation-only work
uses document/skill checks, while configured commit hooks remain in force.
Do not run a web build concurrently with integration or browser tests using its
output. Automatic source CI is narrower than full release validation.
