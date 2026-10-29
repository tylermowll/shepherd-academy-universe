# Frontend instructions

Apply the root instructions. Keep the client-rendered React/TypeScript/Vite app,
semantic HTML and local assets.

- Backend schemas and services own validation, authorization and verified grading.
  Use generated API types; public schema changes go through `make contracts` and
  `make contracts-check`.
- Keep provider keys, answer keys, private endpoints and administrator data out
  of learner bundles. Never store session tokens or private learner drafts in
  localStorage.
- The existing service worker caches public assets only. Preserve private-response
  exclusions, explicit update handling and pending-work/unsent-draft guards.
- Preserve accessible labels, keyboard behavior, focus and honest error/recovery
  states. Match component/browser coverage to the interaction being changed.
- `make smoke` builds and runs isolated browser workflows; `make smoke-built`
  reuses a matching build. Do not rebuild while tests are using the shared output.
