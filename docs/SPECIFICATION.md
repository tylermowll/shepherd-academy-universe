# Shepherd Academy Universe specification

This document defines the current product, architecture and safety contracts.
The [README](../README.md) covers setup; [TASKS.md](TASKS.md) records implementation
evidence; [ACCEPTANCE.md](ACCEPTANCE.md) separates automated checks from remaining
model, device and private-host acceptance. Requirements here do not establish
teaching quality or production readiness.

Current scope includes T44. Historical task evidence and superseded decisions
remain in TASKS and [DECISIONS.md](DECISIONS.md), rather than as parallel workflows
in this specification. External references retain their dated verification
record; recheck versions, capabilities and terms when changing an integration.

## Contents

- [1. Product and scope](#1-product-and-scope)
- [2. Deployment and device strategy](#2-deployment-and-device-strategy)
- [3. Learner experience and customization](#3-learner-experience-and-customization)
- [4. Teaching and correctness contract](#4-teaching-and-correctness-contract)
- [5. Application architecture](#5-application-architecture)
- [6. Technology stack and dependency policy](#6-technology-stack-and-dependency-policy)
- [7. Model backends and routing](#7-model-backends-and-routing)
- [8. Configuration contract](#8-configuration-contract)
- [9. Data model and invariants](#9-data-model-and-invariants)
- [10. API and job lifecycle](#10-api-and-job-lifecycle)
- [11. Images, mathematical input, and output safety](#11-images-mathematical-input-and-output-safety)
- [12. Security, privacy, and minors](#12-security-privacy-and-minors)
- [13. Testing and model evaluation](#13-testing-and-model-evaluation)
- [14. Repository and agent instructions](#14-repository-and-agent-instructions)
- [15. Implementation roadmap](#15-implementation-roadmap)
- [16. Development and release commands](#16-development-and-release-commands)
- [17. Hosting runbooks](#17-hosting-runbooks)
- [18. Definition of done and public presentation](#18-definition-of-done-and-public-presentation)
- [19. Maintainer decisions and non-goals](#19-maintainer-decisions-and-non-goals)
- [20. Research references](#20-research-references)

## 1. Product and scope

### The project in one workflow

**Choose a topic → receive an AI-generated activity → photograph or type your work → see the reading → receive specific guidance → revise or discuss → get the next appropriate activity.**

The product is a flexible AI tutor across math, writing, reading, history, social
studies, science, and other subjects. It interprets the student's reasoning and
responds to the conversation, rather than restricting teaching to a fixed
catalog or answer grammar. No school level is required. Reliable retries, data
boundaries, replaceable providers, and evidence-backed evaluation support this
learning experience; they are not substitutes for it.

[D009](DECISIONS.md#d009--ai-tutoring-is-the-primary-product-2026-09-07) records the
maintainer's correction of the original catalog-first implementation. T25 and the
subsequent teaching/material contracts govern the current tutor.
There are **no fixed-template problems and no photo approval gate** in the tutor.

Activity difficulty is a learning preference: `introductory` (Easier), `standard`,
or `challenge` (Harder), defaulting to Standard. Persist it with the session and
apply it to activity and feedback instructions. Easier/Harder next-activity
requests update difficulty and queue the activity in one idempotent transaction.
This is separate from provider reasoning effort. Meta connections may explicitly
select minimal/low/medium/high/xhigh; default omits the parameter. Other adapters
reject non-default effort until their distinct wire contracts are implemented.
Persist selected effort in model-call and probe diagnostics, not reasoning text.
Keep Practice as one chronological session conversation, with current activity
instructions above a bounded scrolling transcript and a stable composer below.
Use one Send action for work and questions. Group attachments, optional help and
explicit next-activity choices in compact controls; put secondary material and
session settings in a desktop side panel or mobile disclosure.
Do not render internal successful activity-generation operations as learner chat.

### First usable release

Deliver a complete, modest application with:

1. An adult administrator, administrator-managed learner accounts, and revocable browser access.
2. Free-text topics, adjustable tutor initiative, AI-generated activities, and persistent practice sessions.
3. Typed work, discussion, and single-photo submissions with automatic reading and quality routing.
4. Specific conceptual guidance, different relevant examples, revisions, and context-aware follow-up activities.
5. A deterministic mock backend, Meta Spark adapter, local Ollama and vLLM adapters, and Amazon Bedrock adapter.
6. Responsive web and installable Progressive Web App (PWA) presentation, containerized self-hosting, tests, and synthetic evaluation fixtures.

Mock workflows establish software contracts, not real teaching quality.

### Deliberate exclusions from version 1

No subscription billing, public registration, school information-system integration, classroom roster import, social features, voice, fine-tuning, retrieval database, arbitrary textbook ingestion, general mathematical theorem proving, or unrestricted agent tools. No native mobile application or promise that a large model runs on an ordinary phone. No “mastery” or learning-outcome claims without evidence.

Pasted or photographed homework is supported as **reference material**, never as
a task to complete for the learner. Generate distinct practice covering the same
concepts. A book passage can ground new comprehension questions; a title alone
does not establish access to the text. Reference intake is separate from the
student's attempted response to an app-generated activity.

## 2. Deployment and device strategy

**Choose a web-first PWA. Keep the location of the application separate from the location of model inference.** Installing the web application on a phone does not install its Python server, database, or language model.

| Mode                    | Application and storage                                                  | Model inference                                                   | Phone experience                                     | Release target              |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------- | --------------------------- |
| Mock development/demo   | Native local processes or optional containers; synthetic SQLite database | Deterministic fixture responses                                   | Responsive browser UI                                | First vertical slice        |
| Fully local server      | Desktop, laptop, or home server                                          | Ollama or vLLM on that machine or an explicitly approved LAN host | Browser/PWA connects to the server                   | Version 1                   |
| Local app, hosted model | Local server and database                                                | Meta API, Bedrock, or another approved endpoint                   | Same browser/PWA                                     | Version 1                   |
| Hosted web app          | Private server or AWS deployment                                         | Approved cloud or private model endpoint                          | HTTPS browser/PWA                                    | After deployment hardening  |
| Offline practice        | Previously installed PWA; public problem pack only                       | None                                                              | Isolated synthetic practice; AI features unavailable | Implemented supporting mode |
| Entirely on-device AI   | Browser storage and a Web Worker                                         | Small, compatible browser model                                   | Experimental; device-dependent                       | Research phase only         |

A local-server deployment can keep learner content off the public Internet when all selected providers are local and external services are disabled. Initial dependency/model downloads still require connectivity unless separately provisioned. “Local” is not a synonym for “no data leaves the device”: analytics, error reporting, remote images, and accidental provider fallback must also be excluded.

### Phone support requirements

Use a single responsive React interface. Support touch, portrait layout, file
selection, camera capture where available, image preview, rotation/cropping and
resubmission.
Always offer typed input and file upload if camera access is denied. Do not
require installing an app from a store.

Camera APIs and service workers have secure-context requirements. `localhost` on a development computer is different from opening that computer's plain-HTTP LAN address on a phone. The phone runbook must provide trusted HTTPS rather than instruct users to disable browser security. [^S10][^S11]

Future offline results must be labeled client-side/unverified if synchronized; a client-supplied score is not trusted server evidence. Offline mode must not silently create cloud jobs on reconnection.

The PWA service worker must initially cache **only versioned public application assets**. Never cache authenticated API responses, photos, conversations, or provider credentials. Installation is not a claim of offline tutoring. When disconnected, show the actual capabilities available; never simulate an AI answer or silently lose a submission.

### On-device research boundary

WebLLM provides browser inference using WebGPU; Transformers.js provides browser model execution with supported converted models. Neither establishes that an arbitrary Qwen checkpoint, its vision component, and the required context will run acceptably on a particular phone. [^S12][^S13]

The research phase must select one exact runtime/model/device combination, begin with text-only support, and measure download size, memory, latency, battery/thermal behavior, browser eviction, and task accuracy. Use a Web Worker, explicit download consent, model provenance/checksums, cancellation, and an unload control. Browser inference is a **separate frontend transport**, not an API key sent from the browser to a cloud service. Do not port FastAPI or the server database to the phone. Sharing a native shell through Capacitor can be reconsidered later; it does not itself solve on-device inference.

## 3. Learner experience and customization

### Primary screens

| Screen                    | Required behavior                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adult setup               | Bootstrap administrator, select audience/privacy mode, configure allowed providers, create learner accounts, set/reset passwords, manage signed-in browsers       |
| Tutor                     | Choose a topic/reference, receive an AI-generated activity, submit work/photo, see reading and guidance, revise/discuss, request a next activity, retry or finish |
| Session review            | Show submitted work, readings, guidance, assistance and unresolved points with source/version metadata                                                            |
| Administration/evaluation | Revoke devices, delete/export learner data, view provider health and redacted usage, run synthetic evaluations                                                    |

Keep learner navigation separate from administrator controls. The learner cannot edit endpoints, credentials, retention, age eligibility, or system safety rules.

T26 refines these screens into purpose-specific pages reached by tab-style
navigation: **Practice**, **History**, **Learners**, **Settings**, and
**Help**. Under D013/T37 administrators see Learners, Settings and Help;
learners see Practice, History, and Help.
Keep provider controls and browser experiments out of the practice page. Use
literal labels and contextual help for topic/reference input, tutor style,
photos, sign-in, age categories, and data processing. Help must distinguish
photo QR uploads from learner account sign-in, explain private HTTPS, and
give an actionable path out of demo/unconfigured states. Ordinary page changes
preserve unsent work and pending request identities in memory; browser history
navigation must not bypass ownership or restore another learner's content.

T37 uses four settings sections without a numbered wizard: **Connections**,
**Data & privacy**, **Connection tests**, and **Active models**. Connections
store model access. Data & privacy controls cloud use and age groups. Tests
make explicitly authorized synthetic calls; Active models chooses the tutor and
photo reader for future work. Unchanged connection saves preserve current tests
and approval; real configuration or credential changes require fresh tests and
role approval. A blocked connection explains each requirement and links to it.

D013/T37 uses one administrator and distinct learner accounts. Learner usernames
are unique after Unicode normalization, whitespace normalization and case folding,
and cannot conflict with the administrator username. The administrator creates
accounts, sets/resets write-only passwords, and manages signed-in browsers beside
the selected learner. The common sign-in form accepts either account type. A
learner sees only their own work. Administrator navigation is limited to Learners,
Settings and Help, with synthetic connection tests in Settings. Practice requires
a learner sign-in.

### Tutor preferences

The primary tutor accepts a free-text topic and an adjustable initiative setting:
`learner_led`, `balanced`, or `tutor_led`. There is no required level or finite
subject catalog. The setting affects how proactively the tutor suggests a next
step and adapts activities; it cannot enable answering the original homework or
change data/provider permissions. Adjustments apply to subsequent requests while
prior responses remain recorded as produced.

Difficulty and reading pace are independent saved session preferences. Explain
directly when requested; do not trap the learner in repeated Socratic questions.
Examples should be relevant and age-appropriate without collecting personal
interests or diagnoses by default. Preferences cannot enable network access,
change provider policy, suppress uncertainty or grant permissions.

### Example walkthrough

The learner chooses persuasive writing. The AI generates a writing activity. The
learner photographs a handwritten paragraph. The worker recovers the paragraph
and its order, preserving mistakes, and returns legibility/organization advice.
The UI shows that reading before the guidance. Clear readings continue
automatically; uncertain readings ask for a specific improvement or retake.
There is no approval button. The tutor discusses the learner's claim and evidence,
offers a relevant example on a different topic, and asks a useful next question.
The learner revises or discusses it. The next generated activity uses the recent
work and the selected initiative setting. The app does not claim a verified grade.

## 4. Teaching and correctness contract

### Flexible teaching, explicit data boundaries

**Generation:** Generate a fresh activity from the chosen topic or the concepts
in reference material. Use recent work to adapt the next activity. Do not expose
an answer key, solve the reference assignment, or present a copied assignment as
new practice. For reading, ground passage-specific questions in text actually
supplied; ask for an excerpt when necessary.

Reading practice stores a typed passage snapshot separately from its question.
The learner can paste or photograph a passage, request an original AI-written
passage, or explicitly import an offered published source. Preserve the full
snapshot for reuse, History and administrator export; guidance and subsequent
questions use the selected section and bounded earlier evidence in guided mode,
or the full text in whole-material mode. Ownership, retention and deletion follow
the activity. Next/Easier/Harder reuse the current section until the learner
changes sections or selects different material. Distinguish original generated
text, photo uncertainties, and published title/author/URL/date/permission metadata.
Models may generate original text only when requested; they cannot replace supplied
passages or invent published attribution. Homework references remain separate
and are excluded from feedback as before. Source imports use a fixed reviewed
catalog and bounded public HTTP; no arbitrary URLs or autonomous model tools.

Practice collects the topic, difficulty, tutor style and optional reference in
one form. It supplies `initial_activity` with session creation so the session,
first activity and pending job are committed atomically. A repeated request key
returns the same session and activity. Photo references create the capture step
directly. Tutor style explanations are visible beside the selector. Composer
menus are mutually exclusive and close on action, Escape and outside clicks.

**Interpretation:** Recover full visible work, including paragraphs, intermediate
steps, labels, and reading order, without correcting its content. Return quality,
confidence, ambiguities, and concrete handwriting/organization advice. The worker
persists the reading before automatically proceeding when quality is `clear`,
confidence is at least 0.85, the transcription is nonempty, and there is no
blocking rejection reason. `clear` means enough task-relevant content is legible
for useful feedback. `ambiguities` records localized uncertainty; incidental
marks, spacing, capitalization, incomplete work or a secondary diagram count do
not alone block feedback on readable content. Incorrect mathematics is not a
readability failure. Counted regions and written labels must be distinguished;
never infer a diagram's count from the expected result. The UI renders the
reading before guidance. No learner approval or browser acknowledgement is
required. The threshold is an uncalibrated routing heuristic, not measured model
accuracy. Essential unreadable content stops automatic photo tutoring and asks
for one specific clarification or cleaner section. Organization advice may be
empty, and must not become a required formatting checklist;
never select a reading because it seems more likely to be the correct answer.

**Tutoring:** Respond to the student's actual work, relevant recent dialogue,
and initiative setting. Answer the latest message's intent directly, including
questions about photo rejection, without forced praise or an unrelated lesson.
Allow an empty next step when the question has been answered. Match explanation
depth to the task objective, selected difficulty and demonstrated understanding;
do not infer mathematical proficiency from handwriting. Identify strengths and likely misconceptions, explain
concepts, ask useful questions, and provide different relevant examples. Be
flexible about teaching style, solution method, and subject. Do not give the active
task's final answer, finish the student's essay, or solve directly supplied
homework. A learner's request or instruction inside an image cannot override that
policy. Raw reference assignments are not replayed into the subsequent guidance
conversation as tasks to solve.

**Evidence:** Reasoning feedback is AI assessment, not independent verification.
Missing exact checking must never block teaching a topic. No model response can
grant permissions, overwrite attempts, change a verified answer key, or certify
mastery. Backend code owns transitions; the learner can revise, discuss, move on,
or finish without a deterministic correct-answer gate.

### Optional exact-math evidence

The bounded exact-math domain supports fraction arithmetic and linear equations
of the form `a*x+b=c`, using integers and `fractions.Fraction`. Its generator,
parser and verifier have independent regression/property tests. Hidden expected
results and private generation parameters stay on the backend. These utilities
and isolated synthetic exercises do not restrict tutor subjects or grade AI
reasoning. Deterministic answer/format verdicts remain separate from model
observations; transcription failures, questions and provider errors are not
incorrect learner attempts.

If the selected AI backend is unavailable, preserve the work and show an
actionable retry/configuration error. Do not substitute a template or authored
hint and call it tutoring. A configured mock is explicitly synthetic and cannot
read handwriting.

### Output contract

Each model call has a typed generation, reading or guidance schema in
[provider contracts](../apps/api/src/math_tutor/adapters/providers/contracts.py).
Generated activities carry a learning goal and 1–3 sufficient-response criteria.
Reading reports carry the visible transcription and qualified readability.
Guidance carries a teaching action and fallible resolved/open observations.
Sufficient work receives acknowledgment without compulsory additional work.
Structured output supports persistence and rendering; it must not impose a
fixed curriculum or scripted teaching dialogue.

Suggested next steps are learner guidance, never executable tools or workflow
commands. The server attaches assistance and source provenance. Do not ask for,
display or persist hidden chain-of-thought. Operational records may retain
reported reasoning-token counts, never raw reasoning. The learner's written
steps and the tutor's concise explanations are normal application content.

Build each prompt from versioned instructions, current topic/initiative, the
current activity, the student's full accepted reading or typed work, and relevant
recent session turns, including failed/canceled attempts and rejected reader
reports explicitly labeled as uncertain evidence. Reader reports are not direct
image access or verified learner work. Retain up to twelve recent exchanges
across the current session's activities and trim whole exchanges to the provider
budget. Never include another session or learner, or promote raw assignment
references into student-work review. Preserve message roles and bound the total context before
calling the provider. Do not replay unrelated histories or retired photographs.
Provider reasoning settings are adapter-specific and require contract tests.

A schema-valid response can still be wrong or reveal an answer. Schema checks,
source separation, and bounded content checks are useful defenses, not proof of
perfect anti-cheating behavior. Evaluate the actual selected model for false
corrections, answer leakage, grounded reading questions, handwriting uncertainty,
and helpfulness. Do not remove flexible tutoring in order to claim perfect policy
enforcement. Keep open quality gates honest.

## 5. Application architecture

Use a **modular monolith**: one Python codebase, one React application, one SQLite database on local disk, and a separate worker process from the same Python codebase. The initial deployment runs one API process and one worker on one host, serving one household. [D004](DECISIONS.md#d004--sqlite-for-the-initial-deployment-2026-09-06) records the maintainer-approved change from PostgreSQL.

```text
Browser / installed PWA
         |
         | same-origin HTTPS; cookie session
         v
Gateway: static frontend + /api reverse proxy
         |
         v
FastAPI routes -> application services -> domain rules
         |                    |
         v                    v
SQLite (local disk)     private image storage
         |
         | durable jobs; claim/lease/retry
         v
Worker -> provider router -> mock / Meta / Ollama / vLLM / Bedrock
```

### Module boundaries

`domain/` owns bounded exact-math generation and verification. It must not import
FastAPI, database models, cloud SDKs or provider clients.

Application modules such as `tutoring.py`, `reading.py` and `providers.py`
coordinate learning contracts and model requests. `adapters/` contains database,
storage and provider implementations; `api/` translates authenticated HTTP
input/output. `worker.py` executes persisted jobs and retention cleanup. Keep
exact arithmetic in domain code and provider wire formats in adapters. The
frontend consumes generated API types, not independently maintained copies.

Use ordinary synchronous SQLAlchemy operations through Python's sqlite3 driver and synchronous provider adapters in the initial implementation. FastAPI routes performing synchronous work use `def`; model calls happen in the worker, not an `async def` route that blocks its event loop. An asynchronous rewrite is not a version-1 requirement.

### Why one database

SQLite is the canonical database in development, local deployment, CI integration tests, and the single-host cloud deployment. No database daemon, password, or Docker installation is needed for native development. PostgreSQL becomes a separate future migration decision if measured write contention, multiple application hosts, or availability requirements justify it; do not maintain two engines now.

API and worker share the same private local directory, including WAL/SHM sidecars. Network filesystems and live cloud-sync folders are unsupported. Enable WAL, foreign keys on every connection, a 5000 ms busy timeout, and `synchronous=FULL`; verify those settings in integration tests. Initialize PRAGMAs outside transactions and explicitly configure SQLAlchemy transaction control, including DDL/rollback behavior. Do not rely on sqlite3 legacy implicit transactions. The exact runtime, storage, migration, and recovery contracts are in D004. [^S21][^S41]

### Durable work without extra infrastructure

From T06, persist the submission and its job in **one database transaction** before returning `202 Accepted`. The worker claims a ready row inside a short `BEGIN IMMEDIATE` transaction, conditionally updates its state/lease, commits the claim, and performs inference **outside** the transaction. Handle lock contention with bounded waits/retries. SQLite has one writer at a time; it does not provide `FOR UPDATE SKIP LOCKED`. [^S21][^S42]

Each job has a lease token, expiration, attempt count, and retry time. Heartbeats extend the lease during long calls. Completion requires a compare-and-set on the current lease token; an expired worker cannot overwrite a newer worker's result. A reaper makes expired leases retryable subject to the retry budget. Persist each pipeline stage so tutoring/retry does not repeat a completed reading.

Unique constraints and transactions enforce at most one final visible result and one applicable progress update per operation. External inference is still **at least once under failures**: a provider may finish a request after the worker loses connectivity, so duplicate charges cannot be ruled out without provider-supported idempotency. Document this rather than claiming exactly-once API execution.

Do not use in-process FastAPI `BackgroundTasks` as the only record of required tutoring work. [^S20] No Redis, Celery, Kafka, Temporal, or LangGraph is required initially. The database worker is intentionally small and requires concurrency/crash tests. If this design becomes a bottleneck, adopt a maintained queue behind the same job interface rather than spreading queue logic through the app.

## 6. Technology stack and dependency policy

Use the latest LTS line where one exists, otherwise current supported stable
releases, with documented compatibility exceptions and exact lockfiles. The
maintainer updated this policy during bootstrap; see [D001](DECISIONS.md#d001--supported-toolchain-baseline-2026-09-06).
Record resolved versions and verification dates in `docs/DEPENDENCIES.md`.

| Area              | Selected stack                                                                  | Constraint / reason                                                                                 |
| ----------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Frontend          | React 19.2, TypeScript 6, Vite 8                                                | Client-rendered application; no server-component or Next.js layer needed                            |
| Node toolchain    | Node.js 24 LTS; pnpm                                                            | Pin an exact pnpm release in `packageManager`; commit `pnpm-lock.yaml`                              |
| UI                | Tailwind CSS 4; semantic HTML; small accessible component set                   | Use the current Vite integration, not old Tailwind initialization instructions                      |
| Routing/data      | React state; typed fetch; browser History API                                   | Owned requests and route state; no permanent draft cache                                            |
| Forms             | Semantic HTML forms; generated API types                                        | Backend remains validation authority                                                                |
| Mathematics       | KaTeX; backend exact arithmetic                                                 | HTML+MathML rendering, `trust: false`, bounded input                                                |
| PWA               | Explicit service worker; generated public asset manifest                        | Prompt before activating an update; cache public assets only                                        |
| Backend           | Python 3.14; FastAPI; Pydantic 2                                                | Tested Python baseline; pinned at 3.14.8                                                            |
| Python tooling    | uv; Ruff; mypy                                                                  | `uv.lock`, typed domain/provider boundaries, no ignored type failures by default                    |
| Database          | SQLite; SQLAlchemy 2; stdlib sqlite3; Alembic                                   | Same on-disk engine/settings in development, tests, and deployment; current stable runtime per D004 |
| HTTP/model access | HTTPX2; boto3 for Bedrock                                                       | Maintained HTTP client; small explicit adapters; no mandatory universal AI framework                |
| Image handling    | Pillow; `pillow-heif` when enabled                                              | Bounded, isolated decoding; EXIF orientation and metadata stripping                                 |
| Authentication    | Server-side opaque sessions; Argon2id administrator and learner password hashes | No tokens in localStorage; learner sign-in and revocation                                           |
| Tests             | pytest, Hypothesis, Vitest, Testing Library, Playwright                         | Unit, property, integration, UI, and end-to-end coverage                                            |
| Packaging         | Native development; optional Docker Compose gateway/API/worker                  | One host and shared local data directory; model server optional; no database service                |
| CI                | GitHub Actions                                                                  | Locked installs, real tests, secret/dependency checks, synthetic-only artifacts                     |

Toolchain selection and compatibility exceptions are recorded in
[DEPENDENCIES.md](DEPENDENCIES.md) and D001. Exact pins live in runtime files,
package metadata and lockfiles; dated external references are not a claim that
those releases remain the newest. [^S14][^S15][^S16][^S17][^S19]

Do not put floating `latest` tags in release images or unbounded provider/model identifiers in a reproducible evaluation. Use reviewed, bounded direct dependency constraints and commit exact transitive lockfiles; record image digests at release. `uv sync --locked` must fail when project metadata and the lockfile disagree; `--frozen` skips that freshness check and is not a substitute for it. [^S22]

If a selected library does not work with the baseline, demonstrate the incompatibility, choose the smallest supported adjustment, and record an architecture decision. Do not silently redesign the stack.

## 7. Model backends and routing

### Required adapters

Adapters are implemented and contract-tested; live verification depends on the
exact endpoint/runtime, model and role. [PROVIDER_STATUS.md](PROVIDER_STATUS.md)
records that evidence and its limits. A passing connection test establishes a
response contract, not teaching quality. “API-compatible” does not establish
support for every model or capability.

| Adapter ID          | Transport                                       | Initial purpose                     | Important boundary                                                       |
| ------------------- | ----------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| `mock`              | In-process deterministic fixtures               | No-key demo, CI, failure simulation | Not an AI model; visibly labeled                                         |
| `meta`              | Meta Model API Chat Completions over HTTPS      | Muse Spark 1.3 hosted testing       | Cloud-only; operator-attested audience and provider-specific mapping     |
| `ollama`            | Native Ollama HTTP API                          | Easy local model hosting            | Select an installed vision-capable model for photos                      |
| `vllm`              | OpenAI-compatible Chat Completions              | Local or private GPU server         | Serving version, model architecture, and vision configuration all matter |
| `bedrock`           | boto3 `bedrock-runtime` Converse                | AWS-managed model inference         | Region, model access, IAM, and model-specific capabilities               |
| `openai_compatible` | Explicitly configured Chat Completions endpoint | Additional private/hosted providers | Bounded compatibility; not universal support                             |

The September reference check identified Meta's `https://api.meta.ai/v1` endpoint
and `muse-spark-1.3` model. Ollama documents vision and structured output; vLLM
documents a compatible serving API. Bedrock Converse capabilities depend on the
selected model and endpoint. Verify the actual configuration before activation.
[^S01][^S04][^S05][^S06][^S08][^S09]

### Adapter wire mapping

| Adapter           | Request mapping                                                                                                                                        | Response mapping / trap to test                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Meta              | `POST /v1/chat/completions`; server-side bearer token; model and messages; image content as `image_url` data URI; provider-supported `response_format` | Extract assistant content and usage from the actual documented response. Validate schema and finish/refusal state; do not leak extra provider fields |
| Ollama native     | `POST /api/chat`; `stream: false`; base64 strings in the message's `images`; JSON schema in `format`                                                   | Read `message.content`; preserve documented token counts. A REST image is base64 data, not a local filesystem path                                   |
| vLLM / compatible | Chat Completions under the configured `/v1` base; image data URI when supported; configured model and supported schema mechanism                       | Test the exact installed runtime. Unsupported schema parameters fail capability probing; do not silently downgrade the requirement                   |
| Bedrock           | `boto3.client("bedrock-runtime").converse(...)`; separate `system`, role/content message blocks, bytes in the image source, and `inferenceConfig`      | Parse `output.message.content` by block type, stop reason, usage and metrics. Do not pass a Chat Completions request body directly to Converse       |

The Meta schema/image mapping, Ollama native wire format, and Bedrock schema mechanism have separate official documentation. In Converse, native JSON-schema output uses `outputConfig.textFormat` where the selected model supports it—not the Chat Completions `response_format` field. [^S38][^S39][^S40][^S09] Derive exact nested payloads from the pinned SDK/service version and save synthetic request/response fixtures. Configure SDK retries to avoid multiplying the application's retry budget. Never guess an AWS model ID, inference-profile ARN, or account permission.

### Qwen is a model family, not a protocol

Expose operator-configured model IDs; do not bake a model release into domain
code. Text serving evidence does not verify image support. Test the complete
photo path with the selected runtime, weights and vision configuration. [^S07]

Record quantization, model revision, context configuration, concurrency, image
limits and measured memory use. Do not promise that a model fits a phone or every
desktop GPU, or assume code benchmarks predict tutoring quality.

### Provider interface

The [provider contracts](../apps/api/src/math_tutor/adapters/providers/contracts.py)
define `Capabilities`, `ModelRequest`, `ModelResult`, `ProviderError` and the
`Provider.complete` interface. They bound message/context, image, response,
output-token and timeout budgets. Requests identify generation, reading or review;
results contain locally validated typed payloads and safe usage metadata.
Keep wire formats in adapters and normalize authentication, throttling, refusal,
unsupported modality, malformed output, context-limit and timeout failures.
Use typed models or frozen dataclasses across these boundaries.

Polling complete validated responses is sufficient. If streaming is introduced,
do not stream raw JSON or unvalidated model judgments into the learner UI.

### Capability and policy routing

Configure two logical routes: `vision` and `tutor`. They may use the same model, or local image interpretation followed by another tutor backend. Route selection must satisfy **both** technical capability and privacy/age policy. Even a transcription can contain personal information; sending only extracted text to the cloud is still a data transfer.

An adapter must explicitly declare a supported capability and pass synthetic probes before the corresponding role can process learner work. Model self-description is not reliable capability discovery. Do not silently drop images or schema requirements to make an API call succeed.

For structured output, prefer the provider's native schema mechanism when available; otherwise use a bounded JSON-only prompt and validate locally. The current implementation permits no automatic schema repairs or transport retries (D006/D008); all calls count toward the operation budget. Do not use regex to extract a convenient object from arbitrary prose and treat it as a successful validated result. Never reinterpret a refusal as malformed JSON and repeatedly pressure the model to answer.

**No automatic local-to-cloud fallback.** If the chosen local model fails, preserve the submission, display an actionable error, and offer retry, typed input or connection repair. Changing the provider requires an adult-approved policy change and must not retroactively replay existing learner data without explicit authorization.

## 8. Configuration contract

Keep secrets outside Git. Supply `.env.example` and `config/providers.example.yaml`
with no usable credentials. Under D010/T27 the authenticated adult can add, edit,
test, select and remove browser-managed AI connections in Settings. API keys are
write-only inputs stored encrypted in the private database; responses report only
whether a key is configured. File-managed connections remain read-only. The
learner cannot supply an endpoint, credential or policy override.

Saving a connection must not call a model or change active routes. Synthetic
tests and route selection require separate explicit adult authorization. Changes
to endpoints, models, credentials or policy invalidate prior capability evidence
and pending request policy where applicable. API and worker see saved changes
without a process restart. Global cloud/audience controls are available to the
adult in Settings; deployment environment restrictions remain authoritative and
are explained when they lock a control. Demo mode cannot be changed in the UI.

`configured_context_limit` is operator-declared model metadata used for
conservative request budgeting, not a request to allocate that window. Accept
values from 2,048 through 2,147,483,647 so million-token models are representable;
keep actual message, output, image and request sizes independently bounded. The
frontend and both public/private provider schemas must use the same limits.

The persistent local launcher generates only missing settings, loads them without
shell evaluation, validates configuration before building, initializes a fresh
database, and provides a private one-use browser setup link for the first adult
account (D011). Restarting must not
reset the account or replace settings/data. Upgrading retained databases requires
an explicit stopped-write migration. See D010 for credential backup/recovery.

### Environment

The supported variables are documented in [`.env.example`](../.env.example).
`make setup` generates private settings; bootstrap only installs dependencies
(D006). Fixed image and inference budgets are enforced by the backend.

`APP_AUDIENCE` is `adult_only`, `mixed`, or `unknown`; unknown receives the stricter routing policy. The adult assigns a coarse eligibility category where needed—do not collect dates of birth. `APP_MODE=demo` prohibits real uploads, custom free-text learner data, and external model calls; it uses supplied synthetic interactions and photos only.

Native and container configuration use absolute data paths. Native setup generates an absolute path under the repository's ignored `data/` directory; all commands and processes must resolve the same file regardless of working directory. Protect the directory, database, and sidecars with restrictive permissions; SQLite has no database password. Setup generates the session secret, and startup rejects its placeholder. Localhost development may use an explicitly named development cookie configuration. Non-loopback private deployments require HTTPS, authenticated access, and production cookie settings. `.env` is a convenience for local operation, not the production secret-management design.

### Provider configuration example

Use the strict current [provider example](../config/providers.example.yaml) for
advanced file-managed connections; it is application configuration, not a vendor
SDK configuration file.

Disabled examples may contain placeholders; enabled routes may not. `host.docker.internal` requires appropriate host-gateway mapping on Linux. Inside a container, `localhost` is that container, not the host. When the model server is another Compose service, use its service name instead. Never expose Ollama/vLLM directly to the public Internet as a shortcut.

Enforce a bounded request budget in the database. Transport retries and schema repairs both count. Honor valid throttling hints with jittered backoff, and do not retry ordinary authentication/validation errors. Estimated cost is shown only when a dated pricing configuration exists; otherwise show reported tokens and mark cost unknown. Do not hardcode today's prices into business logic.

## 9. Data model and invariants

Use UUID identifiers, timezone-aware UTC timestamps, database constraints, and Alembic migrations. Persist UUIDs consistently as text; normalize timestamps through a tested adapter that rejects naive inputs and returns aware UTC values. SQLAlchemy JSON serialized as text is appropriate for schema-validated versioned payloads; it must not replace relational ownership and integrity constraints. Exact arithmetic stays in bounded integer/rational domain code.

Test migrations on temporary on-disk databases with production connection settings. Use Alembic batch operations where a schema change requires a table rebuild; preserve named constraints and existing data, check foreign keys afterward, and run controlled migrations while API/worker writes are stopped. [^S41][^S43]

The [database models](../apps/api/src/math_tutor/adapters/db/models.py) and
[migrations](../apps/api/migrations) define exact fields and constraints. The
primary records are:

| Records                                                     | Purpose                                                                                                  |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Administrator, learner, device session                      | One administrator, unique learner credentials/eligibility and revocable owned access                     |
| Practice session, problem instance                          | Topic, initiative, difficulty, ordered generated activities, criteria and saved passage/section state    |
| Submission, interpretation, tutor turn                      | Work/question, durable status, displayed reading and validated guidance with prompt/source provenance    |
| Job, worker heartbeat, model call                           | Lease/retry/call budgets, worker readiness and content-free model diagnostics                            |
| Provider connection, policy, route selection, probe/results | Encrypted write-only keys, audience/cloud ceilings, active roles and dated synthetic capability evidence |
| Phone upload, canceled request                              | Scoped expiring photo delegation and owned receipt-resolution tombstones                                 |
| Deletion tombstone, photo deletion, audit event             | Restore-safe deletion, durable opaque cleanup references and content-free audit records                  |

Use schema-validated JSON for bounded teaching/passage metadata, with relational
ownership and integrity constraints. Optional exact-exercise records preserve
verified answer/format results separately from AI guidance.

A single private deployment is the supported isolation unit. Every learner route
must enforce the authenticated learner's ownership through backend queries, not
merely possession of a UUID. Administrator-only exports cover managed learners;
administrators use synthetic model probes rather than learner Practice.

Essential invariants:

- Public types omit hidden answers, private parameters, credentials and internal evidence links.
- Saved work/readings and original feedback remain attributable to their version and source until deletion.
- A duplicate request key with the same canonical payload returns the accepted command; a different payload returns `409 Conflict`.
- Recovery resolution serializes with acceptance and blocks late acceptance before a replacement command is allowed.
- Retries create at most one visible result and one applicable progress event.
- Deleted/canceled work cannot return through a late worker result or restore.
- Learner settings cannot change endpoints, credentials, audience or cloud policy.
- Historical observations remain visible; only current eligible provenance informs adaptive memory.

## 10. API and job lifecycle

The API exposes `/health` and `/health/live` for liveness and `/health/ready`
for database/worker readiness. Application routes use `/api/v1`. Generate `contracts/openapi.json` from FastAPI and the TypeScript client/types from that file. Treat generated files as read-only and make CI reject drift.

[Generated OpenAPI](../contracts/openapi.json) defines exact methods and typed
schemas. Application route families below use `/api/v1`; health probes do not:

| Route family                                          | Access and behavior                                                                                                    |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/auth/session`, `/auth/login`, `/auth/logout`        | Minimal session/CSRF bootstrap and rate-limited opaque-cookie account sign-in                                          |
| `/auth/setup` and `/auth/setup/session`               | One-use owner-link exchange and scoped first-account creation; never public setup-token issuance or account reset      |
| `/admin/learners`                                     | Administrator-managed credentials, browser revocation, authenticated export and deletion                               |
| `/tutor/sessions`                                     | Learner-owned topic/initiative/difficulty sessions, atomic initial activity and subsequent generation/settings/history |
| `/problems/{id}/submissions`, `/problems/{id}/photos` | Owned versioned work/questions and bounded raw photo submission; persist before returning durable operation state      |
| `/tutor/request-receipts/{key}`                       | Owned acceptance lookup and explicit resolution of interrupted commands without work replay                            |
| `/operations/{id}`                                    | Owned polling, bounded retry and cancellation; discard late results                                                    |
| `/admin/providers`                                    | Administrator-only save, policy, synthetic tests and separate active-role selection; credentials remain write-only     |
| `/phone-upload`                                       | Expiring upload capability; no learner browsing or account access                                                      |
| `/health/live`, `/health/ready`                       | Content-free readiness, never paid inference                                                                           |

Work-creating commands require `Idempotency-Key`. Versioned mutations reject
stale assignments with `409` and a safe explanation. Serialize conflicting
active operations for one activity rather than interleaving their results.
Learner Practice and History require a learner sign-in (D013).

### Phone camera companion (T24)

An authenticated owner may delegate one photo submission for the current problem
to a phone without account sign-in. A two-hour opaque upload secret grants only bounded
preview/upload and a content-free receipt, never session browsing or confirmation.
Store only its hash and bind it to the issuing device session, problem and
assignment version. The QR carries the secret in a fragment, not a server URL
path/query; requests present it in a header. Generate QR images locally.
Revalidate the issuing session, learner, problem, session state and provider
policy before accepting bytes and again after decoding. A replacement link
invalidates the previous link. Identical retries acknowledge one submission;
reuse with different bytes is rejected. Expired links are swept. In the primary
tutor, clear readings continue automatically without computer-side confirmation.
Reference-photo targets use the same scoped upload to derive distinct practice,
never to answer the original. This deliberately scoped delegation supplements
the ordinary account sign-in and ownership contract; it is not a learner login.

### Submission state machine

Primary T25 workflow: topic/reference → durable generation → assigned activity;
typed work/discussion → durable tutoring → guidance; photo → reading → automatic
tutoring when clear, or rejected-with-advice when uncertain. A clear reference
photo resumes generation of a distinct activity instead of reviewing the original.
The reading persists and is displayed before feedback. There is no approval gate.

```text
Activity:        queued -> generating -> assigned
Typed work:      queued -> tutoring -> completed
Photo work:      queued -> interpreting -> queued -> tutoring -> completed
Reference photo: reading -> distinct activity generation
Unclear photo:   interpreting -> failed with specific clarification advice
```

These are product stages; stored job/status values are defined by the schemas.
Failed/canceled stages preserve accepted work and safe errors. Permitted retries
resume the saved stage within the operation's budget. Reading rejection requires
cleaner/clarified work rather than repeatedly rereading the same unusable photo.
A provider failure never becomes a learner's wrong-answer verdict.

Poll while the page is visible and reconnect by operation ID. After reload,
recover the owned receipt without automatically replaying work. Do not rely on
mobile background timers for durable execution.

## 11. Images, mathematical input, and output safety

### Image processing

Accept one JPEG, PNG, WebP, HEIC, or HEIF image per submission. Decode with pinned,
tested `pillow-heif` support where required, then strip metadata and create one
bounded JPEG for preview, private storage, and the provider request [^S37].
Unsupported files receive a clear conversion/retake option. Do not accept PDFs,
SVGs, archives, or arbitrary remote image URLs in version 1.

The application-specific defaults are 8 MiB upload size and 25 million decoded pixels, with a normalized image bounded to 2,048 pixels on its longer side. T24 raises the former 24,000,000-pixel cap slightly to admit 24 MP-class phone images (for example, 5712 × 4284 = 24,470,208 pixels); 48 MP originals remain outside the budget. Provider adapters may apply stricter documented bounds, but must report an incompatible upload rather than silently clipping work. Evaluate readability before reducing these defaults.

Authenticate and authorize before accepting the body where feasible; cap size at both gateway and application. Validate file signatures and actual decoding, not just extensions/MIME headers. Use bounded decoding resources, apply orientation, flatten/re-encode to a safe raster format, strip metadata, generate a random storage key, and store outside the web root. A filename is never a filesystem path. Test corrupt, oversized, misleading, and decompression-bomb inputs. These controls follow the threat categories in OWASP's upload guidance. [^S23]

Show the prepared image preview before submission. Avoid detecting or retaining faces, handwriting identity, or location. Do not infer that a photograph contains no personal data merely because obvious names were removed. The provider receives private image bytes through its supported API—not a permanently public object URL.

The picker explicitly accepts JPEG, PNG, WebP, HEIC and HEIF MIME types and
extensions; dragging a single file into the same control uses identical server
validation. Decode HEIC/HEIF on the server before the browser preview. Normalize
to metadata-free JPEG (quality 90, bounded to 5 MiB with quality 85/80 fallback)
and declare JPEG consistently in provider payloads. Do not expand photographs
into large lossless PNG/base64 requests. Display preparation and model-processing
status with accessible text and a reduced-motion-aware spinner.

### Mathematical input for exact checks only

These parser bounds apply to exact-math utilities, not to general tutoring work.
The AI tutor accepts bounded text and photographs across subjects and methods.

Use a deliberately limited parser: bounded signed integer, fraction, decimal, and `x = value` forms appropriate to the template. Define normalization, maximum length, integer bounds, zero-denominator handling, and decimal-to-rational conversion explicitly. Preserve the original entry for feedback. More advanced grammar requires a new task and tests.

Never pass learner/model text to `eval`, `exec`, Python `compile`, a shell, unrestricted `sympify`, or `parse_expr`. SymPy explicitly warns that `parse_expr` uses `eval`; it is not an untrusted-input sandbox. [^S24] SymPy is not required for the bounded exact domain. A later symbolic verifier must build expressions through an allowlisted grammar and bounded constructors.

### Rendered responses

Render restricted Markdown, not raw HTML. Disable raw HTML, external images, and unsafe URL schemes. Keep KaTeX `trust: false`, enforce expansion/size/input limits, and use its accessible HTML+MathML output. The relevant options are documented by KaTeX. [^S25]

Treat instructions in images, learner text, and model responses as untrusted content. The tutor has no filesystem, shell, browser, database tool, MCP integration, or ability to invoke a provider URL named in submitted text. Output text cannot grant permissions. Prompt-injection resilience comes primarily from these boundaries, not a sentence claiming injections are impossible.

## 12. Security, privacy, and minors

### Authentication and authorization

D014 defines first-account creation through a one-use owner setup link. The
unopened link expires after thirty minutes. The browser removes the token from
history and exchanges it in a CSRF-protected request for a signed HttpOnly cookie.
The cookie has SameSite=Strict, Secure on HTTPS, path `/api/v1/auth/setup`, and
an absolute eight-hour expiry. Its signature binds it to setup and the configured
origin. It survives reloads and API restarts with the same deployment secret,
but cannot authenticate ordinary app requests. Discard the owner token after
exchange. Setup checks Origin, CSRF, expiry and rate limits, and atomically
verifies no administrator exists.
Successful setup creates the account and authenticated session; setup never
resets or adds an account after the first claim. Form errors leave services
running and allow correction. Hash passwords with maintained Argon2id.

Native startup prints the setup link. The standard Docker API offers a Unix
socket in an owner-only tmpfs directory (700 directory, 600 socket),
with no network route for issuing owner links. The local `docker exec` command
checks the current database and rotates the process-memory token hash/expiry;
an existing administrator permanently closes issuance. `make start` reconnects
to the recognized running Docker API on port 8000 before loading native settings
or starting another database. Explicit alternate environment files, `make dev`
and `make serve` select native startup.
While first-account setup or its captured authority is active, a waiting PWA
update must defer its refresh action. Once signup establishes the authenticated
session, the normal explicit update action is available. Before submission,
refresh anonymous CSRF so idle forms remain usable. Success or cancellation
clears the setup cookie. Passwords and owner tokens stay out of browser storage.
The Settings page must finish loading when the post-signup session refresh returns
the same identity. Rechecking an unchanged CSRF token and authenticated state must
not invalidate pending requests. Discard responses from a previous identity,
including responses whose body finishes decoding after the identity changes.

HTTP origins with exact loopback hostnames `127.0.0.1`, `localhost` or `::1` allow
six-character passwords; HTTPS requires twelve. Do not impose composition rules.
Passwords below twelve mark accounts local-only.
Network startup, login and adult session use reject local-only credentials.
Keep the explicit local administrator-reset command for recovery/strengthening,
not unauthenticated web account recovery. Restarts preserve existing accounts.

D013/T37 replaces passwordless pairing with administrator-managed learner
credentials. Passwords follow the same local/network length policy and Argon2id
hashing as the administrator. Login rechecks the password hash, enabled/deleted
state and network eligibility inside the session-creation transaction, preventing
a concurrent reset from being bypassed. Password reset revokes learner sessions;
no public account list or password recovery is exposed. The CLI cannot create a
second administrator. A learner session cannot become an administrator session by
switching profiles.

Use `HttpOnly`, `SameSite=Lax` or stricter cookies, `Secure` outside loopback development, and an origin-bound CSRF token/header on state-changing requests. Validate `Origin`/host and scope trusted reverse-proxy headers. Restrict CORS to named development origins; production uses same-origin routing. Rate-limit login, uploads, and model operations. Never store cloud credentials or auth tokens in the frontend bundle or localStorage.

### Data boundary and retention

Default to mock/local inference and no telemetry, advertising, session replay, remote fonts, or externally hosted application images. UI labels show where text and photos will be processed before submission. All cloud routes require explicit adult/operator activation; policy must be checked server-side on every operation and before every provider call.

Store normalized photos privately and delete them after processing completes; failed/unprocessed photos expire within 24 hours by default. Explain that this limits later visual review. Text/session history defaults to 30 days, configurable by the adult. Purge derived progress when its source learner/history is deleted unless the adult has explicitly selected a documented separate retention rule. Do not retain “anonymous” copies by default.

Deletion revokes access and cancels jobs immediately, then deletes active database/storage content through an idempotent purge operation. Late worker results must be discarded. Logs avoid content and credentials; exports are immediate authenticated no-store downloads (D006), and downloaded copies cannot be revoked remotely. Backups have a stated retention window and a restore procedure that reapplies deletion tombstones. Deletion from the application cannot promise immediate removal from provider-side logs or preexisting encrypted backups; document each boundary.

Learner/history purges commit pending opaque image keys in a `photo_deletion`
table before removing their owning records. The worker retries physical deletion
without retaining deleted learning content or losing cleanup references on
restart. A failed file removal must not stop unrelated cleanup or tutoring.
Expired photos cannot be downloaded or sent to a provider even if physical
cleanup is delayed. Worker database/storage failures have bounded retry waits;
single-pass operator commands report failures with a nonzero exit status.

### Provider age and data policies

Meta's hosted API has provider-specific age and data terms. Under D012, the adult
operator selects and attests the audience that their current agreement and
jurisdiction permit; the app displays a disclaimer but does not hard-code a
provider age restriction or certify eligibility. The backend still enforces the
selected audience for every learner request, together with explicit cloud
authorization. A locally hosted Llama model uses its separate model license and
acceptable-use policy and is configured through Ollama or vLLM, not the hosted
`meta` adapter. [^S02][^S46]

Meta documents different Standard and Contributor data-use treatment. Keep Contributor disabled for real learner data. Public source code does not make photos, application logs, environment files, or conversations public data. Non-training promises do not automatically mean zero retention. [^S03]

Bedrock is not a blanket permission for any age or use. Review the chosen model's terms, AWS settings, logging, region, and application obligations. Use workload IAM roles and temporary credentials instead of embedded long-lived keys. [^S26][^S27]

An OpenAI-compatible protocol does not inherit OpenAI's product terms. Each actual provider needs an eligibility record. OpenAI separately publishes under-18 API guidance, including conditions around under-13 personal data; do not treat that as automatic approval for this application's configuration. [^S28]

A public hosted child-facing service requires a separate launch review, including applicable children's privacy obligations. The FTC's COPPA guidance is one relevant US reference; this specification is not a compliance certification. No “COPPA compliant,” “FERPA compliant,” or “safe for every age” badge should be generated from this design alone. [^S29]

### Deployment hardening

Expose only the gateway; keep API/model ports and database files private. Use non-root containers, minimal capabilities, read-only application filesystems where practical, bounded temporary storage, secret mounts, dependency updates, restrictive security headers, and a Content Security Policy compatible with the selected renderer/PWA. Do not expose private FastAPI interactive documentation publicly by default.

Provider endpoints are operator-managed, allowlisted, and immutable to learner requests. Permit named loopback/private endpoints only when deliberately configured for local inference. Block redirect-based endpoint escape, link-local metadata targets, user-info URLs, and arbitrary user-supplied destinations. Published imports use reviewed source destinations; learner/model text cannot choose a retrieval URL.

The tutor should remain an educational tool, not claim to be a human friend or professional, request secrets, or encourage dependency. If a learner raises a serious safety concern, provide a brief appropriate safety response instead of rigidly insisting on math. Do not send automated messages to parents or emergency services. Evaluate these behaviors without claiming that a filter eliminates all risk.

## 13. Testing and model evaluation

### Four different test layers

**Domain/contract tests:** typed activity/readability/guidance output, sufficiency
and known answer-leak guards, literal source/codepoint limits, section fidelity,
source-scoped teaching memory and assistance provenance. Keep exact-arithmetic
properties and hostile-input parser tests as supporting domain checks.

**Integration tests:** real SQLite migrations and constraints on temporary on-disk databases, authorization across two learners, job leases, worker crashes, deletion races, configuration policy, and provider wire formats. Verify connection settings, lock contention, rollback, and persistence after reopening. Use independent connections/processes for competing claims and stale leases even though deployment configures one worker. Fake provider HTTP responses are acceptable for transport tests, but mocked SQL or in-memory-only databases do not satisfy transaction/concurrency gates.

**UI/end-to-end tests:** learner/admin separation, work/discussion/photos, reading
before feedback, guided navigation, request recovery, updates and deletion. Use Playwright in CI, and record separate manual checks on actual phone Safari/Chrome. Desktop browser emulation is not proof of real-device camera/HEIC behavior. [^S30]

**Model evaluations:** original or licensed cross-subject activities, source
passages, student misconceptions/revisions and handwritten fixtures with known
readings and explicit quality/failure rubrics. Evaluate an exact provider/model/runtime/prompt/profile combination. Mock responses test software orchestration, not model quality.

### Required acceptance scenarios

[ACCEPTANCE.md](ACCEPTANCE.md) is the current acceptance map. It covers topic and
material generation, source fidelity/guided progression, automatic qualified
photo reading, responsive teaching, reference-only homework, ownership/provider
policy, durable recovery and deletion, safe uploads/rendering and app updates.
Keep automated contract evidence separate from actual-model quality, physical
phones/accessibility and private-host restore acceptance. Historical exact-math
fixture identifiers remain evidence in TASKS, not a parallel tutor workflow.

### Model evaluation reporting

Track transcription exactness and ambiguity handling separately from final-answer accuracy and pedagogical quality. Report denominator/sample size, fixture categories, failures, model/prompt versions, and date. Include false correction, premature solution disclosure, correct-answer rejection, schema failure, refusal handling, latency percentiles, token usage, and configured cost estimate when available.

Start with at least 30 original fixtures across clear, messy, rotated, ambiguous, and adversarial work; expand before making broad accuracy claims. Hold back a small set not used to tune prompts. A model-based judge may assist triage but cannot be the only authority; exact checks and adult review of rubric-scored examples remain necessary. Report measured results, not aspirational numbers or an invented “99% accurate” badge.

Functional/security acceptance scenarios must all pass. For model rollout, the adult maintainer reviews every error in the initial evaluation set and records whether the intended use is acceptable. A small passing fixture set is not proof of general tutoring reliability or improved learning.

## 14. Repository and agent instructions

### Current implementation

The source layout is [apps/api/src/math_tutor](../apps/api/src/math_tutor) and
[apps/web/src](../apps/web/src), with generated public contracts in
[contracts/openapi.json](../contracts/openapi.json). The [README](../README.md)
and [TASKS.md](TASKS.md) record supported features, commands and evidence. Create
modules only when they have behavior; a planned architecture does not justify
empty production stubs.

[AGENTS.md](../AGENTS.md) owns repository working instructions and the
[implementation skill](../.agents/skills/implement-task/SKILL.md) owns the bounded
task workflow. Prefer one current implementation; do not add legacy compatibility
shims or development-schema bridges without a maintainer request (D005).

### AGENTS.md and .agents are different

`AGENTS.md` is the repository instruction convention; nested files refine instructions for their directories. The Agent Skills standard defines a skill directory with a `SKILL.md` containing YAML metadata and instructions. [^S31][^S32]

Use `.agents/skills/<name>/SKILL.md` as the canonical repository location. OpenAI's current Codex documentation explicitly describes discovery there. That does **not** mean every coding client—including every Muse Code version—automatically discovers the same directory. [^S33]

For Spark/Muse Code, the portable fallback is explicit: tell it to read `AGENTS.md` and the relevant skill file before each task. Verify its installed client's current instruction/skill discovery using that client's documentation/help. If it requires another location, add a thin documented link/wrapper to the canonical file and test discovery; do not maintain competing copies of the instructions. A folder called `.agents` does not create runtime agents, grant permissions, or automatically execute scripts.

Keep the root instructions short. Detailed requirements belong in this specification or in task-specific documents, and skills should point to the relevant sections. Do not preload every skill and every document into every prompt. Agent Skills guidance recommends compact skill bodies with detailed reference material loaded when needed. [^S34]

### Agent working method

Before changing code, the agent checks repository status, reads the task and governing instructions, identifies affected contracts, and writes a small implementation/test plan. It then implements the smallest vertical slice, runs targeted tests, runs broader checks when applicable, and records exact evidence in `docs/TASKS.md`.

Do not let the agent declare a task complete because it created files or because the interface “looks right.” Do not let it remove assertions, relax policy, skip failing tests, or rewrite the specification to hide an implementation failure. A command not run must be labeled “not run,” with the reason. Real-provider tests requiring credentials are reported separately from mock/contract tests.

Bound each implementation task and assign non-overlapping files for parallel
review or maintenance. Reviewers must not race to edit the same files. No background promise, autonomous deployment, paid cloud provisioning, secret rotation, or publication to GitHub without explicit maintainer authorization.

## 15. Implementation roadmap

[TASKS.md](TASKS.md) owns the current task queue and completion evidence.
[DECISIONS.md](DECISIONS.md) owns product/architecture supersession. Completed
bootstrap, catalog and pairing roadmaps are historical evidence, not current
requirements. Each new task needs bounded scope, affected contracts and exact
exit evidence. Keep incomplete work open and name the concrete next action.

The following recent contracts remain normative for the current tutor.

### T41 maintenance contract

T41 depends on the current T25 tutor, D013/T37 account model, and T38–T40 startup
and setup behavior. Its deliverable is a role-by-role reliability review and a
bounded repair of broken transitions: acknowledged tutor/provider saves remain
recoverable without duplicate work, page focus and account handoffs are explicit,
the conversation and its controls remain usable at supported desktop/mobile
widths, native and Docker instructions form executable sequences, Docker API and
worker service definitions carry the same host-model routing configuration, and
locked dependencies have no known vulnerability at review time.

Exit evidence requires focused component regressions, the complete backend,
frontend, integration and desktop/mobile browser gates, locked dependency audits,
and a hosted `docker compose config` check before the container build/smoke/scan
job. Real phone/accessibility checks, live provider quality, and the private-host
release rehearsal remain explicit external acceptance work; their absence must
not be reported as automated completion.

### T42 reading-comprehension contract

T42 depends on T25/T41. Deliver pasted, photographed, AI-written and selected
published passages with independent persistence/display, grounded feedback and
same-passage next questions. Published imports preserve provenance and bound
network time, response size and destination. Regenerate public contracts and
add source fidelity/reuse/reopen/export/deletion, ownership, input and source
failure regressions. Exit evidence includes `make check`, `make test-integration`,
`make smoke`, and `make eval-mock` with the original reading suite. Live model
quality and physical photo/device/accessibility acceptance remain separately
recorded human gates; mock contracts cannot close them.

### T43 shared teaching and material progression contract

T43 builds on T42 across all subjects. Generated activities persist their concept
goal and bounded sufficient-response criteria. Feedback selects a typed teaching
action and records fallible, evidence-linked observations without changing grades,
permissions, completion or learner-controlled progression. Subsequent requests
retain resolved and open points, distinguish supported from independent work,
acknowledge sufficient responses, and avoid repeatedly assigning resolved work.
Explanation requests receive focused explanations; optional extensions are explicit.

Store pasted or imported reading/study text up to 50,000 characters with its exact
source and attribution. Photo transcriptions, AI-written passages and homework
references retain their 8,000-character ceilings; newly generated guided passages
must fit the selected section length. Whole-material and guided-section modes keep
material amount separate from activity difficulty. Guided sections preserve source offsets and
provide explicit learner navigation, persistence and restart recovery. Saved
material remains navigable after generation failure, including changing an
oversized whole-text request to guided sections. Tutor context contains the
selected section and appropriate previously read evidence,
with later sections excluded in guided mode. Text from any subject is supported;
homework remains reference for distinct practice. No new external tools, model
autonomy, service or database engine is introduced.

Display activity purpose/criteria and honest demo/provider readiness without
exposing private connection settings. Regenerate public contracts. Regression
coverage spans multiple subjects and multi-turn sufficiency, explanation,
revision, uncertainty and progression. Mock/schema success is not teaching-quality
acceptance. Required gates: targeted unit/integration/component/browser tests,
`make check`, `make test-integration`, `make smoke`, and bounded mock evaluation.
Live-provider and physical-device evidence are recorded separately.

### T44 adversarial review hardening contract

The maintainer authorized closing the T43 adversarial review gaps and pushing
the validated increment to `main`. Preserve source text literally, including
currency, markup-looking punctuation and Unicode; count input limits in Unicode
codepoints and retain excess input with an explicit validation error. Submission
body budgets must accommodate the accepted schema's encoded Unicode payloads.
Whole-text input must be constrained by the configured model context rather than
an unrelated 32,000-character message ceiling.

Persist only opaque pending command identifiers in browser session storage.
Recover accepted session/activity/submission receipts with backend ownership
checks. Explicit resolution of an absent receipt must serialize with acceptance
and exclude delayed acceptance before replacement is allowed. Do not persist
draft text, photos or session tokens, or automatically replay work after reload.
Defer app updates while tutor commands are pending; warn about unsent drafts.

Add bounded rejection of the reproduced copied-homework equation, answer-bearing
criteria and sufficient feedback requiring further work. Keep assistance and
source provenance server-owned, retain appropriate earlier guided context and
exclude future sections. These guards reduce known failures; they do not verify
the semantics of every model response or establish teaching effectiveness.

Extend synthetic evaluation to actual learner misconceptions, questions,
revisions, supported concise alternatives, guided navigation and independent
answers to distinct fixture-authored transfer activities. Preserve the historical
reports and identify mock results and pending human judgment explicitly. Refresh
verified toolchain pins and current documentation. Required gates are targeted
regressions, `make check test-integration smoke eval-mock audit hooks-check`,
and container packaging checks for changed runtime pins. No live inference,
provider selection or private installation deployment is authorized by this task.

## 16. Development and release commands

The [Makefile](../Makefile) is authoritative; the
[README command table](../README.md#commands-and-verification) explains supported
entry points. [RUNBOOK.md](RUNBOOK.md) owns native/container migration, backup and
restore sequences; [PHONE_SETUP.md](PHONE_SETUP.md) owns private HTTPS setup.
Use `make bootstrap` then `make start` for the current native entry path.
First-account creation uses the private browser setup link; `make admin` is an
explicit recovery tool.

Targets must run real checks or behavior and report unmet prerequisites. Do not
add fake-success placeholders. Bootstrap/startup must not download models, accept
licenses, open firewall ports, call live providers or overwrite private settings
without authorization. Live evaluations, deployments and publication remain
explicit opt-in actions.

### CI requirements

Run locked installs (`pnpm install --frozen-lockfile`, `uv sync --locked`), Ruff, mypy, frontend type checks/lint/tests/build, backend tests, on-disk SQLite integration tests, Playwright, generated-contract checks, secret scanning, and dependency vulnerability checks. Check the embedded SQLite runtime without a database service container. Make scan failures actionable and any temporary exception documented with an owner and expiration.

GitHub Actions should have minimal permissions, pinned verified full commit SHAs for third-party actions, bounded artifact retention, and no provider secrets in fork pull-request jobs. Do not execute untrusted pull-request code with a privileged `pull_request_target` workflow. GitHub's security guidance explains the immutable action-pinning requirement. [^S35]

Release builds additionally generate a software bill of materials, scan container images, record image digests, and publish only after authorization. CI uses synthetic fixtures and mock providers; live evaluations are separate opt-in jobs and never the default for arbitrary pull requests. No fake badges, placeholder success scripts, or CI commands that swallow errors with `|| true`.

## 17. Hosting runbooks

### Local computer or home server

Native operation runs the application directly; Compose runs one API and one
worker on the same host. Both use the same private local data directory for
SQLite and its sidecars, outside container layers. There is no database service.
A separately configured private HTTPS gateway proxies the loopback application
for phone access; keep API and model ports private. Ollama/vLLM can run on the
host or another explicitly configured private machine. Follow PHONE_SETUP for
trusted HTTPS and authentication without public router port forwarding.

The server must remain awake and reachable while the phone uses it. Offline Internet can still permit local-network tutoring, but losing the LAN connection or stopping the server removes that capability. A plain public GitHub Pages deployment cannot host this Python backend and writable database; at most it can serve a static synthetic demo or a later browser-only mode.

### Hosted web application

Reuse the same image and single-host application layout. Terminate TLS at the gateway, keep API/model endpoints and database files private, use persistent local storage, and execute migrations as a separate controlled deployment step with writes stopped. Do not place SQLite on a shared network filesystem or scale application replicas across hosts. Provide backup and restore tests before real learner use. Do not use ephemeral container filesystems as permanent database or image storage.

### AWS: inference and hosting are independent

**Bedrock inference can be used while the app stays local.** This requires only the Bedrock adapter, appropriate region/model access, and credentials obtained through the AWS SDK's supported mechanisms. [^S08][^S26]

For later AWS application hosting, use one EC2 host with persistent encrypted EBS storage and the same gateway/API/worker layout. SQLite remains on a local filesystem on the attached volume. Serve frontend assets and terminate HTTPS at the gateway to preserve same-origin behavior. Use private S3 for retained objects/backups when introduced, Secrets Manager for secrets, and instance-role access to permitted services. Define volume retention and explicit remount/restore steps before replacing the host. This reference design provides neither horizontal scaling nor automatic failover. [^S45]

Use CloudFormation for the initial infrastructure template to avoid adding another provisioning language/toolchain. Validate templates without applying them. The deployment guide must discuss recurring costs—including the instance, EBS, public addressing/egress, object storage, secrets, logs, backups, and model requests where used—without inventing current prices. Do not provision this stack automatically.

A self-managed GPU endpoint is a separate optional compute decision; the application host does not imply GPU capacity. Use instance IAM roles, private buckets, scoped permissions, encrypted storage, limited logs, budget alarms, and explicit model/inference-profile regions. Cross-region routing requires a documented data-boundary decision. Keep prompts/images out of model-invocation logging unless explicitly approved for a narrowly scoped diagnostic.

Storage adapters must support local private files first and S3 in the AWS phase. The rest of the application refers to opaque storage keys, not provider-specific URLs. Create consistent database backups through SQLite's backup API or a documented quiesced procedure; copying only a live WAL database's main file is invalid. Restore tests cover database integrity, foreign keys, retained objects, configuration, and deletion tombstones. [^S44]

## 18. Definition of done and public presentation

A version-1 release is ready only when a clean clone can run the mock demo without paid accounts, the principal workflow and exception paths pass, privacy boundaries are enforced, and each claimed provider has an honest status record. An adapter may be labeled “implemented; contract-tested; live test pending,” but not “fully verified.”

The public README must describe current behavior, tested setup, provider
verification limits and the license. Screenshots or recordings use original
synthetic data and do not substitute for acceptance evidence. Mark research and
unverified quality honestly.

Contributor-facing documentation should explain qualified photo reading,
source-grounded flexible teaching, optional exact evidence, ownership, no silent
cloud fallback and durable recovery. Disclose AI-assisted implementation while describing the human specification and evaluation work honestly. Code volume is not the project's main evidence of quality.

Target WCAG 2.2 AA, but do not claim conformance before an audit. Test visible labels, keyboard operation, focus management, zoom, non-color-only status, accessible mathematics, and reduced motion. Automated accessibility checks help but do not replace manual review. [^S36]

Do not commit real learner data, employer code, private documents, model weights, credentials, or copied workbook pages. Every public fixture has provenance in `evals/MANIFEST.md`. The project uses MIT (D006); document separate licenses for dependencies,
public reading sources and model downloads.

## 19. Maintainer decisions and non-goals

Current defaults and change boundaries:

| Decision             | Chosen default                                                       | Change procedure                                                                       |
| -------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Product name         | Shepherd Academy Universe; maintainer-selected repository name       | Treat further renaming as an explicit product decision                                 |
| Initial use          | One private deployment, adult administrator, managed learners        | Multi-tenant/public sign-up is a separate architecture review                          |
| Primary client       | Responsive PWA                                                       | Native shell only after a concrete unmet requirement                                   |
| Topics               | Free-text multi-subject AI tutoring (D009)                           | New behavior needs a bounded task and appropriate quality evaluation                   |
| Local model strategy | Ollama for simplicity; vLLM for server deployment                    | Verify exact model/runtime instead of hardcoding assumptions                           |
| Initial model route  | Mock; explicitly activate permitted live routes                      | Privacy/capability checks are mandatory                                                |
| Database             | SQLite on local disk, one host (D004)                                | PostgreSQL requires a separate scaling/availability decision and tested data migration |
| Application workflow | Deterministic services and durable jobs                              | No multi-agent orchestrator without a demonstrated requirement                         |
| Hosting              | Native local setup; optional single-host Compose and EC2/EBS phase   | No shared/network-mounted SQLite; infrastructure provisioning requires authorization   |
| Data retention       | Photos up to 24 hours; history 30 days                               | Adult-controlled, documented, tested changes                                           |
| Offline behavior     | Public assets and isolated synthetic practice; server/AI unavailable | Browser AI remains research until exact device/model measurements pass                 |
| License              | MIT, approved and added (D006)                                       | Model weights and third-party dependencies retain their own licenses                   |

A fully customizable tutor does not require letting users modify every safety-critical parameter. Version 1 customization is deliberately about pedagogy, topics, and presentation, while operators own infrastructure and data policy.

## 20. Research references

Official project/vendor sources were checked through **September 7, 2026**. These
references support external facts; the architecture, defaults, limits, and
acceptance gates above are project design decisions. Version numbers and terms can
change. Recheck them when implementing or deploying, and record any changes rather
than silently substituting remembered APIs. Meta's current terms page requires an
authenticated session, so the operator must read the agreement applying to their
account before use.

[^S01]: **Meta API quickstart:** [API base and model configuration](https://ai.developer.meta.com/docs/quickstart/).

[^S02]: **Meta hosted API terms:** [official terms](https://llama.developer.meta.com/legal/terms-of-service).

[^S03]: **Meta model/data tiers:** [Models](https://ai.developer.meta.com/docs/models/).

[^S04]: **Ollama vision:** [Image-input documentation](https://docs.ollama.com/capabilities/vision).

[^S05]: **Ollama schemas and compatibility:** [Structured outputs](https://docs.ollama.com/capabilities/structured-outputs); [OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility).

[^S06]: **vLLM serving:** [Official documentation](https://docs.vllm.ai/).

[^S07]: **Qwen/runtime distinction:** [Qwen3.8-27B publisher model card](https://huggingface.co/Qwen/Qwen3.8-27B); [vLLM recipe and verification scope](https://recipes.vllm.ai/Qwen/Qwen3.8-27B).

[^S08]: **AWS Bedrock:** [Converse API reference](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html).

[^S09]: **AWS structured output:** [Supported models/endpoints and JSON schema behavior](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html).

[^S10]: **Browser camera:** [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia); [secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts).

[^S11]: **PWA:** [MDN service-worker setup/security](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers); [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/).

[^S12]: **Browser inference:** [WebLLM documentation](https://webllm.mlc.ai/docs/).

[^S13]: **Browser model execution:** [Transformers.js](https://huggingface.co/docs/transformers.js/en/index); [WebGPU guide](https://huggingface.co/docs/transformers.js/en/guides/webgpu).

[^S14]: **React:** [Version documentation](https://react.dev/versions).

[^S15]: **Node:** [Release support table](https://nodejs.org/en/about/previous-releases).

[^S16]: **Vite:** [Vite 8 announcement](https://vite.dev/blog/announcing-vite8); [Vite 8.1](https://vite.dev/blog/announcing-vite8-1).

[^S17]: **TypeScript:** [TypeScript 6 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html).

[^S19]: **Tailwind:** [Vite installation](https://tailwindcss.com/docs/installation/using-vite).

[^S20]: **FastAPI:** [Background tasks and caveat](https://fastapi.tiangolo.com/tutorial/background-tasks/).

[^S21]: **SQLite:** [WAL operation and same-host limits](https://sqlite.org/wal.html).

[^S22]: **uv:** [Locking and syncing](https://docs.astral.sh/uv/concepts/projects/sync/).

[^S23]: **OWASP:** [File upload guidance](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html); [REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).

[^S24]: **SymPy:** [Parsing security warning](https://docs.sympy.org/latest/modules/parsing.html).

[^S25]: **KaTeX:** [Rendering, trust, and resource-limit options](https://katex.org/docs/options).

[^S26]: **AWS credentials:** [Boto3 credential chain](https://docs.aws.amazon.com/boto3/latest/guide/credentials.html); [IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html).

[^S27]: **AWS data boundary:** [Bedrock data protection](https://docs.aws.amazon.com/bedrock/latest/userguide/data-protection.html).

[^S28]: **OpenAI minors:** [Under-18 API guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance).

[^S29]: **FTC:** [COPPA frequently asked questions](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).

[^S30]: **Playwright:** [CI setup](https://playwright.dev/docs/ci-intro).

[^S31]: **Repository instructions:** [AGENTS.md open convention](https://agents.md/).

[^S32]: **Agent Skills:** [Skill specification](https://agentskills.io/specification).

[^S33]: **Codex skill discovery:** [Current skill documentation](https://developers.openai.com/codex/skills/).

[^S34]: **Skill design:** [Agent Skills authoring best practices](https://agentskills.io/skill-creation/best-practices).

[^S35]: **GitHub Actions:** [Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use).

[^S36]: **Accessibility:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

[^S37]: **HEIF support:** [pillow-heif documentation](https://pillow-heif.readthedocs.io/).

[^S38]: **Meta structured output:** [Schema configuration](https://ai.developer.meta.com/docs/features/structured-output/).

[^S39]: **Meta image messages:** [Image understanding](https://dev.meta.ai/docs/image-understanding/).

[^S40]: **Ollama native chat:** [Chat API schema](https://docs.ollama.com/api/chat).

[^S41]: **SQLite persistence:** [SQLAlchemy dialect and transaction control](https://docs.sqlalchemy.org/en/20/dialects/sqlite.html); [foreign keys](https://sqlite.org/foreignkeys.html).

[^S42]: **SQLite transactions:** [Transaction behavior](https://sqlite.org/lang_transaction.html); [appropriate uses](https://sqlite.org/whentouse.html).

[^S43]: **Alembic:** [Batch migrations and constraints](https://alembic.sqlalchemy.org/en/latest/batch.html).

[^S44]: **SQLite recovery:** [Online backup API](https://sqlite.org/backup.html).

[^S45]: **AWS persistent storage:** [Amazon EBS volumes](https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes.html).

[^S46]: **Locally hosted Llama:** Meta's [Llama 4 Community License](https://github.com/meta-llama/llama-models/blob/main/models/llama4/LICENSE) and [Acceptable Use Policy](https://github.com/meta-llama/llama-models/blob/main/models/llama4/USE_POLICY.md).
