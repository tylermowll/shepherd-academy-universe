# Dependency baseline

Direct Python and JavaScript floors were refreshed against official package
metadata on October 11, 2026. All direct requirements use minimum-only `>=`
ranges, as requested by the maintainer. Node and pnpm accept newer stable major
versions. Exact runtime installer versions, `packageManager`, container digests
and lockfiles preserve reproducible installs; upstream peer and transitive
constraints still apply. Compatibility exceptions are recorded in
[D001's refresh](DECISIONS.md#d001-floor-only-dependency-refresh-2026-10-11).
Actual verification commands and outcomes are recorded in [TASKS](TASKS.md).
The exact Python resolutions are committed in `apps/api/uv.lock` and
`tools/infra/uv.lock` and installed with `--locked`.

| Dependency            | Declared / locked resolution | Purpose                                                              |
| --------------------- | ---------------------------: | -------------------------------------------------------------------- |
| Python                |          `>=3.15.0` / 3.15.0 | Application runtime and development tools                            |
| Infrastructure Python |          `>=3.14.8` / 3.14.8 | Isolated cfn-lint environment selected explicitly by Make            |
| uv CLI                |          `>=0.13.0` / 0.13.0 | Environment and lock management; pin exactly in CI                   |
| uv_build              |  `>=0.13.0` / bundled 0.13.0 | Pure-Python build backend                                            |
| FastAPI               |        `>=0.143.0` / 0.143.0 | HTTP API framework                                                   |
| Pydantic              |          `>=2.14.0` / 2.14.0 | Public and internal typed schemas                                    |
| Uvicorn               |          `>=0.54.0` / 0.54.0 | Local ASGI server                                                    |
| HTTPX2                |          `>=2.13.1` / 2.13.1 | Maintained in-process API test client used by Starlette              |
| pytest                |            `>=9.1.1` / 9.1.1 | Backend tests                                                        |
| Ruff                  |          `>=0.17.0` / 0.17.0 | Formatting and linting                                               |
| mypy                  |            `>=2.4.0` / 2.4.0 | Static type checking                                                 |
| pre-commit            |            `>=4.6.2` / 4.6.2 | Git hook installation and staged-change isolation                    |
| pre-commit-hooks      |            `>=6.0.0` / 6.0.0 | Repository hygiene and private-key checks                            |
| SQLAlchemy            |            `>=2.1.4` / 2.1.4 | SQLite persistence, ORM, and transaction control (T01)               |
| Alembic               |          `>=1.20.0` / 1.20.0 | Versioned SQLite migrations (T01)                                    |
| argon2-cffi           |          `>=25.1.0` / 25.1.0 | Argon2id adult password hashing; `$argon2id$` default verified (T02) |
| argon2-cffi-bindings  |          transitive / 26.1.0 | Native Argon2 backend for argon2-cffi (T02)                          |
| cffi                  |           transitive / 2.1.1 | Foreign-function interface for the bindings (T02)                    |
| pycparser             |            transitive / 3.11 | C parser for cffi (T02)                                              |
| Mako                  |           transitive / 1.4.3 | Alembic migration templating (T01)                                   |
| MarkupSafe            |           transitive / 3.0.4 | Mako escaping dependency (T01)                                       |

Only dependencies used by implemented tasks are installed. The implemented roadmap
adds the provider, image, backup and evaluation dependencies recorded below.

## Persistence baseline (T01 implemented)

The approved SQLite plan is [D004](DECISIONS.md#d004--sqlite-for-the-initial-deployment-2026-09-06).
SQLite has no separate LTS edition; the recorded upstream stable release was **3.53.4**,
verified against the [official release history](https://sqlite.org/changes.html)
on September 6, 2026. The managed Python 3.15.0 interpreter (checked
2026-10-11) reports **3.53.1** from `sqlite3.sqlite_version`. The tested runtime
retains the D001 compatibility exception and enforced floor of 3.53.1; this
document does not claim that embedded version is the latest upstream release.

T01 added supported stable SQLAlchemy 2 and Alembic releases to the lockfile,
checks the embedded version in `make db`/CI, and covers the relied-upon
surface with on-disk integration tests. The standard sqlite3 driver is used;
a standalone SQLite CLI does not determine its version.

## Frontend and browser tooling

Node.js **26.11.1** is the current stable installer pin in `.node-version`,
verified against release metadata on October 11, 2026. pnpm **12.11.2** is pinned
in the root `packageManager` field. Their `engines` requirements are
`>=26.11.1` and `>=12.11.2`; the toolchain check accepts newer stable versions.
`pnpm-lock.yaml` records
exact transitive resolutions and integrity hashes; installs use `--frozen-lockfile`.
Project scripts reject versions below these floors and prereleases. Dependency
install scripts are blocked unless explicitly reviewed in `pnpm-workspace.yaml`.
That file sets `pmOnFail: ignore` so pnpm uses the installed compatible version
instead of automatically switching to the exact `packageManager` installer pin;
the engine requirements and toolchain check still enforce the declared minimums.
See [pnpm's setting](https://pnpm.io/settings/cli#pmonfail).

The versions below were checked against official npm metadata on October 11, 2026. Direct declarations use `>=` each listed floor, and the lock records the
listed exact resolution. TypeScript 6.0.3 and Vitest 4.1.11 are explicit compatible
stable exceptions to newer releases; see [D001](DECISIONS.md#d001--supported-toolchain-baseline-2026-09-06)
for evidence. No `skipLibCheck`, lint suppression, or relaxed peer resolution is used.

| Package                       | Floor / locked version |
| ----------------------------- | ---------------------: |
| `@eslint/js`                  |                 10.0.1 |
| `@playwright/test`            |                 1.64.0 |
| `@tailwindcss/vite`           |                  4.3.3 |
| `@testing-library/dom`        |                 10.4.2 |
| `@testing-library/jest-dom`   |                  7.0.1 |
| `@testing-library/react`      |                 16.3.3 |
| `@types/node`                 |                 26.6.5 |
| `@types/react`                |                 19.3.0 |
| `@types/react-dom`            |                 19.3.0 |
| `@vitejs/plugin-react`        |                  6.1.2 |
| `eslint`                      |                10.12.0 |
| `eslint-plugin-react-hooks`   |                  7.1.1 |
| `eslint-plugin-react-refresh` |                  0.5.7 |
| `globals`                     |                17.13.0 |
| `jsdom`                       |                 30.1.2 |
| `prettier`                    |                 3.9.10 |
| `react`                       |                 19.3.0 |
| `react-dom`                   |                 19.3.0 |
| `tailwindcss`                 |                  4.3.3 |
| `typescript`                  |                  6.0.3 |
| `typescript-eslint`           |                 8.71.1 |
| `vite`                        |                  8.3.4 |
| `vitest`                      |                 4.1.11 |

## CI tool pins

Hook commands use uv-locked development packages and pnpm-locked frontend tools;
there are no separately resolved hook environments. CI pins uv to 0.13.0 and
Node via `.node-version`; pnpm/action-setup reads the exact root `packageManager`.

| Action             | Release | Verified commit                            |
| ------------------ | ------- | ------------------------------------------ |
| actions/checkout   | v6.1.0  | `d23441a48e516b6c34aea4fa41551a30e30af803` |
| actions/setup-node | v6.5.0  | `249970729cb0ef3589644e2896645e5dc5ba9c38` |
| pnpm/action-setup  | v5.0.0  | `fc06bc1257f339d1d5d8b3a19a8cae5388b55320` |
| astral-sh/setup-uv | v7.6.0  | `37802adc94f370d6bfd71619e3f0bf239e1f3b78` |

Pins were checked against the official repositories' release refs on September 6, 2026. Ubuntu 24.04 remains the tested CI runner; runner availability was checked
September 6 (see D001). See TASKS for observed hosted CI runs.

Sources: [Node releases](https://nodejs.org/en/about/previous-releases),
[Python downloads](https://www.python.org/downloads/),
[uv locking](https://docs.astral.sh/uv/concepts/projects/),
[uv build backend](https://docs.astral.sh/uv/configuration/build-backend/),
[PyPI metadata](https://pypi.org/), [npm registry](https://registry.npmjs.org/),
[pnpm settings](https://pnpm.io/settings), [Vite](https://vite.dev/guide/),
[Tailwind's Vite integration](https://tailwindcss.com/docs/installation/using-vite),
[Playwright web servers](https://playwright.dev/docs/test-webserver).

## T03–T23 additions

| Package                     | Declared / locked resolution                     | Purpose                                                                                       |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| boto3 / botocore            | `>=1.43.111` / 1.43.111                          | Bedrock Converse and explicit S3 archive transport                                            |
| boto3-stubs / service stubs | `>=1.43.111` / exact service versions in uv.lock | Development-only schema typing; service packages have independent release numbers             |
| Pillow                      | `>=12.3.0` / 12.3.0                              | Bounded raster normalization and original synthetic fixtures                                  |
| pillow-heif                 | `>=1.8.1` / 1.8.1                                | HEIC/HEIF decoder with published Python 3.15 wheels                                           |
| cryptography                | `>=50.0.2` / 50.0.2                              | Authenticated encrypted backup format                                                         |
| PyYAML                      | `>=6.0.3` / 6.0.3                                | Strict operator configuration                                                                 |
| types-PyYAML                | `>=6.0.12.20260906` / 6.0.12.20260906            | Development typing for configuration                                                          |
| Hypothesis                  | `>=6.169.0` / 6.169.0                            | Exact arithmetic properties                                                                   |
| pip-audit                   | `>=2.10.1` / 2.10.1                              | Audit all locked Python dependencies                                                          |
| cfn-lint                    | `>=1.57.2` / 1.57.2                              | Isolated Python 3.14 CloudFormation validation; transitive SymPy never evaluates learner text |
| KaTeX / @types/katex        | `>=0.19.0` / 0.19.0; `>=0.16.8` / 0.16.8         | Restricted trusted-false math rendering                                                       |
| @mlc-ai/web-llm             | `>=0.2.85` / 0.2.85                              | Optional isolated browser research; no weights bundled                                        |
| openapi-typescript          | `>=7.13.0` / 7.13.0                              | Generated frontend API schemas                                                                |
| tools/contracts TypeScript  | `>=5.9.3` / 5.9.3                                | Isolated generator peer compatibility; application remains 6.0.3                              |

The app Python lock resolves 90 packages including development tools; cfn-lint
has a separate infrastructure lock. The initial September audit
identified PYSEC-2026-3552 in cryptography 49.0.0; upgrading to 50.0.1 cleared the
Python audit. The pnpm audit also passed. There is no vulnerability suppression.
Run audits again for release; an earlier pass is not a permanent security claim.

Container bases are digest-pinned in `infra/docker/Dockerfile`; public registry
metadata was verified before pinning. The runtime uses uv-managed Python to retain
the tested embedded SQLite version. CI scans HIGH/CRITICAL findings including
unfixed ones with Trivy action v0.36.0 pinned to
`ed142fd0673e97e23eac54620cfb913e5ce36c25`, and generates a CycloneDX SBOM.
The SBOM is retained for 14 days as the `release-sbom` Actions artifact using
upload-artifact v7.0.2 pinned to `cf430e030ddbb5b0abf93d22962f4752f3646cd9`.
A failed image scan must be fixed or receive a separately documented reviewed
exception; it is never silently ignored. See TASKS for the actual image scan result.

Browser-model files are pinned by exact public repository revision and individual
hashes in `research-manifest.json`. These are metadata, not downloaded weights.
Actual runtime/model/device interoperability remains a maintainer gate (T23).

The first hosted image scan found inherited Debian 12 utilities and unused Python
installer packages (60 OS and two installer findings). D007 replaces the runtime
base with a pinned Distroless Debian 13 image and removes unused installer code.
It retains the exact managed Python/SQLite runtime and locked app dependencies.
The scan threshold and unfixed-vulnerability policy remain unchanged.

## Phone companion QR rendering (T24, 2026-09-07)

`qrcode.react` 4.2.0 renders the expiring upload URL as an SVG locally in the
existing React UI. It ships TypeScript declarations, supports React 19, and adds
no remote QR service, credentials, runtime network calls, or application framework.
The pnpm lockfile pins the package/integrity. See the
[upstream documentation](https://github.com/zpao/qrcode.react).

## T44 toolchain refresh (2026-10-08)

The October 8 metadata review recorded Node 24.21.0 (Krypton LTS), pnpm 12.10.1,
uv/uv_build 0.12.23 and Python 3.14.8. At that refresh, pins, minimum versions, CI,
README and Docker build/runtime stages matched these versions. Public Docker
manifest digests were checked for the exact Node/Python tags before updating.
The managed Python runtime still embeds SQLite 3.53.1, so the documented
compatibility floor/exception remains. The recorded upstream SQLite baseline is
3.53.4; these dated checks do not assert current release availability.

The reviewed TypeScript 7.0.2 release was outside the declared range of
typescript-eslint 8.71.1 (`>=4.8.4 <6.1.0`). Keep the tested 6.0.3
application pin. This update does not claim all application dependency pins are
the newest releases; locked audits and compatibility checks remain required.

Version sources: [Node release metadata](https://nodejs.org/dist/index.json),
[pnpm metadata](https://registry.npmjs.org/pnpm/latest),
[uv release](https://github.com/astral-sh/uv/releases/tag/0.12.23),
[uv_build metadata](https://pypi.org/pypi/uv_build/json),
[Python 3.14.8](https://www.python.org/downloads/release/python-3148/),
[TypeScript ESLint metadata](https://registry.npmjs.org/typescript-eslint/latest).

Vitest 5.0.3 was rechecked during T44: install succeeded, but `pnpm typecheck`
failed with TS2428 because its `Assertion` type parameters conflict with
`@testing-library/jest-dom` 7.0.1. The temporary upgrade was reverted to 4.1.11;
no `skipLibCheck`, declaration patch or suppressed type error was introduced.

## Minimum-only dependency refresh (2026-10-11)

The maintainer requested all direct dependency and tool floors to use `>=`.
The Node 26.11.1 Docker build stage uses the verified public manifest digest
`sha256:86f07bc9c5dce4578cf37e5a418b7bfc7f817cda25cde66e2b66e95ed86c4567`.
The pinned Python 3.14.8 image hosts only the uv installer. The packaged app
uses a separate uv-managed Python 3.15.0 interpreter, with installer cleanup
paths derived from that interpreter's version.
Installers use uv/uv_build 0.13.0 and pnpm 12.11.2.

Python 3.15 wheels were added in pillow-heif 1.6.0 on August 31. The initial
refresh incorrectly treated the absence of those artifacts in the new 1.8.1
release as a library-wide limitation. Fresh official PyPI JSON and Simple-index
checks found Python 3.15 wheels and source distributions in 1.6.0–1.8.0; 1.8.1
initially had neither. The first compatible Python 3.15 resolution used 1.8.0.
By 14:09 UTC on October 11, the official index had completed 1.8.1's publication:
70 files, including 16 Python 3.15/3.15t wheels and a source distribution
(PyPI serial 42091405). A fresh 3.15 install and HEIF conversion passed. The
final release floor and lock are `pillow-heif>=1.8.1` / 1.8.1.

cfn-lint 1.57.2 includes a Python 3.15 code fix but still declares `<3.15` in
its installation metadata. Its development-only requirements and lock now live
in `tools/infra`; Make explicitly selects its Python 3.14.8 pin and separate
environment. Bootstrap, lock checks, infrastructure validation and dependency
audit cover both projects. The app declares `requires-python>=3.15.0`.
No package Python restriction is bypassed. The missing stable Python 3.15 Docker
tag does not limit the uv-managed application runtime.

TypeScript ESLint 8.71.1 retains the peer requirement `>=4.8.4 <6.1.0`;
application TypeScript stays locked to 6.0.3. openapi-typescript 7.13.0 retains
its `^5.x` peer, so the generator stays locked to TypeScript 5.9.3. Vitest
5.0.3 and jest-dom 7.0.1 remain the releases involved in T44's declaration
failure; retain the compatible 4.1.11 lock. Minimum-only direct requirements
allow future compatible updates without changing these floors. Lock refreshes
must still pass strict peer, type, test and audit gates.

Version sources: [Node releases](https://nodejs.org/dist/index.json),
[pnpm metadata](https://registry.npmjs.org/pnpm/latest),
[uv 0.13.0](https://github.com/astral-sh/uv/releases/tag/0.13.0),
[uv_build metadata](https://pypi.org/pypi/uv_build/json),
[pillow-heif 1.6.0 release](https://github.com/bigcat88/pillow_heif/releases/tag/v1.6.0),
[pillow-heif 1.8.0 artifacts](https://pypi.org/pypi/pillow-heif/1.8.0/json),
[pillow-heif 1.8.1 artifacts](https://pypi.org/pypi/pillow-heif/1.8.1/json),
[cfn-lint 1.57.2 metadata](https://pypi.org/pypi/cfn-lint/1.57.2/json),
[cfn-lint Python 3.15 fix](https://github.com/aws-cloudformation/cfn-lint/pull/4717),
[TypeScript ESLint metadata](https://registry.npmjs.org/typescript-eslint/latest),
[OpenAPI TypeScript metadata](https://registry.npmjs.org/openapi-typescript/latest).
