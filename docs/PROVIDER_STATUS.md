# Provider implementation and verification

Live routes require explicit testing and selection. T44 was deployed to the
existing private installation on October 10, 2026. Current provider selections
and configuration were not inspected or changed, and no inference was run.
The prior T43 mock-tutor check is historical; see [TASKS](TASKS.md).

The recorded Muse CLI rehearsals used synthetic work and production prompts, with
additional Muse system context. They did not exercise the app's HTTP adapters or
browser/worker loop. Adapter contract tests establish software behavior; teaching,
handwriting quality and eligibility still require review for the exact model and
account you intend to use.

| Adapter    | Implemented protocol                                                                                  | Automated evidence                                                   | Live status                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Mock       | Explicit synthetic generation/guidance and one recognized public image fixture; other images rejected | Worker, schema, automatic clear reading, rejection and fixture tests | No model; not an OCR or quality result                                   |
| Meta Spark | Bounded Chat Completions messages/image data URI, structured JSON                                     | Wire shape, errors, cloud boundary and selected-audience policy      | Pending exact approved model/account and current provider contract check |
| Ollama     | Native `/api/chat`, separate system message, base64 image, `format` schema                            | Text/image mapping and typed error contracts                         | Pending exact installed model/runtime                                    |
| vLLM       | `/chat/completions`, content image blocks and JSON schema response format                             | Capability and compatible transport contracts                        | Pending exact served model/runtime/template                              |
| Compatible | Bounded Chat Completions endpoint, explicit native or JSON-prompt mode                                | Strict payload, malformed/refusal/429/timeout handling               | Pending exact endpoint semantics                                         |
| Bedrock    | boto3 Converse content blocks, system, image bytes, output schema                                     | SDK Stubber with locked boto3 schema; no static keys                 | Pending approved region/model/profile and IAM access                     |

The implementation uses documented
[Ollama chat](https://docs.ollama.com/api/chat),
[vLLM structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/),
[Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html),
and [Bedrock JSON schema](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_JsonSchemaDefinition.html).
Meta's official developer structured-output documentation required authenticated
access during review. Its exact deployed wire contract must be checked against
the operator's current documentation before enabling; do not infer a verified
endpoint/model from the disabled example.

## Test and select the tutor and photo reader

1. In the administrator app, open **Settings → Connections** and select
   Ollama, vLLM, a compatible API, or Meta. Enter the exact installed/approved
   model ID and endpoint, and an API key if required. Review model/provider terms,
   intended audience and data handling. Declare image capability and context
   limits honestly; a text-only
   route cannot receive images. Save sends no model request and changes no route.
2. Open **Data & privacy** in Settings. This installation-wide ceiling is
   separate from any one connection. Enable cloud processing only
   deliberately. Adult-only routes require an adults-only app audience and an
   adult learner; mixed routes use the operator's separate terms attestation.
   Meta-hosted connections display a provider-specific age/data disclaimer but
   do not impose a provider-specific audience value. Explicit deployment
   `ALLOW_CLOUD_INFERENCE` and `APP_AUDIENCE` values lock their UI controls; absent
   values allow saved Settings policy, defaulting to cloud off and mixed ages.
   Local routes stay local and never fall back to cloud.
3. Open **Connection tests**. Saved changes are visible to API and worker without
   restarting. Explicitly authorize the synthetic test for each required stage.
   The tutor test makes two bounded sample calls, checking activity generation
   and feedback. The photo test makes one call using the current work-reading
   schema and must
   return the known synthetic `1/2` transcription as a clear, unambiguous reading;
   mere HTTP success is insufficient. Each request has up to 90 seconds, with no
   automatic retry. Incomplete responses may still be billed. A matching probe lasts seven days and is
   invalidated by capability/configuration/key changes. T44 also invalidates older
   tutor tests through its current probe version; run a fresh **Test tutor** before
   selecting a saved live tutor. Unchanged photo-reader tests retain their validity
   until normal expiry.
4. Open **Active models** and select the tested tutor and photo
   reader with the displayed data-boundary acknowledgment. This app-wide choice,
   not saving a connection, changes future learner routing. Record exact runtime,
   model, configuration and prompt versions, date, sample counts, failures,
   latency, token usage and human review.
   A failed local route never invokes an alternate provider.

Saved keys are encrypted in the private SQLite database and never returned in
responses, errors or learner exports. Edit a connection to keep, replace or
remove its key. Changing the endpoint cannot silently reuse the old credential.
Connection/key changes invalidate prior tests and require renewed route-selection
approval before learner use; a successful test alone never activates changed
settings. If the deployment secret changes,
replace unreadable keys in Settings and retest; preserve that secret separately
when backing up the database (D010).

**Advanced connection options** separates the model context budget from **Model
response limit**, which defaults to 16,384 output tokens. The response limit
applies to connection tests and practice, including photo reading; match both
budgets to the actual model/server. Meta connections also support **Thinking
effort**: Provider default, Minimal, Low, Medium, High and Xhigh. Provider default
omits the parameter. Thinking can consume output tokens and increase time/cost;
the choice applies to both tests and practice. After changing these settings,
save, retest and select the roles again. Other adapters omit this parameter.

Connection tests retain safe diagnostics across reloads: stage, failure phase,
code, completion reason, HTTP status, duration, requests started, thinking effort
and output limit. SQLite retains up to 20 records per connection for seven days;
the UI displays the latest 10. They contain no prompts, responses, images or keys.
Practice call records may also retain reported token and reasoning-token counts,
without raw reasoning. Activity difficulty is a separate learner control.

Advanced operators may still set `PROVIDER_CONFIG` to a reviewed private file
using `config/providers.example.yaml`. These connections appear read-only in
Settings and require restarting after file changes. Bedrock remains configured
this way, with workload IAM credentials rather than a browser form for static
AWS keys. File-managed and browser-managed connection identifiers cannot collide.

Select both **tutor** and **vision** for photo-based practice. They may point to the
same model or to separate local/API models. The probes establish transport,
current activity/feedback/reading schema support and the known photo reading,
not teaching or general handwriting quality. Exercise the actual application loop using
[TUTOR_EVALUATION](TUTOR_EVALUATION.md) before claiming those tasks work well on
your model. Increase the explicitly configured context budget to match your
actual server when needed; the app rejects over-budget work rather than silently
clipping a paragraph or switching providers.

The request budget is at most six calls per operation, with no hidden SDK retries
and no automatic schema repair. Live calls have a 90-second total deadline in a
short-lived child process, plus up to 2.1 seconds to stop/reap it (D008). This cannot
cancel inference already accepted by a remote provider. Visible errors are
sanitized. Model-call records contain redacted status/usage, not raw prompts,
photos, endpoint credentials or model response bodies. Prices are not hardcoded;
cost is unknown unless externally assessed from current provider billing.

## Synthetic evaluation

`make eval-mock` checks the original math/vision contracts, 12 reading cases,
12 cross-subject teaching cases, and four adversarial conversations. All quality
judgments remain pending for human review. For separately authorized live text
rehearsals:

```bash
make eval-teaching-live MAX_CALLS=3
make eval-reading-live PROVIDER=YOUR_CONFIGURED_ID MAX_CALLS=3
```

Run these from an operator environment pointing at the intended installation.
Both targets use `--no-env-file`: they do not automatically load private `.env`
settings. `eval-teaching-live` reads the installation's selected tutor and rejects
mock or stale routes. `eval-reading-live` uses the named file-managed provider.
The default three-call budget covers one complete case; `MAX_CALLS=36` covers each
full 12-case suite. Reports go to `/tmp/shepherd-teaching-live.json` and
`/tmp/shepherd-reading-live.json`. These rehearsals use production request/result
handlers on synthetic SQLite, without a browser, durable worker or photographed
input. Follow [TUTOR_EVALUATION](TUTOR_EVALUATION.md) for the application/phone trial.

The lower-level math/vision evaluator remains available for adapter diagnostics.
`make eval-live PROVIDER=YOUR_CONFIGURED_ID` makes at most three synthetic text
calls. A separately authorized vision evaluation accepts a maximum call budget
of 1–30:

```bash
uv run --project apps/api --locked --no-env-file python -m math_tutor.evaluation --fixtures evals/fixtures/rational-v1.json --output /private/evaluations/vision.json --live-provider YOUR_CONFIGURED_ID --stage vision --authorize-synthetic-calls --max-calls 30
```

Record fixture expectations and exact model metadata for adult review.
Record transcription exactness/ambiguity, false corrections, early solutions,
schema failures/refusals, answer rejection, and latency separately. Reserve the
six held-out images for final review, not prompt tuning. The images are rendered
synthetic typeset exercises, not a representative handwriting benchmark; add
original consenting adult handwriting before claiming handwriting performance.
The tutor displays the reading before feedback and automatically continues usable
work. Essential unreadable content stops photo tutoring with specific clarification
advice; incidental uncertainty does not block useful feedback. These rendered
fixtures do not certify the multi-subject tutoring loop.

The optional browser research uses the pinned WebLLM runtime and model hashes in
`apps/web/src/research-manifest.json`. No weights were downloaded and no actual
device was measured in the recorded implementation evidence.
Use the adult research screen's consent, synthetic evaluation, cancel/unload and
cache-delete controls; record memory, thermal/battery, eviction and quality limits
before treating T23 as accepted. Research cannot grade learner practice.
