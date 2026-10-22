# Interface wording

Read copy in its actual screen, role and operation state. Check whether the reader
understands what happened, what the action affects and what they can do next.
Prefer specific language and familiar terms; keep technical details where they
help an administrator make a meaningful configuration or recovery decision.

## Audience and actions

- Use consistent role and navigation names from the current interface and
  SPECIFICATION section 3. Distinguish administrator sign-in, learner sign-in,
  managing an account and studying through a learner account.
- Make buttons describe their outcome and identify the affected record where
  context is ambiguous. On account/data controls, check the scope, consequences
  and completed result against actual behavior. Do not invent new confirmation
  gates or claim recoverability the app does not provide.
- Keep learner instructions short and encouraging without assumptions about age,
  grade, subject or prior knowledge. Include a useful next action in empty states.
- Check terminology across labels, validation, Help, busy states and completion.
  Account names and password requirements should match current backend/schema
  behavior rather than a frozen rule in this checklist.

## Tutoring and material

- Keep topic practice, passage study, assignment references and the learner's own
  work distinct. A supplied assignment guides concepts and different practice;
  the interface must not promise answers to that assignment.
- Describe a photo reading as an interpretation, with uncertainty labeled where
  relevant. Show it before guidance. Explain automatic progress or specific
  retake/clarification advice; never imply that every reading needs approval.
- Distinguish tutor observations from optional verified checks. Do not introduce
  grades, correctness guarantees, mastery or teaching-quality claims without the
  corresponding evidence. A session recap reports saved work and guidance.
- Review loading and retry wording against the operation's actual state. A saved
  request lookup is not another submission, and next-activity generation must not
  appear to be the learner sending a chat message.

## Administration, disclosure and recovery

- Distinguish connection saving, authorized synthetic testing and active-model
  selection. Explain blocked requirements with a path to the relevant control;
  never equate connectivity, mock success or audience eligibility with model quality.
- Explain app hosting separately from where inference processes learner material.
  Avoid implying that a local server or installed PWA guarantees on-device or
  offline tutoring. Describe configured data-sharing and retention behavior
  accurately without revealing credentials or private endpoint details to learners.
- Give different recovery advice for learner passwords and operator-managed
  administrator recovery, based on current Help and runbooks. Do not suggest
  rerunning initial setup for an existing installation.
- For camera denial, expired phone links, unavailable providers, validation,
  throttling, reload and background interruption, state the cause as far as known,
  whether work was saved, and the supported next action. Preserve honest generic
  authentication errors where disclosing details would violate the contract.
- Explain when in-memory drafts can be lost and when saved work remains in History.
  Do not promise silent retry, offline answers or recovery after the reference is
  lost. Keep update prompts consistent with pending work and unsent-draft handling.

For proposed rewrites, include the current text, location/state, replacement and
why the change improves understanding. Flag missing behavior as a functional issue
rather than hiding it behind reassuring wording. Never invent user research or
claim that copy alone establishes usability.
