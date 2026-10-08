# Shared teaching: Muse Spark pilot — 2026-10-08

The tutor is clearer about when an answer is sufficient, and it gives a useful direct explanation when asked. Choosing the next activity remains uneven. The initial nine responses support a cautious claim of better feedback in this sample; they do not establish that progression is solved or that students learn more. A separate two-call generation follow-up shows partial improvement and a remaining unnecessary writing constraint.

This is a qualitative review by the coding assistant that helped implement the changes. It is not blinded, independent human acceptance, or a measured educational outcome. The raw report's human-review fields remain pending. The maintainer can judge the exact exchanges below.

## Author review

**Sufficiency and clarity: strong in the sampled replies.** In both the Necklace and fraction cases, the first answer already met the question. The tutor recognized that immediately, explained briefly why, and did not require another example, a diagram, or an essay. Its follow-up reassurance is clear. A student is less likely to wonder whether a correct answer was somehow incomplete.

This is a concrete improvement over the matching Necklace case in the [earlier rehearsal](necklace-muse-2026-10-08.md): that response requested a household detail after the learner had already supplied the requested evidence. The new response stops appropriately. Only that one reading case is shared between these pilots; the earlier mistaken-value and alternative-interpretation cases were not rerun here. One sample with changed prompts and explicit criteria is not a controlled comparison or an error-rate estimate.

**Explanation and burden: good, with a qualification.** The writing response directly distinguishes an observation from the explanation of why it supports a claim. The mulch example connects the definition to something concrete, and the tutor accepts the learner's subsequent paraphrase. It avoids making the learner answer a series of questions before receiving help. The example is moderately dense, however: soil moisture, drying and evaporation introduce additional concepts. A shorter example could be easier for some students. The claim is presented as an illustrative scenario, not a sourced experimental result.

**Progression: needs improvement.** The next fraction question changes 2/3 and 4/6 into 3/4 and 6/8, retaining the identical multiplication-by-two relationship and instruction. That is another instance of the same exercise. It can provide rehearsal, but the response gives no reason to repeat it, and it does not meet this fixture's intended progression beyond the resolved comparison. A correct answer is not mastery, so the alternative need not be harder; it should offer a useful new application or reasoning relationship at the chosen difficulty.

The next Necklace question asks about an unanswered fact from the ending, so it moves beyond the completed repayment question. It remains literal recall; it is not evidence of deeper interpretation or transfer. The writing next activity is stronger: it asks the learner to connect an observation to a claim in a new school context without first giving that connection. This creates an opportunity to apply the idea independently. The pilot does not include the learner's answer to that new activity, so successful transfer is unmeasured.

**Question and criteria alignment: a remaining gap.** The writing question asks why the observation supports the claim, but its first success criterion also requires restating the observation in the learner's own words. That is an added demand, even though the UI would show it before the learner answers. The Necklace next question's required value detail would also be clearer if requested explicitly in the question. Criteria should make the requested work clear without quietly expanding it.

**Evidence attribution: needs care.** The Necklace follow-up observation says the learner restated the repayment duration and work detail. The actual follow-up only asks whether one example is enough; those facts came from the prior answer. The learner-facing reply remains accurate, but the internal evidence summary misattributes a fresh demonstration to the follow-up. The math follow-up correctly identifies its basis as prior work. Saved observations must remain fallible records, with earlier work distinguished from a new demonstration. This app does not turn them into verified grades or automatic mastery decisions.

I found no clear false correction or invented Necklace event in these responses. No new ready-to-submit answer was supplied for an unanswered specific exercise. That observation is limited to this small, non-adversarial sample. It does not certify answer-leak resistance, factual reliability across subjects, or safety in other conversations.

## Changes prompted by this review

After this nine-call pilot, the shared generation instructions were tightened to require an exact match between question requirements and success criteria, and meaningful progression at the same selected difficulty after sufficient work. They preserve focused practice for developing work and repetition when the learner requests review. Feedback instructions now explicitly distinguish prior evidence from a sufficiency question, which is not a fresh demonstration. The nine raw outputs below are preserved as observed; they do not validate those subsequent wording changes.

The first release should therefore describe these results as improved sufficiency handling in a small pilot, with progression and evidence attribution still requiring evaluation. There is no runtime or state-control failure shown here; there are meaningful teaching-quality gaps. A useful next evaluation would retain these failures, include actual responses to the new tasks, and cover mistaken answers, supported alternatives, uncertainty, and delayed independent application across subjects.

## Initial pilot method and limits

- [Pilot fixtures](../fixtures/teaching-live-pilot-v1.json): one public-domain Necklace excerpt and two original synthetic math/writing scenarios. Three responses per scenario: feedback, follow-up, and next activity. No real learner data was used.
- [Raw report](teaching-muse-2026-10-08.json): all nine calls completed and passed the application's response validation and persistence checks. The fixture SHA256 matches the report. Schema success establishes response shape and processing, not educational quality.
- Production `make_request` and `finish_model`, an isolated synthetic SQLite database, and `guidance-v3` / `activity-v3` prompts were used. The evaluator's review notes were excluded from prompts. The cases used balanced initiative and standard difficulty; the reading case supplied the whole excerpt.
- Muse Code 1.0.3 (`1.0.3-R2198.1`), Meta `muse-spark-1.3`, medium reasoning, one model step per request, nine calls, no retries. The report verifies the configured model and terminal completion for each call.
- Application prompts and schemas were embedded in a Muse CLI request, which adds Muse's own system context. This did not exercise the app's HTTP provider adapter, native structured-output mode, deployed worker/browser loop, or configured live tutor. The active app tutor was mock at preflight.
- Median recorded CLI request time was 18.610 seconds; p95/maximum was 26.044 seconds. These include CLI overhead and are not browser latency measurements. Verified token usage and billing totals were unavailable.
- No live evidence was collected here for long-document section navigation, avoiding spoilers, photographed material, struggling students, adversarial inputs, or delayed learning. The [larger cross-subject fixture set](../fixtures/teaching-v1.json) contains additional scenarios, but this pilot ran only these three.

## Initial pilot recorded exchanges

Questions and synthetic learner messages come from the fixture. Tutor prose and generated requirements below reproduce the validated payloads without wording edits. Internal learning observations remain available in the raw JSON.

### necklace-literal-correct

**Question:** How long do the Loisels spend paying their debts, and what detail shows the effort involved?

**Minimum response specified for this activity:**

- State the repayment duration and give one concrete detail showing the effort involved.

**Synthetic learner answer:** They spend ten years paying. Her husband works evenings on accounts and late at night copying manuscripts.

**Tutor:**

That's answered — you named the ten years and pointed to his evening accounts work and late-night copying to show the effort. You may continue on.

Action: `acknowledge`. Observation: `sufficient`.

**Synthetic learner follow-up:** Is one specific example enough evidence here? I want a concise answer, not a full essay.

**Tutor:**

Yes — one specific example is enough here. You stated the ten years and gave his evening accounts work and late-night copying as the effort detail, so that question has been answered and you may continue.

Action: `acknowledge`. Observation: `sufficient`.

**Tutor next activity:** According to the final conversation between Mathilde and Mme. Forestier, what does Mme. Forestier reveal about the original necklace Mathilde borrowed?

**Generated success criteria:**

- State in your own words what Mme. Forestier says the original necklace was, using only the final conversation.
- Include the value detail she gives for the original necklace.

### math-sufficient

**Question:** Are 2/3 and 4/6 equivalent? Explain with one reason.

**Minimum response specified for this activity:**

- State whether the fractions are equivalent and give one valid reason.

**Synthetic learner answer:** Yes. Multiplying both the numerator and denominator of 2/3 by two gives 4/6.

**Tutor:**

That's right — you've answered the question. You stated they are equivalent and gave a valid reason about multiplying numerator and denominator by 2, so you may continue.

Action: `acknowledge`. Observation: `sufficient`.

**Synthetic learner follow-up:** Was that enough, or do I need to draw a diagram too?

**Tutor:**

That was enough — you stated they are equivalent and gave one valid reason about multiplying by 2, so you've answered the question and you may continue; no diagram is needed.

Action: `acknowledge`. Observation: `sufficient`.

**Tutor next activity:** Are 3/4 and 6/8 equivalent? Explain with one reason.

**Generated success criteria:**

- States whether the fractions are equivalent
- Gives one reason that connects the two fractions

### writing-explanation

**Question:** Explain how a specific observation can support a claim in an argument.

**Minimum response specified for this activity:**

- Distinguish the observation from the explanation of how it supports a claim.

**Synthetic learner answer:** I am stuck on the difference between evidence and explaining the evidence.

**Tutor:**

That distinction is tricky — think of it as two separate jobs. The observation is just what was noticed, and the explanation is why it matters for the claim. For a different example: if the claim is that mulch helps garden soil hold water, the observation could be that mulched soil still felt damp the afternoon after watering while unmulched soil felt dry. The explanation would then be that slower drying suggests less evaporation, which is why that dampness supports the claim about holding water.

Action: `explain`. Observation: `not_assessed`.

**Synthetic learner follow-up:** So an observation is the evidence, and the explanation connects it to the claim?

**Tutor:**

Yes — that's exactly it: the observation is what was noticed, and the explanation says why it matters for the claim. That question is answered, so you may continue.

Action: `acknowledge`. Observation: `sufficient`.

**Tutor next activity:** Try using the same skill with a new situation. Claim: A school's morning study hall helps students start first period ready to learn. Observation: In weeks with study hall, teachers noted fewer students asking to finish homework during first period than in weeks without it. Explain why this observation supports the claim.

**Generated success criteria:**

- Restate what was observed in this new example in your own words.
- Explain why that observation supports the claim about starting class ready to learn.

## Two-call generation follow-up after the prompt clarification

The [separate follow-up report](teaching-progression-muse-2026-10-08.json) contains **two fresh model responses**, one new math activity and one new writing activity. Seven previously recorded responses were replayed locally to reconstruct the evaluator's conversation and persistence pipeline; those replays involved no new inference. The prior nine-response report remains unchanged. These two outputs are the only new measurements here, for a total of eleven live calls across the initial pilot and follow-up.

**Math progression: a modest improvement.** The learner now constructs an equivalent fraction and explains it, rather than recognizing equivalence in another supplied pair. That changes the task while staying at the same difficulty. The same scaling procedure can still solve it, so this is limited practice progression, not evidence of broader transfer or durable understanding. The learner has not attempted the new question in this evaluation.

**Writing alignment: improved; burden still needs work.** The question and criteria now agree: both require two to three sentences and a reason connecting the observation to the claim. The extra restatement requirement is gone. However, the new sentence-count constraint is unnecessary for the stated goal of connecting evidence to a claim. A clear one-sentence explanation could show the intended understanding. This illustrates why exact agreement between question and criteria is necessary but insufficient: both can contain an unhelpful requirement.

The crosswalk observation is also indirect evidence for the claim about noticing pedestrians. It should remain acceptable for a student to qualify that connection rather than treat earlier slowing as proof of what drivers noticed. The pilot does not measure how the tutor would respond to that qualification.

These outputs do not establish that the final prompts generalize across subjects or eliminate repetitive work. The final feedback instruction about attributing evidence to earlier work was **not remeasured**: all feedback and follow-up responses in this second run were local replays. There was no new Necklace generation call. This remains a Muse CLI rehearsal with added Muse system context, not an app HTTP adapter or deployed browser/worker test.

Both fresh generations completed, matched the required response schema, and passed the normal persistence handler. The report verifies Meta `muse-spark-1.3`, medium reasoning, one model step per call and no retries, and records each fresh prompt hash. Their recorded CLI times were 19.336 and 29.710 seconds (median 24.523 seconds). Token and billing totals remain unavailable.

### Fresh math activity

Write a fraction that is equivalent to 3/5 and explain with one reason why it is equivalent.

**Generated success criteria:**

- States a fraction
- Gives one reason why it is equivalent

### Fresh writing activity

Try this new situation. Claim: Painting the edges of a crosswalk with bright borders helps drivers notice pedestrians sooner. Observation: At the bright-bordered crosswalk, drivers started slowing down farther back than at a plain crosswalk on the same street. In 2-3 sentences, explain why this observation supports the claim.

**Generated success criteria:**

- Write 2-3 sentences.
- Include one reason why the observation matters for the claim.
