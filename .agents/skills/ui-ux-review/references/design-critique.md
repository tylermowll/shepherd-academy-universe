# Design critique

Judge each screen in the context of its role, goal, preceding action and next
useful action. Use the existing product's visual language; a preference for a
different palette, font or framework is not evidence of a defect.

## Task and navigation

- Can someone identify their current account, workspace and next action? Check
  both Management and Learning, their sign-in links, Help and direct/reloaded
  destinations. Managing a learner must not imply signing in as that learner.
- Follow the task through success and recovery. Check competing actions, excessive
  required steps, undiscoverable secondary controls and unclear disabled states.
- Account switching, tab navigation, reload and session expiry have different
  draft/recovery contracts. Compare the actual behavior and wording with current
  SPECIFICATION sections 3 and 10; do not recommend persisting private drafts in
  browser storage as a cosmetic improvement.
- Check administrator account forms, device revocation, data controls, provider
  setup and model selection. Is the selected learner/connection and the scope of
  each action obvious before and after it completes?
- Preserve the distinction between saving a connection, testing it and selecting
  an active model. A successful save or mock test cannot imply live teaching
  quality or permission to send learner data elsewhere.

## Hierarchy and interaction

- At the relevant viewport, can the user find the task, current status and primary
  action without interpreting internal implementation details? Check reading order,
  heading levels, spacing, text density and familiar treatment of links/buttons.
- Check repeated controls for consistent names and behavior. Compare similar
  forms, validation errors, disclosures, loading indicators and empty states.
- In Practice, keep current instructions, chronological conversation and a stable
  message entry area usable with long text, mathematics and attachments. Secondary
  material/settings must remain reachable on narrow screens.
- In administrator forms, inspect long learner names, connection names, policy
  explanations and usage rows. Check wrapping, horizontal scrolling, focus and
  whether status is still associated with the correct record.
- Inspect delayed jobs, rapid navigation, double activation and retry. A busy
  indicator must explain what is happening without implying that a new request
  was submitted or a result already exists.

## Teaching and phone flow

Check that photo interpretation appears before guidance and readable work proceeds
automatically. Recommend clarification only for uncertainty that prevents useful
feedback; do not add an approval step. Assignment references support different
practice and explanations rather than answers to the active assignment.

Review the handoff between desktop and phone, not only the photo picker. Check
whether QR upload is distinguishable from sign-in, the intended task is identifiable
without revealing unnecessary learner content, and the desktop resumes the same
operation after upload, expiry or reconnect.

For each suggestion, describe the concrete friction and the smallest coherent
change. Keep demonstrated failures separate from subjective improvements; preserve
the parts of the workflow that already work.
