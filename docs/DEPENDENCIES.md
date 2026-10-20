# Dependency policy and baseline

Direct requirements use minimum-only `>=` ranges. Lockfiles select exact package
versions; installer pins and container digests make the tested build repeatable.
Newer stable Node and pnpm versions are allowed, including newer majors, but
package peer-dependency requirements and Python compatibility restrictions still
apply.

This guide was checked against repository files on October 19, 2026. It describes
the declared configuration, not the newest upstream releases or the packages in
a running private installation. Dated verification results are in
[task history](history/TASKS.md#release-publication-2026-10-11).

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

Python uses one project: the root `pyproject.toml`, `uv.lock`, `.python-version`
and `.venv`. Run the root Make targets or `uv run --locked` from the repository
root. Application source remains under `apps/api/src`; it does not need a second
project, lock or virtual environment. [D016](DECISIONS.md#d016--one-python-project-and-runtime-2026-10-17)
records the consolidation.

## Runtime and installer pins

| Tool    | Repository pin                                 | Authority                                                                                         |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Python  | 3.15.0; requirement `>=3.15.0`                 | [.python-version](../.python-version), root Python manifest                                       |
| Node.js | 26.12.0; requirement `>=26.12.0`               | [.node-version](../.node-version), root manifest                                                  |
| pnpm    | 12.14.0; requirement `>=12.14.0`               | Root `packageManager` and `engines`                                                               |
| uv      | 0.13.2 in CI/container; requirement `>=0.13.2` | Root Python manifest, [CI](../.github/workflows/ci.yml), [Dockerfile](../infra/docker/Dockerfile) |

The local nvm default is now Node 26.12.0 with npm 12.2.0 and pnpm 12.14.0
installed in its global prefix. npm is an installation tool; project commands
use pnpm. The managed root Python environment remains 3.15.0. This refresh does
not replace the operating system's Python or upgrade OS packages.

[The toolchain checker](../scripts/check-toolchain.mjs) enforces stable
Node/pnpm versions at or above the declared minimums.
[pnpm-workspace.yaml](../pnpm-workspace.yaml) enforces strict peer checks and
blocks unreviewed install scripts. Its `pmOnFail: ignore` setting allows an
installed compatible pnpm instead of automatically switching it to the installer
pin.

The container uses Python 3.15.0 for its build host and uv-managed application
runtime. The final image copies the locked runtime environment into the
digest-pinned Distroless Debian 13 non-root image. Build-only installer code is
removed.

## Compatibility constraints

- **SQLite:** the application enforces `sqlite3.sqlite_version >= 3.53.1` in
  [settings](../apps/api/src/math_tutor/settings.py). The October 11 managed
  Python 3.15.0 runtime reported 3.53.1. This is the embedded library,
  independent of any SQLite CLI.
  [D004](DECISIONS.md#d004--sqlite-for-the-initial-deployment-2026-09-06)
  defines the one-host, local-disk deployment boundary.
- **CloudFormation validator:** cfn-lint 1.57.2's
  [published metadata](https://pypi.org/pypi/cfn-lint/1.57.2/json) still
  declares Python `<3.15`, although its
  [Python 3.15 decoder fix](https://github.com/aws-cloudformation/cfn-lint/pull/4717)
  merged on October 1. uv
  [ignores dependency Python upper bounds](https://docs.astral.sh/uv/concepts/resolution/#requires-python),
  so ordinary resolution and installation work without an override or patched
  distribution. The October 17 check installed the released package on 3.15 and
  validated JSON, YAML and the household template; an invalid template failed
  with E3030. These checks justify the current shared environment, without
  claiming formal upstream 3.15 support. Recheck the metadata and CLI on
  updates. Its transitive SymPy dependency never evaluates learner text.
- **TypeScript:** application TypeScript resolves to 6.0.3 within
  typescript-eslint 8.71.2's recorded `>=4.8.4 <6.1.0` peer range. The OpenAPI
  generator is isolated with TypeScript 5.9.3 for openapi-typescript 7.13.0's
  `^5.x` peer requirement. T56 retried TypeScript 7.0.2 and reproduced both
  strict peer conflicts; 6.0.3 and 5.9.3 remain the newest compatible versions.
- **Vitest:** T56 advances the compatible maintenance line to 4.1.12. Retrying
  Vitest 5.0.5 with jest-dom 7.0.1 still fails strict checking with TS2428
  (`Assertion` declaration conflict). No `skipLibCheck`, declaration patch or
  suppressed type error was introduced.
- **Release age:** typescript-eslint 8.72.0 was published on October 19 and
  required pnpm to add release-age exclusions. T56 retains eligible 8.71.2
  without those exclusions; existing workspace supply-chain policies are
  unchanged. Reassess the newer release after it becomes eligible.
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

[CI](../.github/workflows/ci.yml) pins third-party actions by commit and defines
the source, browser, mock-evaluation, audit and container checks. It scans
images for HIGH/CRITICAL vulnerabilities, including those without a fix, and
retains a CycloneDX software bill of materials (SBOM) as `release-sbom` for 14
days. Hook commands use the project's locked tools, without separately resolved
hook environments. Image bases and installer pins are maintained in the
Dockerfile rather than duplicated here.

The optional browser-model [manifest](../apps/web/src/research-manifest.json) contains public
repository revisions and artifact hashes; model weights are not bundled.
Runtime/model/device acceptance and download consent remain separate checks in
[ACCEPTANCE](ACCEPTANCE.md#optional-research-and-hosting).
