# The Necklace: reading-tutor evaluation — 2026-10-08

**Historical report:** This records the T42 evaluation before the shared teaching
and material-progression changes. Its interface labels and 8,000-character limit
describe that version. T43 supports supplied texts up to 50,000 characters through
**Paste reading or study material**, including guided sections. See the
[current fixture instructions](../fixtures/the-necklace-README.md) and
[T43 teaching evaluation](teaching-muse-2026-10-08.md). The responses below are
preserved as originally evaluated; they are not results from the revised tutor.

Nine live Muse Spark 1.3 responses passed the application's response-schema and
persistence checks. The responses show promising grounding and correction, with
two teaching issues: unnecessary extra work after sufficient answers, and a
repetitive next question. These are the coding assistant's qualitative observations,
not a blinded score or independent human acceptance. Maintainer review is pending.

## Try it in the browser

Open [Shepherd Academy](https://zoopa-a-boop.taile8325e.ts.net) on a device connected
to the installation's Tailscale network. HTTPS readiness, the current reading UI,
and authentication enforcement passed this session.

The active tutor returned **mock** at evaluation preflight. For meaningful
feedback, sign in as administrator, select a connection under **Settings →
Connections**, run its tutor test under **Connection tests**, and assign it under
**Active models**. A saved connection is not automatically active. Use a learner
account for practice.

Choose **Paste a reading passage** and paste [this excerpt](../fixtures/the-necklace-excerpt.txt).
Set a topic such as “Reading comprehension: The Necklace — character, evidence,
and irony,” then start the session. This excerpt has 5,347 characters; the full
story in this edition has 16,119, beyond the current 8,000-character passage limit.
The built-in published-source picker does not yet include The Necklace.

The passage is the continuous replacement/repayment/ending section of Guy de
Maupassant's story, from [Project Gutenberg eBook 12758](https://www.gutenberg.org/ebooks/12758).
It is public domain in the USA. The translator is not identified in that source.
Only whitespace was normalized. See [provenance and fixture instructions](../fixtures/the-necklace-README.md).

## What the responses showed

| Case                       | Observed strengths                                                                                                                                                       | Remaining concern                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Correct literal answer     | Accepted ten years and the husband's additional work; later directly confirmed one example was sufficient.                                                               | Initially asked for another household detail even though the question and answer already matched.                                                                     |
| Mistaken necklace value    | Pointed the learner back to Forestier's final reply without supplying the correction; recognized the revised answer and distinguished the original from the replacement. | The new question asks what Mathilde did not know, which the learner and tutor had just explained; weak progression. It also repeats passage text inside the question. |
| Alternative interpretation | Accepted admiration for persistence and agreed that tragic cost can coexist with that reading. Used the supplied heroism and repayment evidence.                         | Requested another quotation/detail after a sufficient answer. The charity-hike analogy adds length and is less apt than the story's stakes.                           |

I found no clear false correction or invented story event in this small sample.
That is a limited reading of these outputs, not an estimate of the model's error
rate. The first response to the mistaken answer guided revision without providing
a ready-to-submit corrected answer. Explanations after the learner's correction
repeated already established facts. Counterfactual avoidability is an interpretation,
not proof of what Forestier would have done if told earlier.

The next bounded improvement is to make feedback stop when the answer satisfies
the question, and make next-question generation advance beyond points already
resolved in the conversation. Compare revised prompts against these same cases
before claiming that improvement is validated.

## Method and limits

- Three invented learner scenarios, with feedback, a follow-up, and a new question
  for each: nine calls, no retries, one Muse model step per call, medium reasoning.
- Production `make_request` and `finish_model`, real migrations and an isolated
  temporary SQLite database; evaluator review notes never entered model prompts.
- Muse Code 1.0.3 (`1.0.3-R2198.1`), provider `meta`, model `muse-spark-1.3`.
  All nine terminal results and configured model identities were checked.
- The application's instructions, ordered conversation, and JSON schema were
  embedded in a Muse CLI prompt. Muse adds its own system context. Responses were
  checked with the application's Pydantic schemas and saved through its normal
  result handler. This is **not** an HTTP provider-adapter or full browser/worker
  test, and does not establish identical behavior in the deployed app.
- Shell, writes, web tools, foreign personal context, and persistent Muse
  session logs were disabled; the prompt prohibited other tool use. Inputs were public application prompts, a
  public-domain passage, and synthetic answers. No real learner data was used.
- CLI wall time: median 25.940 seconds, slowest/p95 33.650 seconds. This includes
  CLI overhead and is not an app latency measurement. Token usage and billing
  totals were not measured.
- Fixture and raw validated responses: [JSON fixture](../fixtures/reading-necklace-v1.json)
  and [JSON report](necklace-muse-2026-10-08.json). Base application revision:
  `aa4c0c6`; the local evaluation-only change permits `published-reading-v1`.
- Local rehearsal command:
  `UV_NO_ENV_FILE=1 UV_CACHE_DIR=/tmp/shepherd-review-uv uv run --project apps/api --locked --no-env-file python /tmp/shepherd_necklace_muse.py`.
  The temporary helper caps requests at nine; it is not installed in the app.

## Full exchanges for your review

These are the validated model payloads rendered without editing their wording.
The question and learner messages come from the fixture. Consider whether you
would find each response accurate, proportionate, and helpful, and whether you
would want to answer the proposed next question.

### necklace-literal-correct

**Question:** How long do the Loisels spend paying their debts, and what detail shows the effort involved?

**Synthetic learner answer:** They spend ten years paying. Her husband works evenings on accounts and late at night copying manuscripts.

**Tutor feedback:**

Strengths:

- You tied the repayment time to a specific detail from the text rather than answering generally.
- You picked out the husband's extra evening and night copying work as evidence of effort.

Guidance:

- That move from a broad claim to a concrete detail is what this question is looking for.
- To round it out, look again at the section about how their household and daily routine changed — what one detail about Mathilde's day shows the effort was shared, and how would you put that detail in your own words?

Next step:

If you want, add one sentence in your own words about a household change that shows both of them felt the cost.

Concepts:

- using text evidence to support a claim

**Synthetic learner follow-up:** Is one specific example enough evidence here? I want a concise answer, not a full essay.

**Tutor follow up:**

Strengths:

- You paired the time span with one concrete effort detail instead of answering generally.

Guidance:

- Yes — one specific example is enough here. This prompt asks for two things: how long and one detail showing effort, not an essay or a full list. You already have both parts, so you can keep it concise in your own words without adding the household change.

Concepts:

- matching one piece of evidence to what the question asks

**Tutor next question:**

Based only on the supplied excerpt from "The Necklace — replacement, repayment, and ending," answer concisely in your own words in 1-2 sentences: What does Mme. Forestier tell Mathilde about the original necklace when they meet at the end, and what one specific detail from her words shows what it was worth? Give the point plus one detail; no extra list or essay is needed.

Concept focus: literal understanding with textual evidence: identifying an explicitly stated revelation and one supporting value detail

### necklace-value-mistaken

**Question:** At the end, what does Mme. Forestier reveal about the necklace she originally lent, and how does that change your understanding of the replacement?

**Synthetic learner answer:** She reveals that her original necklace was real diamonds worth thirty-six thousand francs, so the replacement cost the right amount.

**Tutor feedback:**

Strengths:

- You kept track of the 36,000 francs figure from the search for the replacement.

Guidance:

- You're remembering an important number from the middle of the passage, when they find the shop necklace.
- Take another close look at Mme. Forestier's last reply — what words does she use for what her own necklace was, and what value does she name there?
- How does that value compare to the 36,000 francs, and what would that difference suggest about those ten years of paying?

Next step:

Re-read just that final exchange and jot down the two values in your own words, then note what stands out to you.

Concepts:

- using dialogue as evidence
- comparing values in a text

**Synthetic learner follow-up:** I mixed up the two necklaces. The borrowed one was paste, worth at most five hundred francs. They bought a much more expensive replacement without knowing that.

**Tutor follow up:**

Strengths:

- You caught the earlier mix-up and separated the two necklaces clearly

Guidance:

- You've got it sorted now — the shop necklace cost them 36,000 francs, while Forestier's own words for hers point to paste worth at most five hundred francs.
- That gap is what reframes the replacement: they paid far more and spent ten years on it without knowing the original was worth so little.

Next step:

If you want to take it one step further, put into your own words what Mathilde did not know when she handed over the replacement.

Concepts:

- value contrast
- irony of the replacement

**Tutor next question:**

Use only this short excerpt from the passage:

"You say that you bought a necklace of diamonds to replace mine?" / "Yes. You never noticed it, then! They were very like." / "Oh, my poor Mathilde! Why, my necklace was paste. It was worth at most five hundred francs!"

Question separate from the excerpt: What does this exchange suggest Mathilde did not know when she handed over the replacement necklace? In your response, point to specific words in the excerpt that support your inference and explain how they support it.

Concept focus: Using textual evidence to support an inference about what Mathilde did not know when replacing the necklace

### necklace-interpretation-alternative

**Question:** Does this excerpt invite any admiration for Mathilde? Support your interpretation while acknowledging a complication.

**Synthetic learner answer:** Yes. The narrator says she faces the debt with heroism, and she works for ten years to pay it. I admire that persistence even though hiding the loss and buying a replacement without asking were costly decisions.

**Tutor feedback:**

Strengths:

- Grounds admiration in the narrator's heroism language plus ten years of payment
- Acknowledges the costly choice to hide the loss and replace without asking

Guidance:

- That combination is exactly what this prompt needs — you support an interpretation and name a complication instead of only praising persistence.
- To sharpen it in your own words: which one specific work or debt detail makes heroism feel earned or strained to you, and how does the paste-necklace ending affect that admiration? Keep the example you discuss tied to this excerpt.

Next step:

If you revise, keep your claim and add one brief quoted detail for endurance and one sentence on how the ending complicates it.

Concepts:

- narrator evaluation
- evidence with complication

**Synthetic learner follow-up:** Could I instead argue that her persistence is tragic, because she suffers for a debt she did not really need to take on? Can both readings fit the same evidence?

**Tutor follow up:**

Strengths:

- You spot that persistence can look admirable and wasteful at once
- You ask whether the same evidence can support two readings, which fits this complication prompt

Guidance:

- Yes — admiration and tragedy can fit the same evidence here, they are not either-or.
- Admiration in this excerpt points to how she meets the debt once taken on — the narrator's heroism language and ten years of grinding repayment. Tragedy points to the cost and avoidability — hiding the loss, borrowing ruinously, then learning the original was paste worth at most five hundred francs.
- A different parallel may help: you can admire a neighbor's discipline for training every dawn for a charity hike, and still call it tragic when the hike is cancelled for reasons that were knowable earlier — same effort, two judgments, one about character and one about outcome.

Next step:

If you revise, keep your own claim and test in two sentences how one repayment detail can carry both admiration and tragic cost.

Concepts:

- admiration alongside tragedy
- tragic irony

**Tutor next question:**

Building on your work on admiration and tragic cost fitting the same evidence: Infer from this excerpt why paying for the replacement necklace required ten years of hardship. Point to one borrowing or repayment detail and explain what it suggests about the cost, then explain how Mme. Forestier's closing disclosure complicates that inference. Support your interpretation with one brief quotation from the excerpt, and keep your answer tied only to details stated in the excerpt.

Concept focus: Inference about cause and ironic outcome using textual evidence
