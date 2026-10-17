# Provider implementation and verification

This guide describes adapter support, connection setup and test limits. Check
current selections in the installation's Settings; [TASKS](TASKS.md) records
the last observed deployment.

Every live adapter is implemented and contract-tested, with live verification
pending for the exact model, runtime and account the operator chooses. A passing
connection test establishes transport and response-schema support. Teaching,
handwriting quality and provider eligibility need separate review.

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
   mere HTTP success is insufficient. Each request has up to 90 seconds, with a
   180-second overall test deadline and no automatic retry. Incomplete responses
   may still be billed. A matching test lasts seven days and becomes stale after
   connection, capability, key or applicable probe-version changes. Current
   versions are tutor v4 and photo reader v2; pre-T44 tutor tests are stale.
4. Open **Active models** and select the tested tutor and photo
   reader with the displayed data-boundary acknowledgment. This app-wide choice,
   not saving a connection, changes future learner routing. Record exact runtime,
   model, configuration and prompt versions, date, sample counts, failures,
   latency, token usage and human review.
   A failed local route never invokes an alternate provider.

Start Ollama/vLLM separately; the app neither installs nor starts models. Use the
exact model ID reported by that server. Typical local endpoint addresses are:

| Model server on the app host | Native app                 | Docker app                            |
| ---------------------------- | -------------------------- | ------------------------------------- |
| Ollama                       | `http://127.0.0.1:11434`   | `http://host.docker.internal:11434`   |
| vLLM example                 | `http://127.0.0.1:8081/v1` | `http://host.docker.internal:8081/v1` |

Use a separate port from the app's 8000. Compose maps `host.docker.internal` to
the Linux host gateway for both API and worker; the model must listen on a private
host interface reachable from the Docker bridge. A loopback-only listener is not
reachable through that alias. Restrict the model port with the host firewall.
Phones connect only to the app's HTTPS gateway.

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

Advanced operators can set `PROVIDER_CONFIG` to a reviewed private file based on
[providers.example.yaml](../config/providers.example.yaml). These connections
appear read-only in Settings. The API and worker reload the file when resolving
configuration; write valid changes atomically, then retest affected roles. Restart
the processes or recreate containers when changing environment variables, mounted
paths or environment-supplied credentials. Bedrock uses this file-managed path
with workload IAM credentials. File-managed and browser-managed identifiers must
not collide. See [RUNBOOK](RUNBOOK.md#container-package) for container mounts.

Select both **tutor** and **vision** for photo-based practice. They may point to the
same model or to separate local/API models. The probes establish transport,
current activity/feedback/reading schema support and the known photo reading,
not teaching or general handwriting quality. Exercise the actual application loop using
[TUTOR_EVALUATION](TUTOR_EVALUATION.md) before claiming those tasks work well on
your model. Increase the explicitly configured context budget to match your
actual server when needed; the app rejects over-budget work rather than silently
clipping a paragraph or switching providers.

A cloud tutor receives transcribed photo text even when the photo reader is
local. Selecting a local photo reader alone does not keep the whole conversation
local.

The request budget is at most six calls per operation, with no hidden SDK retries
and no automatic schema repair. Live calls have a 90-second total deadline in a
short-lived child process, plus up to 2.1 seconds to stop/reap it (D008). This cannot
cancel inference already accepted by a remote provider. Visible errors are
sanitized. Model-call records contain redacted status/usage, not raw prompts,
photos, endpoint credentials or model response bodies. Prices are not hardcoded;
cost is unknown unless externally assessed from current provider billing.

## Synthetic evaluation

Use [TUTOR_EVALUATION](TUTOR_EVALUATION.md) for the fixture suites, opt-in live
commands, call budgets and human-review procedure. Live rehearsals require
separate maintainer authorization and may be billed. Historical Muse CLI
rehearsals used additional system context and bypassed the app's HTTP adapters
and browser/worker loop; see [implementation history](history/TASKS.md).

The lower-level math/vision evaluator remains an adapter diagnostic:
`make eval-live PROVIDER=YOUR_CONFIGURED_ID` permits at most three synthetic text
calls. Its CLI also accepts `--stage vision --max-calls N` for 1–30 calls against
`evals/fixtures/rational-v1.json`, with `--live-provider`,
`--authorize-synthetic-calls`, `--fixtures` and `--output` supplied explicitly.
Those images are rendered typeset exercises. Reserve the six held-out images for
final review; they do not establish handwriting performance.

The browser-model prototype is not exposed in the current app. Its modules and
runtime/model hashes remain under `apps/web/src`, including
`research-manifest.json`; no device measurements or model downloads are recorded.
Any future experiment must preserve explicit download consent and the evaluation,
unload and cache-delete controls. See the
[optional acceptance checks](ACCEPTANCE.md#optional-research-and-hosting).
