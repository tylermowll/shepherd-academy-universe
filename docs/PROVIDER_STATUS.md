# Provider implementation and verification

This guide describes adapter support, connection setup and test limits. Check
current selections in the installation's **Settings**; [TASKS](TASKS.md) records
the last observed deployment.

Every live adapter is implemented and tested against its request and response
contracts. Live verification is still pending for the exact model, runtime and
account the operator chooses. A passing connection test shows that the server
responds in the required format. Teaching, handwriting quality and permission to
use the provider with the intended audience need separate review.

| Adapter    | Implemented protocol                                                                              | Automated evidence                                                             | Live status                                                              |
| ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Mock       | Labeled synthetic activities/feedback and one recognized public test image; other images rejected | Worker, schema, automatic clear reading, rejection and fixture tests           | No model; does not measure image-reading or teaching quality             |
| Meta Spark | Bounded Chat Completions messages/image data URI, structured JSON                                 | Request/response structure, errors, cloud permission and audience restrictions | Pending exact approved model/account and current provider contract check |
| Ollama     | Native `/api/chat`, separate system message, base64 image, `format` schema                        | Text/image mapping and typed error contracts                                   | Pending exact installed model/runtime                                    |
| vLLM       | `/chat/completions`, content image blocks and JSON schema response format                         | Capability and compatible transport contracts                                  | Pending exact served model/runtime/template                              |
| Compatible | Bounded Chat Completions endpoint, explicit native or JSON-prompt mode                            | Strict payload, malformed/refusal/429/timeout handling                         | Pending verification of the selected endpoint's behavior                 |
| Bedrock    | boto3 Converse content blocks, system, image bytes, output schema                                 | SDK Stubber with locked boto3 schema; no static keys                           | Pending approved region/model/profile and IAM access                     |

The implementation uses documented
[Ollama chat](https://docs.ollama.com/api/chat),
[vLLM structured outputs](https://docs.vllm.ai/en/latest/features/structured_outputs/),
[Bedrock Converse](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_Converse.html),
and [Bedrock JSON schema](https://docs.aws.amazon.com/bedrock/latest/APIReference/API_runtime_JsonSchemaDefinition.html).
Meta's official developer structured-output documentation required authenticated
access during review. Check the deployed API's exact request and response format
against the operator's current documentation before enabling it. The disabled
example does not verify an endpoint or model.

## Test and select the tutor and photo reader

1. In the administrator app, open **Settings → Models** and select
   Ollama, vLLM, a compatible API, or Meta. Enter the exact installed/approved
   model ID and endpoint, and an API key if required. Review model/provider terms,
   intended audience and data handling. Set image support and context limits to
   match the model; a text-only connection cannot receive images. Saving sends no
   model request and does not change the active models.
2. Open **Data & privacy** in Settings. These installation-wide limits apply
   in addition to each connection's limits. Enable cloud processing only
   deliberately. Adult-only connections require an adults-only app audience and an
   adult learner. For mixed-age connections, the operator must separately confirm
   that the provider's terms permit the intended use.
   Meta-hosted connections display a provider-specific age/data disclaimer but
   do not impose a provider-specific audience value. Explicit deployment
   `ALLOW_CLOUD_INFERENCE` and `APP_AUDIENCE` values lock their UI controls; absent
   values allow saved Settings policy, defaulting to cloud off and mixed ages.
   Local connections stay local and never fall back to cloud.
3. On the saved connection in **Models**, explicitly authorize the synthetic
   test for each required role. Saved changes are visible to API and worker without
   restarting.
   The tutor test makes two bounded sample calls, checking activity generation
   and feedback. The photo test makes one call using the current photo-reading
   schema and must
   return the known synthetic `1/2` transcription as a clear, unambiguous reading;
   mere HTTP success is insufficient. Each request has up to 90 seconds, with a
   180-second overall test deadline and no automatic retry. Incomplete responses
   may still be billed. A matching test lasts seven days and becomes stale after
   connection, capability, key or applicable test-version changes. Current
   versions are tutor v4 and photo reader v2; pre-T44 tutor tests are stale.
4. On the tested connection, choose **Use as tutor** or **Use as photo reader**
   and acknowledge where it will process data. The current-model summary shows
   the saved connection/model for each role. Each action changes only that role;
   a stale choice is rejected and refreshed rather than overwriting a later
   selection. This app-wide selection changes future learner work. Record exact runtime,
   model, configuration and prompt versions, date, sample counts, failures,
   latency, token usage and human review.
   A failed local connection never invokes an alternate provider.

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
Connection or key changes invalidate prior tests. Retest the connection and select
it again with **Use as tutor** or **Use as photo reader** in **Models** before learner use; a successful test alone never
activates changed settings. If the deployment secret changes,
replace unreadable keys in Settings and retest; preserve that secret separately
when backing up the database (D010).

**Advanced connection options** separates the model's context limit from **Model
response limit**, which defaults to 16,384 output tokens. The response limit
applies to connection tests and practice, including photo reading; match both
limits to the actual model and server. Meta connections also support **Thinking
effort**: Provider default, Minimal, Low, Medium, High and Xhigh. Provider default
omits the parameter. Thinking can consume output tokens and increase time and cost;
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
configuration. Replace the file atomically so neither process reads a partially
saved file, then retest affected roles. Restart
the processes or recreate containers when changing environment variables, mounted
paths or environment-supplied credentials. Bedrock uses this file-managed path
with workload IAM credentials. File-managed and browser-managed identifiers must
not collide. See [RUNBOOK](RUNBOOK.md#container-package) for container mounts.

Select both **tutor** and **vision** for photo-based practice. They may point to the
same model or to separate local/API models. Connection tests check communication,
the current activity/feedback/reading formats and the known test photo's reading.
Teaching and general handwriting quality need review in the app using
[TUTOR_EVALUATION](TUTOR_EVALUATION.md) before claiming those tasks work well on
your model. Increase the configured context limit to match your
actual server when needed; the app rejects over-budget work rather than silently
clipping a paragraph or switching providers.

A cloud tutor receives transcribed photo text even when the photo reader is
local. Selecting a local photo reader alone does not keep the whole conversation
local.

The request budget is at most six calls per operation, with no hidden SDK retries
and no automatic schema repair. Live calls have a 90-second total deadline in a
short-lived child process, plus up to 2.1 seconds to stop it and collect its exit
status (D008). This cannot
cancel inference already accepted by a remote provider. Visible errors are
sanitized. Model-call records contain safe status and usage information, without raw prompts,
photos, endpoint credentials or model response bodies. Prices are not hardcoded;
cost is unknown unless externally assessed from current provider billing.

## Synthetic evaluation

Use [TUTOR_EVALUATION](TUTOR_EVALUATION.md) for the fixture suites, opt-in live
commands, call budgets and human-review procedure. Live rehearsals require
separate maintainer authorization and may be billed. Historical Muse CLI
rehearsals used additional system context and bypassed the app's HTTP adapters
and browser/worker loop; see [implementation history](history/TASKS.md).

The lower-level math/vision evaluator remains an
[adapter diagnostic](TUTOR_EVALUATION.md#adapter-diagnostic). It uses the current
reading/feedback schemas with `adapter-diagnostic-v2` prompts, independent of the
application's teaching context. `make eval-live PROVIDER=YOUR_CONFIGURED_ID`
permits at most three synthetic text calls; the vision CLI permits 1–30 rendered
image calls. Its reports require human review and do not establish teaching or
handwriting quality.

The browser-model prototype is not exposed in the current app. Its modules and
runtime/model hashes remain under `apps/web/src`, including
`research-manifest.json`; no device measurements or model downloads are recorded.
Any future experiment must preserve explicit download consent and the evaluation,
unload and cache-delete controls. See the
[optional acceptance checks](ACCEPTANCE.md#optional-research-and-hosting).
