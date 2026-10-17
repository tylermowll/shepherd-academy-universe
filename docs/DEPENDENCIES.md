# Dependency policy and baseline

Direct requirements use minimum-only `>=` ranges. Lockfiles select exact package
versions; installer pins and container digests make the tested build repeatable.
Newer stable Node and pnpm versions are allowed, including newer majors, but
upstream package peers and Python compatibility restrictions still apply.

This guide was checked against repository files on October 17, 2026. It describes
the declared configuration, not the newest upstream releases or the packages in
a running private installation. Dated verification results are in
[task history](history/TASKS.md#release-publication-2026-10-11).

## Version ownership

Use these files for exact declarations and resolutions instead of maintaining a
second package inventory in prose:

| Scope                            | Declarations                                                    | Exact resolutions                             |
| -------------------------------- | --------------------------------------------------------------- | --------------------------------------------- |
| API and Python development tools | [apps/api/pyproject.toml](../apps/api/pyproject.toml)           | [apps/api/uv.lock](../apps/api/uv.lock)       |
| CloudFormation validation tools  | [tools/infra/pyproject.toml](../tools/infra/pyproject.toml)     | [tools/infra/uv.lock](../tools/infra/uv.lock) |
| Workspace and browser tests      | [package.json](../package.json)                                 | [pnpm-lock.yaml](../pnpm-lock.yaml)           |
| Web app                          | [apps/web/package.json](../apps/web/package.json)               | [pnpm-lock.yaml](../pnpm-lock.yaml)           |
| Generated API client tools       | [tools/contracts/package.json](../tools/contracts/package.json) | [pnpm-lock.yaml](../pnpm-lock.yaml)           |

Lockfile updates need fresh validation. See [TASKS](TASKS.md) for changes made
after the last recorded release gates.

## Runtime and installer pins

| Tool                  | Repository pin                                 | Authority                                                                                     |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Application Python    | 3.15.0; requirement `>=3.15.0`                 | [.python-version](../.python-version), API manifest                                           |
| Infrastructure Python | 3.14.8; requirement `>=3.14.8`                 | [tools/infra/.python-version](../tools/infra/.python-version), infrastructure manifest        |
| Node.js               | 26.11.1; requirement `>=26.11.1`               | [.node-version](../.node-version), root manifest                                              |
| pnpm                  | 12.11.2; requirement `>=12.11.2`               | Root `packageManager` and `engines`                                                           |
| uv                    | 0.13.0 in CI/container; requirement `>=0.13.0` | Python manifests, [CI](../.github/workflows/ci.yml), [Dockerfile](../infra/docker/Dockerfile) |

[The toolchain checker](../scripts/check-toolchain.mjs) enforces stable Node/pnpm
versions at or above the manifest floors. [pnpm-workspace.yaml](../pnpm-workspace.yaml)
enforces strict peer checks and blocks unreviewed install scripts. Its
`pmOnFail: ignore` setting allows an installed compatible pnpm instead of
automatically switching it to the installer pin.

The container's Python 3.14.8 build image hosts the installer only. uv supplies
the application Python 3.15.0 runtime, which is copied into the digest-pinned
Distroless Debian 13 non-root image. Build-only installer code is removed.

## Compatibility constraints

- **SQLite:** the application enforces `sqlite3.sqlite_version >= 3.53.1`
  in [settings](../apps/api/src/math_tutor/settings.py). The October 11 managed
  Python 3.15.0 runtime reported 3.53.1. This is the embedded library, independent
  of any SQLite CLI. [D004](DECISIONS.md#d004--sqlite-for-the-initial-deployment-2026-09-06)
  defines the one-host, local-disk deployment boundary.
- **Infrastructure Python:** cfn-lint 1.57.2's recorded metadata excludes Python
  3.15. Its requirements, lock and environment are isolated under `tools/infra`;
  Make explicitly selects Python 3.14.8. Its transitive SymPy dependency never
  evaluates learner text.
- **TypeScript:** application TypeScript resolves to 6.0.3 within
  typescript-eslint 8.71.1's recorded `>=4.8.4 <6.1.0` peer range. The OpenAPI
  generator is isolated with TypeScript 5.9.3 for openapi-typescript 7.13.0's
  `^5.x` peer requirement.
- **Vitest:** 4.1.11 remains locked after the recorded Vitest 5.0.3 /
  jest-dom 7.0.1 declaration conflict. No `skipLibCheck`, declaration patch or
  suppressed type error was introduced.
- **HEIF:** the app floor and lock are pillow-heif 1.8.1. The October 11 release
  passed a Python 3.15 HEIF conversion and container smoke check. Earlier temporary
  1.8.0 results remain historical evidence.

[D001's refresh](DECISIONS.md#d001-floor-only-dependency-refresh-2026-10-11)
records the dependency policy and compatibility decisions. A lock refresh must
still pass peer, type, test and audit gates; minimum-only declarations do not
establish compatibility with every future version.

## Verification and supply chain

The [Makefile](../Makefile) owns commands: `make bootstrap` installs both Python
projects with `--locked` and JavaScript with `--frozen-lockfile`; `make lock-check`
checks their manifests; `make audit` audits both Python locks and pnpm. Audits
must be repeated for a release. A past clean result is not a permanent security
claim.

[CI](../.github/workflows/ci.yml) pins third-party actions by commit and defines
the source, browser, mock-evaluation, audit and container gates. It scans
HIGH/CRITICAL image findings, including unfixed ones, and retains a CycloneDX
SBOM as `release-sbom` for 14 days. Hook commands use the project's locked tools,
without separately resolved hook environments. Image bases and installer pins
are maintained in the Dockerfile rather than duplicated here.

The optional browser-model [manifest](../apps/web/src/research-manifest.json) contains public
repository revisions and artifact hashes; model weights are not bundled.
Runtime/model/device acceptance and download consent remain separate checks in
[ACCEPTANCE](ACCEPTANCE.md#optional-research-and-hosting).
