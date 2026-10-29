# Select verification for the change

The root [Makefile](../../../../Makefile) owns implemented commands;
[SPECIFICATION section 16](../../../../docs/SPECIFICATION.md#16-development-and-release-commands)
owns release requirements. Start with evidence for the affected contract. Do not
repeat a successful unchanged check unless new edits or an unresolved failure
justify it. Existing commit hooks still apply.

| Change                                            | Useful evidence                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation or agent instructions               | Changed Markdown/frontmatter, relative links, referenced commands and applicable file hooks. Validate edited skills with an available skill validator; use independent scoped scenarios when workflow changes warrant them. No new application tests just for wording. |
| Runtime code, dependencies or build/test behavior | Focused regression checks, then `make check`. Add integration checks for affected API, worker, ownership, retention or persistence behavior.                                                                                                                           |
| Public API schemas                                | `make contracts`, `make contracts-check`, serialization/privacy checks and affected consumers. Generated artifacts come from the schema.                                                                                                                               |
| SQLite schema or transaction behavior             | Relevant migration/rollback checks and `make test-integration` on temporary on-disk databases with production connection settings.                                                                                                                                     |
| UI interactions                                   | Relevant component tests and browser journeys, including affected pending/error/recovery and keyboard behavior. Use the existing harness.                                                                                                                              |
| Application release/deployment                    | Full `make verify-local` and the RUNBOOK's exact-candidate container checks. A push's automatic source CI does not replace release evidence.                                                                                                                           |

For local commands that could load application settings, disable environment-file
loading and exclude inherited operator/provider configuration. `--no-env-file`
alone does not clear inherited settings. Fixture servers must also exclude
`SHEPHERD_OWNER_SOCKET` and `SHEPARD_SETUP_TOKEN`, which can retain operator setup
authority despite a temporary database. Use synthetic fixtures and disposable
storage; never inspect private configuration to prepare a test environment.

Keep `make build`/`make check` sequential with integration or browser tests that
mount `apps/web/dist`. A rebuild can temporarily remove `dist/assets` and fail API
setup. Browser runs also share configured ports and output; independent source
reviews may run in parallel.

`make smoke` builds before browser tests; `make smoke-built` requires a matching
build. Use `make hooks-files-check` alongside a completed project gate; it skips
only that duplicate hook. For documentation-only work, normal commit hooks can
still run their configured project checks.

Report environmental failures separately from assertion failures, and record the
actual final command/result after resolving them. Mock evaluations and screenshots
do not establish live teaching quality. Paid/live provider tests, model downloads
and deployments require their own existing authorization.
