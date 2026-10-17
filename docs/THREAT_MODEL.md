# Threat model and operating limits

The app supports one private household per deployment. The host owner and adult
administrator are trusted with managed learner data. Internet clients, learner
text, model output, and uploaded files are untrusted. Multi-tenant isolation and
regulatory certification are outside the supported scope.
[SPECIFICATION](SPECIFICATION.md#12-security-privacy-and-minors) defines the
requirements; [ACCEPTANCE](ACCEPTANCE.md) tracks unfinished release checks.

| Boundary              | Enforcement and evidence                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser identity      | Argon2id password hashes, hashed random session tokens, expiry/revocation, CSRF and configured Origin/Host checks; no authentication tokens in browser storage                                                                        |
| First-account owner   | Native launcher or private Docker owner socket issues a one-use link; exchange grants a setup-only HttpOnly cookie; CSRF/origin/rate checks and first-account creation in one transaction; no public owner-link issuance or web reset |
| Local password policy | Six-character minimum on HTTP loopback only; short passwords flagged and rejected for network startup, login and authenticated sessions; HTTPS creation retains twelve-character minimum                                              |
| Learner sign-in       | Unique usernames, Argon2id passwords, rate limits and revocable sessions; the administrator creates accounts and resets passwords                                                                                                     |
| Learner ownership     | Backend checks the signed-in learner's ownership on every practice/photo/operation route; two-learner isolation tests                                                                                                                 |
| Private answers       | Separate public response schemas omit hidden answers, seeds and private parameters; AI generation returns an activity, not a solution key                                                                                             |
| Untrusted math        | Bounded ASCII parser and Fraction arithmetic; no eval, SymPy parser, code execution or tools                                                                                                                                          |
| Model authority       | Typed output permits flexible conceptual/reasoning guidance but not permission changes or verified grades; server controls persisted state changes                                                                                    |
| Teaching evidence     | Backend links observations to owned activities/submissions and records help given; teaching memory uses current evidence from the same source, excludes future sections and observations from old prompts; no mastery claim           |
| Homework references   | Accept reference material separately from student responses; generate distinct analogous practice, exclude original assignments from later tutoring context; actual answer-leak resistance needs model evaluation                     |
| Photo interpretation  | Persist and display reading before feedback; automatically continue clear readings; ask for clarification when uncertainty prevents useful feedback; no approval gate; confidence is reported by the model, not measured accuracy     |
| Provider egress       | Operator-managed routes, cloud/audience/capability checks, synthetic tests and validated destinations; model calls run in child processes with enforced limits; no redirects or automatic alternate route (D008)                      |
| Image upload          | Authenticate before decoding; limit upload size/pixels; accept raster formats only; decode/normalize, remove metadata and use random private storage keys                                                                             |
| Browser rendering     | Escaped text, restricted markdown and KaTeX with trust disabled, CSP, no remote images or raw HTML; public-only service-worker cache                                                                                                  |
| Source fidelity       | Reading material and quotations display unchanged; request-size limits allow the permitted Unicode text; saved source offsets exclude future sections from guided model context                                                       |
| Worker recovery       | Short `BEGIN IMMEDIATE` transactions for job claims, lease-token completion checks, six-call budget, saved generation/reading/tutoring stages and one visible result despite retries                                                  |
| Interrupted requests  | Browser session storage holds only request/learner IDs and request kind; receipt lookup enforces ownership, and resolution runs serially with acceptance; no work replay or stored authentication token                               |
| Deletion              | Immediate revocation/cancel, late-result discard, deletion journal with no learner content reapplied on restore                                                                                                                       |
| Repository            | Private-path/key/token checks, locked dependency audits, no credentials or live learner fixtures                                                                                                                                      |

Host files use private permissions and should reside on an encrypted local
volume. The shorter local password policy favors convenience and does not
provide strong password protection. Keep setup links private. An unexpired link
can be exchanged once for an HttpOnly setup cookie with an absolute eight-hour
lifetime. The signature binds the cookie to setup and the configured origin. It
survives API restart with the same secret and cannot authenticate normal app
requests. Renewing a link replaces the unopened token; it leaves an existing
browser setup cookie valid. Account creation closes all setup access. Docker
link issuance requires the owner-only Unix socket through `docker exec`; no HTTP
route issues links. App updates wait until signup finishes before offering a
refresh. Setup never authorizes recovery of an existing account. SQLite does not
encrypt itself. Backups use authenticated encryption with a separate passphrase;
losing the passphrase loses recovery. Preserve the current deletion ledger
separately from old archives. Operator settings/secrets require their own secure
recovery process.

Image access and new vision calls enforce the photo retention deadline even if
storage cleanup is unavailable. Learner/history deletion records pending image
keys in the same transaction as its database purge. The worker retries physical
deletion after storage recovers; pending keys contain no learner text or
identity. Temporary filesystem/database errors produce warnings without private
content and worker retries with enforced limits, without resetting job leases or
provider-call budgets.

The primary tutor provides model-based reasoning guidance across subjects. It is
not an independently verified grade, a proof of mastery, or a guarantee of
factual correctness. A reading marked clear with high confidence can still be
wrong; the student can point out the error or resubmit. The tutor must not guess
unreadable work to produce a solution. The no-homework-answers policy uses
source separation, instructions and bounded output checks. These do not prove
that arbitrary model text can never disclose an answer. Human review of
actual-model failures is required; mock success is not evidence of robust
anti-cheating or handwriting accuracy. Live providers need a reviewed
eligibility/privacy record for the intended audience. An operator can mislabel a
remote endpoint as local; review endpoint DNS/network ownership and apply host
egress controls where required.

Rate limits are process-local and reset on restart, which matches one API
process. JSON body caps are 16 KiB by default, 256 KiB for submitted work and 1
MiB for tutor session/activity creation; these limits allow the text permitted
by the schemas even when JSON escaping increases its size. Images are capped at
8 MiB and 25 million pixels, then normalized to 2048 pixels. Provider response
sizes and deadlines for the whole call are limited: at most 90 seconds per call
plus up to 2.1 seconds of child-process cleanup, six calls and six claims per
operation. Job leases are fixed at 120 seconds; readiness heartbeats do not
extend them. Resource limits reduce abuse; they are not a substitute for
authenticated private deployment.

[ACCEPTANCE](ACCEPTANCE.md) tracks the remaining physical-device, accessibility,
actual-model and private-host recovery checks. AWS account/cost review and
browser-model measurements apply only if those optional phases are pursued.
Automated checks do not establish WCAG conformance, penetration-test coverage,
multi-host availability or production readiness.
