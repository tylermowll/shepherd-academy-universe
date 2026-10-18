# Current handoff

Start with [TASKS](TASKS.md) for current status, planned work and validation
evidence. The application is implemented through T44; T45 consolidates
documentation, T46 retires catalog-era runtime code and redundant checks, and
T47 consolidates Python into one root project and Python 3.15 environment.
T48 clarifies current documentation, help and screen text.
T49 closes photo clarification, retry, age-group correction and session-flow
gaps; its current validation and publication status is in TASKS.
The last recorded private deployment was October 11, 2026. That record does not
verify the current installation, selected models or teaching quality.

The next operational step is to test and explicitly select the intended tutor
and photo reader in administrator Settings. Follow
[provider setup](PROVIDER_STATUS.md#test-and-select-the-tutor-and-photo-reader),
then the [release acceptance checklist](ACCEPTANCE.md#items-requiring-the-maintainer).
Calls to real models require separate authorization. Browser-model measurements and AWS
hosting are optional.

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

Continue one bounded task at a time using [AGENTS](../AGENTS.md). Do not inspect
private configuration, learner data or logs to update public docs.

Python commands run from the repository root using its `pyproject.toml`,
`uv.lock`, `.python-version` and `.venv`; `apps/api` contains source, migrations and
tests. Use the Makefile to install locked versions and run checks, including the shared
CloudFormation validator. [DEPENDENCIES](DEPENDENCIES.md) records the validator's
checked Python metadata exception.
