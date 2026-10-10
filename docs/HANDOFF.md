# Current handoff

The current implementation is **T44**, the adversarial review hardening increment
dated 2026-10-08. It preserves source text and Unicode limits, recovers accepted
tutor commands after lost acknowledgments, and strengthens bounded teaching and
evidence guards. The schema head is `0020_request_recovery`. Recorded automated
checks, container evidence and limitations are in [T44's TASKS entry](TASKS.md#t44--adversarial-review-hardening-2026-10-08).
Those checks do not establish live teaching quality or learning outcomes.

The existing private Compose installation was updated to **T44 source `62b30ca`
on October 10, 2026**, at `0020_request_recovery`. Both writers stopped before a
verified private rollback archive; the tested image then passed HTTPS readiness,
served-asset matching and protected-endpoint checks. Current provider selections
were not inspected or changed, and no inference was run. Image and verification
details are in [TASKS](TASKS.md).

## Next bounded actions

1. **Test and select the actual models.** In administrator **Settings**, authorize
   synthetic **Connection tests**, then choose the tutor and photo reader under
   **Active models**. T44's v4 tutor probe invalidates older tutor tests; the
   photo-reader probe is unchanged. Saving or testing a connection does not
   activate it. Use [PROVIDER_STATUS](PROVIDER_STATUS.md) for the data/audience
   boundaries and exact runtime evidence.
2. **Review real output through the app.** Use original synthetic work and
   [TUTOR_EVALUATION](TUTOR_EVALUATION.md) to check reading fidelity, useful
   teaching, revision/context, distinct homework practice and answer leakage.
   Evaluate learning transfer with supervised human review; scripted fixture
   answers and model self-ratings cannot establish it.
3. **Close host and device acceptance.** The offline development restore passed.
   Verify retained backups/ledger and separately stored settings, secret and passphrase,
   restored app startup and fresh sign-ins. Record physical-phone camera/HEIC,
   QR submission, background/reconnect, installation/update and manual
   accessibility checks in [ACCEPTANCE](ACCEPTANCE.md). Browser-model device
   measurement is optional research and remains separate.

## Current product boundaries

Learners use individual sign-ins and a multi-subject conversation. The worker
persists photo reading before feedback and continues clear task-relevant work
automatically. Essential unreadable content receives specific clarification
advice; incidental uncertainty must not block useful feedback. Rejected reader
reports remain explicitly uncertain conversation context.

Supplied study texts support whole-text or guided-section practice. Reading pace,
activity difficulty and help are separate controls. Goals and sufficient-response
criteria are visible; AI observations remain fallible guidance, never verified
grades or mastery. Uploaded/pasted assignments are reference material for
concepts and distinct analogous practice. They do not become tasks for the tutor
to solve. There is no fixed teaching catalog or photo approval step.

Continue with one bounded task at a time. Preserve private data, regenerate API
clients when schemas change, and use the checked-in Makefile for applicable
gates. Keep historical evidence in [TASKS](TASKS.md) and architecture decisions in
[DECISIONS](DECISIONS.md); use [README](../README.md) and [RUNBOOK](RUNBOOK.md) for
current startup and recovery instructions.
