# Dependency policy and baseline

Direct requirements use minimum-only `>=` ranges. Lockfiles select exact package
versions; installer pins and container digests make the tested build repeatable.
Newer stable Node and pnpm versions are allowed, including newer majors, but
package peer-dependency requirements and Python compatibility restrictions still
apply.

The declared configuration was reconciled with checked-in files on October 29, 2026. External release/compatibility checks below retain their recorded dates;
they are not claims that a version is still the newest. This guide does not
inspect the packages in a running private installation. [TASKS](TASKS.md) owns
recent validation/deployment receipts, and
[task history](history/TASKS.md#release-publication-2026-10-11) retains older checks.

## Version ownership

Use these files for exact declarations and resolutions instead of maintaining a
second package inventory in prose:

| Scope                                     | Declarations                                                    | Exact resolutions                   |
| ----------------------------------------- | --------------------------------------------------------------- | ----------------------------------- |
| API, development and CloudFormation tools | [pyproject.toml](../pyproject.toml)                             | [uv.lock](../uv.lock)               |
| Workspace and browser tests               | [package.json](../package.json)                                 | [pnpm-lock.yaml](../pnpm-lock.yaml) |
| Web app                                   | [apps/web/package.json](../apps/web/package.json)               | [pnpm-lock.yaml](../pnpm-lock.yaml) |
| Generated API client tools                | [tools/contracts/package.json](../tools/contracts/package.json) | [pnpm-lock.yaml](../pnpm-lock.yaml) |

Lockfile updates need fresh validation. See [TASKS](TASKS.md) for changes made
after the last recorded release checks.

The last recorded private deployment is
[T84](TASKS.md#t84--publish-and-privately-deploy-the-learning-workbench-2026-10-29),
which preserves T82's Python/runtime dependency layers while updating the learning
workbench. The later
[T86 patch refresh](TASKS.md#t86--publish-the-maintainers-python-patch-updates-2026-10-29)
changes opentelemetry-api **1.45.1 → 1.45.2**, Pydantic **2.14.1 → 2.14.2** and
pydantic-core **2.50.1 → 2.50.2**, with all 97 package identities, declarations and
runtime pins preserved. Its source/integration/mock/audit evidence applies to the
published lock, not a new private deployment.

The October 18 root lock refresh changes six dependency resolutions while
preserving Python 3.15.0. [T54](TASKS.md#t54--publish-the-maintainers-python-lock-refresh-2026-10-18)
records their before/after versions and validation separately from the private
deployment's earlier dependency set.

The October 19 reconciliation preserves the maintainer's newer local lock after
merging that refresh. Fourteen further resolutions change, including FastAPI
0.150.0 and HTTPX2 2.15.1; Python remains 3.15.0.
[T55](TASKS.md#t55--review-and-publish-the-reconciled-python-lock-2026-10-19)
records the version changes and fresh validation. Publishing this lock does not
update the private deployment's dependencies.

The subsequent [T56 toolchain refresh](TASKS.md#t56--update-development-tools-and-dependencies-2026-10-19)
updates the persistent development installation, repository installer pins and
dependency locks. Its fresh compatibility and validation evidence is separate
from T55 and the private deployment above. Official release metadata was checked
on October 19: [Node](https://nodejs.org/dist/index.json),
[npm](https://registry.npmjs.org/npm/latest),
[pnpm](https://registry.npmjs.org/pnpm/latest),
[uv](https://pypi.org/project/uv/) and
[uv_build](https://pypi.org/project/uv-build/).

The October 20 [T57 workstation repair](TASKS.md#t57--restore-the-workstation-commit-toolchain-2026-10-20)
installs the pinned JavaScript tools on the maintainer's workstation and checks
their subsequent Python lock refresh, including FastAPI 0.156.4 and cfn-lint
1.58.0. This does not update the private deployment.

The October 21 [T58 release](TASKS.md#t58--upgrade-and-deploy-the-private-local-application-2026-10-21)
updates Node to 26.12.1, uv/uv_build to 0.13.4, typescript-eslint to 8.72.0
and FastAPI to 0.159.1. Its task record owns fresh validation, publication and
private deployment evidence.

The October 24 [T77 refresh](TASKS.md#t77--expand-the-published-library-and-subject-levels-publish-and-deploy-2026-10-24)
advances the shared Python runtime to 3.15.1, uv/uv_build to 0.13.5, npm to
12.2.1 and pnpm to 12.15.0. Node remains 26.12.1. Official metadata was checked
for [Node](https://nodejs.org/dist/index.json),
[npm](https://registry.npmjs.org/npm/latest),
[pnpm](https://registry.npmjs.org/pnpm/latest),
[uv](https://pypi.org/pypi/uv/0.13.5/json),
[uv_build](https://pypi.org/pypi/uv-build/json) and each direct dependency's
PyPI/npm registry metadata. The maintainer's jsonpatch 1.37, jsonpointer 3.5 and
Starlette 1.10.0 updates are preserved; all 97 Python lock identities and exact
versions remain unchanged while their declared minimums are reconciled.
The eligible JavaScript updates are KaTeX 0.19.1 and Vite 8.3.5. Installer pins,
the published Python build image and the Distroless runtime digest are updated
together. T77 records the fresh source, package and deployment checks separately.

Python uses one project: the root `pyproject.toml`, `uv.lock`, `.python-version`
and `.venv`. Run the root Make targets or `uv run --locked` from the repository
root. Application source remains under `apps/api/src`; it does not need a second
project, lock or virtual environment. [D016](DECISIONS.md#d016--one-python-project-and-runtime-2026-10-17)
records the consolidation.

The October 28 [T80 lock refresh](TASKS.md#t80--publish-the-staged-python-lock-refresh-2026-10-28)
updates 15 existing Python resolutions, including the AWS SDK/stubs, cfn-lint,
Hypothesis, JSON Patch/Pointer and development tools. All 97 package identities,
dependency declarations and runtime pins are preserved. T80 lists every changed
version and fresh validation for publication to `main`; that task did not deploy
the refresh. Later private deployment receipts are recorded under T82 and T84.

The October 29 [T81 refresh](TASKS.md#t81--update-stable-toolchains-and-dependency-baselines-2026-10-29)
checks [Python 3.15.2](https://www.python.org/downloads/release/python-3152/),
[Node archive metadata](https://nodejs.org/dist/index.json),
[npm](https://registry.npmjs.org/npm/latest),
[pnpm](https://registry.npmjs.org/pnpm/latest),
[uv](https://pypi.org/pypi/uv/0.13.6/json) and
[uv_build](https://pypi.org/pypi/uv-build/0.13.6/json), plus direct dependency
metadata. The table below records the new pins; npm remains 12.2.1. All 97 Python
lock identities and exact versions are preserved, with seven outdated direct
minimums reconciled. TypeScript ESLint advances to 8.72.1. T81 owns fresh
validation and publication evidence; T82 subsequently deployed that baseline,
and T84 preserved its runtime layers while updating the workbench.

## Runtime and installer pins

| Tool    | Repository pin                                 | Authority                                                                                         |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Python  | 3.15.2; requirement `>=3.15.2`                 | [.python-version](../.python-version), root Python manifest                                       |
| Node.js | 26.13.0; requirement `>=26.13.0`               | [.node-version](../.node-version), root manifest                                                  |
| pnpm    | 12.16.1; requirement `>=12.16.1`               | Root `packageManager` and `engines`                                                               |
| uv      | 0.13.6 in CI/container; requirement `>=0.13.6` | Root Python manifest, [CI](../.github/workflows/ci.yml), [Dockerfile](../infra/docker/Dockerfile) |

T56's development environment used an nvm default of Node 26.12.0 with npm
12.2.0 and pnpm 12.14.0 installed in its global prefix. T57's maintainer
workstation used the same versions in `~/.local/share/shepherd-toolchain`, with
links in the existing `~/.local/bin` PATH entry. npm is an installation tool;
project commands use pnpm. Those installations used managed Python 3.15.0.
Neither installation replaces the operating system's Python or upgrades OS
packages.

T58 advanced the persistent nvm default to Node 26.12.1, retaining npm 12.2.0
and pnpm 12.14.0 at that checkpoint.

T77 retained that Node/nvm default and updated npm and pnpm in its existing
user-local prefix to 12.2.1 and 12.15.0. uv 0.13.5 was already installed; the
repository matched it. The root `.venv` used managed Python 3.15.1 at that
checkpoint. The older managed runtime and previously built rollback image were retained.

T81 recorded installing Node 26.13.0, npm 12.2.1 and pnpm 12.16.1 in the existing
nvm user-local installation and setting its persistent default to Node 26.13.0.
Existing terminals can select that default with `nvm use default`. It recorded
uv 0.13.6 and the root `.venv` using managed Python 3.15.2, without replacing
system Python or removing older managed runtimes. That task independently
verified the Node archive checksum and both container index digests; this guide
does not recheck the workstation installation.

[The toolchain checker](../scripts/check-toolchain.mjs) enforces stable
Node/pnpm versions at or above the declared minimums.
[pnpm-workspace.yaml](../pnpm-workspace.yaml) enforces strict peer checks and
blocks unreviewed install scripts. Its `pmOnFail: ignore` setting allows an
installed compatible pnpm instead of automatically switching it to the installer
pin.

The container uses Python 3.15.2 for its build host and uv-managed application
runtime. The final image copies the locked runtime environment into the
digest-pinned Distroless Debian 13 non-root image. Build-only installer code is
removed.

## Compatibility constraints

- **SQLite:** the application enforces `sqlite3.sqlite_version >= 3.53.1` in
  [settings](../apps/api/src/math_tutor/settings.py). The October 11 managed
  Python 3.15.0 runtime reported 3.53.1. T77 verifies the new managed Python
  3.15.1 also embeds SQLite 3.53.1 before adopting it. This is the embedded library,
  independent of any SQLite CLI.
  [D004](DECISIONS.md#d004--sqlite-for-the-initial-deployment-2026-09-06)
  defines the one-host, local-disk deployment boundary.
- **Python patch availability:** [Python 3.15.1](https://www.python.org/downloads/release/python-3151/)
  was released on October 21. Both packaging artifacts were unavailable at the
  T58 check, which retained 3.15.0. T77 verifies uv 0.13.5's managed Linux x86-64
  artifact and the official `python:3.15.1-slim-bookworm` image manifest before
  advancing native/container pins. An isolated runtime check passes the SQLite
  minimum; the shared virtual environment is then recreated from the locked
  dependencies. No operating-system Python or packages are replaced.
- **Python 3.15.2:** the October 29 check confirms the managed Linux artifact
  and official build image are available. The root environment passes the
  SQLite 3.53.1 minimum, HEIF conversion and cryptography checks.
- **CloudFormation validator:** cfn-lint 1.57.2's
  [published metadata](https://pypi.org/pypi/cfn-lint/1.57.2/json) still
  declares Python `<3.15`, although its
  [Python 3.15 decoder fix](https://github.com/aws-cloudformation/cfn-lint/pull/4717)
  merged on October 1. uv
  [ignores dependency Python upper bounds](https://docs.astral.sh/uv/concepts/resolution/#requires-python),
  so ordinary resolution and installation work without an override or patched
  distribution. The October 17 check installed the released package on 3.15 and
  validated JSON, YAML and the household template; an invalid template failed
  with E3030. T57 repeats the stock CLI checks for cfn-lint 1.58.0, whose metadata
  retains the same Python upper bound: the household template passes and an
  unknown synthetic resource type fails with E3006. Those checks justified the
  shared environment at that time. T77 repeats the unmodified 1.58.0 CLI checks under
  Python 3.15.1: the household template and valid synthetic JSON/YAML pass; an
  unknown synthetic resource type fails with E3006. Those dated checks did not
  establish formal upstream 3.15 support. The October 28 T80 refresh installs
  unmodified cfn-lint 1.59.0, whose distribution metadata declares
  `Requires-Python: <3.16,>=3.10`, covering the project's Python 3.15.1. Fresh
  CLI results are recorded in T80. T81 repeats valid/invalid synthetic CLI
  checks under Python 3.15.2 successfully with the same supported metadata.
  Recheck metadata and CLI on updates. Its
  transitive SymPy dependency never evaluates learner text.
- **TypeScript:** application TypeScript resolves to 6.0.3 within
  typescript-eslint 8.72.1's recorded `>=4.8.4 <6.1.0` peer range. The OpenAPI
  generator is isolated with TypeScript 5.9.3 for openapi-typescript 7.13.0's
  `^5.x` peer requirement. T56 retried TypeScript 7.0.2 and reproduced both
  strict peer conflicts; 6.0.3 and 5.9.3 are the compatible resolutions retained
  by those dated checks.
  T77's registry metadata check still offered TypeScript 7.0.2 with those same
  incompatible peer ranges, so these compatible resolutions are retained.
- **Vitest:** T56 advances the compatible maintenance line to 4.1.12. Retrying
  Vitest 5.0.5 with jest-dom 7.0.1 still fails strict checking with TS2428
  (`Assertion` declaration conflict). No `skipLibCheck`, declaration patch or
  suppressed type error was introduced.
  T77's registry check still reports the same Vitest 5.0.5/jest-dom 7.0.1 pair.
  T81 repeats installation and actual app type checking, reproducing TS2428;
  the final lock retains compatible Vitest 4.1.12 without type suppression.
- **Release age:** typescript-eslint 8.72.0 was published on October 19 and
  required pnpm to add release-age exclusions. T56 retains eligible 8.71.2
  without those exclusions; existing workspace supply-chain policies are
  unchanged. T58 adopts 8.72.0 after it becomes eligible under pnpm's default
  24-hour release-age policy. T77 adopts Vite 8.3.5 (published October 21) and
  KaTeX 0.19.1 (published October 23 at 20:41 UTC) after both become eligible.
  pnpm's default release-age, strict peer and install-script policies remain
  unchanged; no exclusions are added.
- **October 29 release age:** @types/node 26.6.6 was published October 28 at
  18:36 UTC and was younger than 24 hours at T81's 15:59 UTC review. That refresh
  retained 26.6.5 without a release-age bypass; a later refresh must recheck
  eligibility rather than treating this dated observation as a permanent pin.
  pnpm 12.16.1 and typescript-eslint 8.72.1 were eligible at that review.
- **HEIF:** the app requires at least pillow-heif 1.8.1 and locks that version.
  The October 11 release passed a Python 3.15 HEIF conversion and container
  smoke check. Earlier temporary 1.8.0 results remain historical evidence.

[D001's refresh](DECISIONS.md#d001-floor-only-dependency-refresh-2026-10-11)
records the dependency policy and compatibility decisions. A lock refresh must
still pass peer-dependency, type, test and audit checks; minimum-only
declarations do not establish compatibility with every future version.

## Verification and supply chain

The [Makefile](../Makefile) defines commands: `make bootstrap` installs the root
Python project with `--locked` and JavaScript with `--frozen-lockfile`;
`make lock-check` checks that manifests and lockfiles agree; `make audit` audits
the root Python lock and pnpm dependencies. The common Python environment
includes cfn-lint for `make infra-check`. Audits must be repeated for a release.
A past clean result is not a permanent security claim.

[CI](../.github/workflows/ci.yml) pins third-party actions by commit. Automatic
push/pull-request runs perform file hygiene, source gates, a SQLite runtime probe
and dependency audits. Hosted integration/browser/mock-evaluation and container
jobs require an explicit manual `full_validation` opt-in. The container job scans
HIGH/CRITICAL vulnerabilities, including those without a fix, and retains a
CycloneDX software bill of materials (SBOM) as `release-sbom` for 14 days.
Full application release checks normally run locally with `make verify-local`
and the [exact-candidate image procedure](RUNBOOK.md#local-release-validation).
A green automatic run covers only its listed scope. Hook commands use locked
tools, without separately resolved hook environments; existing commit gates still
apply. Image bases and installer pins live in the Dockerfile.

T77 checked official release tags and each action's source metadata, then updated
the following compatible Node 24 actions. This table is dated action-pin history;
the current workflow is authoritative. Hosted execution evidence remains separate
from local checks.

| Action            | Reviewed release                                                      | Pinned commit                              |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| checkout          | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)     | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| setup-node        | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)   | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| pnpm/action-setup | [v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)    | `ea17c68df8912ef543352723c149a84f56e3d413` |
| setup-uv          | [v10.3.2](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.2) | `07a047e608db84b3d8c06cd9a7c7dcc9c355c18e` |

T81 updates setup-uv to [v10.3.3](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.3),
commit `68559e99cc807c1eb7e9238fd43a15bba460eec2`, after verifying its Node 24
source metadata. The other action pins were retained at that October 29 check.

T81's metadata review retained Trivy v0.36.0 and upload-artifact v7.0.2 as the
stable releases observed at that checkpoint. Current pins remain in CI; this
documentation refresh does not claim a new upstream release check.

The optional browser-model [manifest](../apps/web/src/research-manifest.json) contains public
repository revisions and artifact hashes; model weights are not bundled.
Runtime/model/device acceptance and download consent remain separate checks in
[ACCEPTANCE](ACCEPTANCE.md#optional-research-and-hosting).
