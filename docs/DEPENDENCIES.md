# Dependency policy and baseline

Direct requirements use minimum-only `>=` ranges. Lockfiles select exact package
versions; installer pins and container digests make the tested build repeatable.
Newer stable Node and pnpm versions are allowed, including newer majors, but
package peer-dependency requirements and Python compatibility restrictions still
apply.

This guide was checked against repository files and primary release metadata on
October 24, 2026. It describes the declared configuration and reviewed releases,
not the packages in
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
version and fresh validation for publication to `main`; private deployment
evidence remains recorded under T79.

## Runtime and installer pins

| Tool    | Repository pin                                 | Authority                                                                                         |
| ------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Python  | 3.15.1; requirement `>=3.15.1`                 | [.python-version](../.python-version), root Python manifest                                       |
| Node.js | 26.12.1; requirement `>=26.12.1`               | [.node-version](../.node-version), root manifest                                                  |
| pnpm    | 12.15.0; requirement `>=12.15.0`               | Root `packageManager` and `engines`                                                               |
| uv      | 0.13.5 in CI/container; requirement `>=0.13.5` | Root Python manifest, [CI](../.github/workflows/ci.yml), [Dockerfile](../infra/docker/Dockerfile) |

T56's development environment uses an nvm default of Node 26.12.0 with npm
12.2.0 and pnpm 12.14.0 installed in its global prefix. T57's maintainer
workstation uses the same versions in `~/.local/share/shepherd-toolchain`, with
links in the existing `~/.local/bin` PATH entry. npm is an installation tool;
project commands use pnpm. Those installations used managed Python 3.15.0.
Neither installation replaces the operating system's Python or upgrades OS
packages.

T58 advances the persistent nvm default to Node 26.12.1, retaining npm 12.2.0
and pnpm 12.14.0. Existing terminals can select it with `nvm use default`.

T77 retains that Node/nvm default and updates npm and pnpm in its existing
user-local prefix to 12.2.1 and 12.15.0. uv 0.13.5 was already installed; the
repository now matches it. The root `.venv` uses managed Python 3.15.1. The older
managed runtime and previously built rollback image are retained.

[The toolchain checker](../scripts/check-toolchain.mjs) enforces stable
Node/pnpm versions at or above the declared minimums.
[pnpm-workspace.yaml](../pnpm-workspace.yaml) enforces strict peer checks and
blocks unreviewed install scripts. Its `pmOnFail: ignore` setting allows an
installed compatible pnpm instead of automatically switching it to the installer
pin.

The container uses Python 3.15.1 for its build host and uv-managed application
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
  CLI results are recorded in T80. Recheck metadata and CLI on updates. Its
  transitive SymPy dependency never evaluates learner text.
- **TypeScript:** application TypeScript resolves to 6.0.3 within
  typescript-eslint 8.72.0's recorded `>=4.8.4 <6.1.0` peer range. The OpenAPI
  generator is isolated with TypeScript 5.9.3 for openapi-typescript 7.13.0's
  `^5.x` peer requirement. T56 retried TypeScript 7.0.2 and reproduced both
  strict peer conflicts; 6.0.3 and 5.9.3 remain the newest compatible versions.
  T77's current registry metadata still offers TypeScript 7.0.2 with those same
  incompatible peer ranges, so these compatible resolutions are retained.
- **Vitest:** T56 advances the compatible maintenance line to 4.1.12. Retrying
  Vitest 5.0.5 with jest-dom 7.0.1 still fails strict checking with TS2428
  (`Assertion` declaration conflict). No `skipLibCheck`, declaration patch or
  suppressed type error was introduced.
  T77's registry check still reports the same Vitest 5.0.5/jest-dom 7.0.1 pair;
  the recorded incompatibility remains, and the compatible Vitest 4.1.12 line
  is retained.
- **Release age:** typescript-eslint 8.72.0 was published on October 19 and
  required pnpm to add release-age exclusions. T56 retains eligible 8.71.2
  without those exclusions; existing workspace supply-chain policies are
  unchanged. T58 adopts 8.72.0 after it becomes eligible under pnpm's default
  24-hour release-age policy. T77 adopts Vite 8.3.5 (published October 21) and
  KaTeX 0.19.1 (published October 23 at 20:41 UTC) after both become eligible.
  pnpm's default release-age, strict peer and install-script policies remain
  unchanged; no exclusions are added.
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

T77 checks official release tags and each action's source metadata, then updates
the following compatible Node 24 actions. Existing workflow events, permissions,
inputs and disabled caches remain unchanged; GitHub-hosted execution is verified
by the resulting CI run, separately from local checks.

| Action            | Reviewed release                                                      | Pinned commit                              |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------ |
| checkout          | [v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1)     | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| setup-node        | [v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0)   | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| pnpm/action-setup | [v6.1.0](https://github.com/pnpm/action-setup/releases/tag/v6.1.0)    | `ea17c68df8912ef543352723c149a84f56e3d413` |
| setup-uv          | [v10.3.2](https://github.com/astral-sh/setup-uv/releases/tag/v10.3.2) | `07a047e608db84b3d8c06cd9a7c7dcc9c355c18e` |

The existing Trivy v0.36.0 and upload-artifact v7.0.2 pins already match their
latest stable releases and are retained.

The optional browser-model [manifest](../apps/web/src/research-manifest.json) contains public
repository revisions and artifact hashes; model weights are not bundled.
Runtime/model/device acceptance and download consent remain separate checks in
[ACCEPTANCE](ACCEPTANCE.md#optional-research-and-hosting).
