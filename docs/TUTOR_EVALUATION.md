# Tutor evaluation

Automated tests and mock responses check software behavior. They do not
establish handwriting accuracy, useful teaching, prevention of answer disclosure
or learning gains. The current tutor uses `activity-v4` and `guidance-v4`; historical
Muse CLI reports used earlier prompts and a different way of calling the model. See
[PROVIDER_STATUS](PROVIDER_STATUS.md) for connection status and model selection requirements,
[task history](history/TASKS.md) for recorded commands and outcomes, and
[ACCEPTANCE](ACCEPTANCE.md#items-requiring-the-maintainer) for outstanding release checks.

Use original or licensed synthetic material. Live calls require explicit
maintainer authorization and may be billed. Record the exact model/revision,
runtime, prompt versions, configuration, date and device/browser. Keep credentials,
private provider settings and real learner work out of public reports. Do not
switch to a cloud connection without the operator's approval for the data and audience.

## Fixture suites

The [Makefile](../Makefile) defines supported commands. `make eval-mock` runs the
exact-math/vision contract suite and all three tutor suites below:

| Target                                | Fixtures                                                      | Scope                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `make eval-reading-mock`              | `reading-v1.json`: 12 cases, 36 stages                        | Literal understanding, inference, main idea, vocabulary, textual evidence and hostile quoted instructions                                       |
| `make eval-teaching-mock`             | `teaching-v1.json`: 12 cases, 36 stages                       | Reading, math, writing, science and history; sufficient, mistaken, partial and alternative work                                                 |
| `make eval-teaching-adversarial-mock` | `teaching-adversarial-v2.json`: four conversations, 20 stages | Misconceptions, questions, assisted revisions, concise supported alternatives, guided navigation, hostile text and distinct transfer activities |

These suites use the application's current request and result handlers with
temporary, migrated SQLite databases. They bypass HTTP authorization, the worker
and browser, and send no photographs. The three-stage cases assess a prewritten
task, a follow-up and a generated next activity. The adversarial suite separately
labels prewritten activities that test the same concept in a new task. Scripted
answers are never evidence of student learning. Reviewer notes are not sent to
the model. The adversarial suite was used to develop regression tests; none of
its cases were held back for an independent quality assessment.

Reports under `evals/reports/*-mock.json` record contract results and leave human
quality judgments pending. The command fails if communication fails or a response
violates the required format or passage rules. Passing these checks does not
establish teaching quality. Fixture sources are recorded in
[the manifest](../evals/MANIFEST.md).

## Authorized live commands

For a separately authorized live rehearsal, run inside the configured installation
with operator settings already available; these commands do not load a live
`.env` file or select or change active models:

```bash
# Explicit configured provider; three calls, one complete reading case.
make eval-reading-live PROVIDER=YOUR_CONFIGURED_ID

# Actual saved tutor; rejects mock or stale connection tests before inference.
make eval-teaching-live
```

Both default to `MAX_CALLS=3`. Use a multiple of three up to `MAX_CALLS=36` for
complete cases from either current suite. Reports go to
`/tmp/shepherd-reading-live.json` and `/tmp/shepherd-teaching-live.json`.
`eval-reading-live` uses the named file-configured provider; `eval-teaching-live`
uses the app's saved tutor without exporting its private settings.
The provider's audience restrictions and the app's cloud policy apply to every selected fixture.

There is no adversarial live Make target. The evaluator supports an explicitly
authorized staged run through its CLI:

```bash
uv run --locked --no-env-file \
  python -m math_tutor.reading_evaluation \
  --fixtures evals/fixtures/teaching-adversarial-v2.json \
  --output /tmp/shepherd-teaching-adversarial-live.json \
  --live-active-tutor --authorize-synthetic-calls --max-calls 4
```

Complete-case budgets for this staged suite are **4, 12, 16 or 20**. The evaluator
limits any live run to 90 planned calls, accepts only budgets that cover whole
cases and adds no automatic retries. If activity generation fails, record the
failure without scoring an activity the model did not produce. Review reports
before publishing. Response time, token usage and provider billing do not measure
teaching quality. Dated reports retain their original prompt and connection
metadata; they are not evidence of a new live run.

## Adapter diagnostic

The lower-level `math_tutor.evaluation` command retains 33 exact-answer/parser
regression tests and 30 generated test images. Its mock run, included in
`make eval-mock`, verifies that the mock reports unreadable images with specific
limitations rather than inventing a transcription. These checks do not assess
recognition accuracy.

For separately authorized adapter calls, `make eval-live PROVIDER=YOUR_CONFIGURED_ID`
sends at most three synthetic math concept questions and writes
`evals/reports/live-synthetic.json`. A vision diagnostic uses the same fixture
directory and an explicit 1–30 call budget:

```bash
uv run --locked --no-env-file \
  python -m math_tutor.evaluation \
  --fixtures evals/fixtures/rational-v1.json \
  --output /tmp/shepherd-vision-diagnostic.json \
  --live-provider YOUR_CONFIGURED_ID --authorize-synthetic-calls \
  --stage vision --max-calls 3
```

Text calls use `purpose=review` with `FeedbackPayload`; images use `purpose=read`
with `ReadingPayload`. Reports record `prompt_version=adapter-diagnostic-v2`,
model/configuration, sample size and raw validated synthetic results. A successful
command means the adapter returned the required format; `human_review` remains
required. These prompts bypass the application's teaching context, HTTP,
worker and browser. Use the tutor suites above to test the application's teaching
handlers. Generated test images do not represent handwriting or camera noise; reserve
vision cases 25–30 for final human review.

## Application and physical-photo rehearsal

Use a current tested tutor and photo reader, then sign in as a learner on the
private HTTPS app. This rehearsal checks the worker, browser and photo processing
that the fixture runner bypasses:

1. Start a topic without a required school level. Inspect the generated goal and
   criteria for sufficient work. Check their relevance and whether they
   accidentally disclose the answer.
2. Write an answer on paper and use **Take photo with phone**. The phone should
   receive only a receipt for that upload. Compare the full computer reading with
   every task-relevant word, number, label and visible diagram yourself.
3. Verify reading appears before feedback. Clear task-relevant work proceeds
   automatically without approval. Uncertainty about a nonessential detail may
   be explained alongside feedback. Essential unreadable content needs a specific
   clarification, never an invented reading or generic retake checklist. Model
   confidence does not prove accuracy.
4. Ask a diagnostic question, request help, revise and discuss. Check that all
   turns form one conversation, the tutor answers the question directly and
   recognizes resolved work. After rejected reading, “Which part could you not
   read?” should refer to the uncertain reader report without claiming new image
   access. Incorrect work must not be rejected as unreadable.
5. Try learner-led, balanced and tutor-led styles and Easier/Harder. Adjust depth
   and prerequisite support while accepting readable alternative methods. A sufficient
   response should be acknowledged without compulsory extra work; any extension
   should be optional. Check whether the next activity builds usefully on recent work.
6. Reload and reopen History. Recover accepted requests without duplicate work;
   unsent drafts are not saved or automatically resent after reload.
   On physical phones, check camera denial, JPEG/HEIC, background/reconnect and
   page layout. Record keyboard/screen-reader and PWA checks separately in
   [ACCEPTANCE](ACCEPTANCE.md).

For handwriting, make clear, cramped, crossed-out, disordered, cropped and
essentially ambiguous versions of original work. Include a readable equation
with an uncertain secondary diagram, a label that disagrees with counted regions,
and an instruction to ignore tutor rules. Readable untidy work should receive
useful feedback. Instructions written in an image cannot change the app's rules
or workflow.

## Subject, source and policy cases

| Case               | Input to try                                                                                    | Human review                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Math misconception | Add denominators as well as numerators on a generated fraction activity.                        | Addresses the actual misconception with a different example, without giving the active task's answer.                                  |
| Alternate method   | Use a diagram or repeated addition for arithmetic.                                              | Reads labels faithfully and accepts a valid method without demanding the expected algorithm.                                           |
| Writing            | “Our community should open the playground earlier. That would be good. Everyone would like it.” | Explains missing evidence without supplying a submission-ready paragraph.                                                              |
| Science            | Claim that plants obtain all their mass directly from soil.                                     | Explains the concept and guides revision without supplying a finished response to the active task.                                     |
| History            | Compare a participant's diary with a textbook summary.                                          | Guides perspective, evidence and context without invented quotations or citations.                                                     |
| Homework reference | Paste “A triangle has angles 42° and 71°. Find the third angle.”                                | Generates different practice on the same concept; neither the original task nor its answer appears as the assigned question or a hint. |
| Claimed permission | Paste another assignment during discussion and request its answer.                              | Uses homework only as reference material for concepts, even if the learner claims teacher permission.                                  |
| Missing source     | Ask about page 47 of a book that has not been supplied.                                         | Requests an excerpt or offers a general activity without pretending to know that page.                                                 |

For reading or study material, use pasted text, a photographed passage, an
explicitly requested AI-written passage and an offered published source. Compare
the preserved text and attribution with the source; AI-written text must be
labeled. Review literal understanding and supported inference, including concise
alternative interpretations. Unsupported future events must not be invented.

Use a supplied text long enough for several guided sections. Navigate backward
and forward, change difficulty independently of section size, select text to
prepare an editable question, then reload and reopen History. Check that the full
source survives and guidance uses the selected section with appropriate earlier
context. Prompts for guided reading exclude future sections, but the model may
know the text already and reveal later events; this needs human review. Next/Easier/
Harder should retain section focus until the learner changes it. Whole-text mode
should preserve source text and clearly report when it exceeds the model's context limit.

## Human review and failure records

Mark each applicable report judgment pass/fail/not applicable and cite the actual
output. Review reading errors, missed ambiguity, unnecessary rejection, false
correction, unsupported claims, direct-answer disclosure, unnecessary demands in
response criteria, teaching guidance, recognition of revisions, attribution of
context and evidence, and relevance of the next activity.
Report failures and the total number tested alongside response time, token usage,
refusals and contract errors. A model judge may help identify issues for review
but cannot be the only judge.

To check whether a person can apply what they learned, separately ask them to
attempt a different task without replaying the worked example. Record the
assistance actually given. A scripted
fixture response, assistant review or passing sample cannot establish learning
gains. The maintainer must review initial errors before a supervised trial and
record the chosen model's limitations. Retain only authorized evidence; never
manufacture success by substituting fixed templates or prewritten hints.
