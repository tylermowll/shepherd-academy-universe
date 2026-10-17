# Local evaluation candidates

This directory describes how to review private evaluation candidates. Files from the Internet
under ignored `internet-examples/` are excluded from CI and the public dataset.
Their source URLs, authors and redistribution permissions have not been supplied;
the repository's MIT license does not cover those downloads.

The September 7, 2026 intake recorded three PNG/JPEG files accepted by the image
normalizer and three GIFs rejected as unsupported. That was a local decoder
check, without inference or saved learner submissions. It did not establish a
correct transcription, useful tutoring or physical-camera behavior. Public
[image tests](../../apps/api/tests/unit/test_images.py) use original synthetic
fixtures and do not depend on the private candidates.

Before promoting a candidate into the public suite, record its exact source URL,
author, license/permission, file hash, selected crop and independently reviewed
expected reading, including intentionally unreadable regions. Preserve the
original and document any frame selection or conversion. Do not broaden accepted
upload formats to accommodate a candidate.

Prefer newly authored synthetic work for public handwriting, organization and
ambiguity cases. Follow [TUTOR_EVALUATION](../../docs/TUTOR_EVALUATION.md) for
authorized live review and [ACCEPTANCE](../../docs/ACCEPTANCE.md) for physical-device
checks. Uncertain readings receive specific clarification advice; there is no
photo approval gate.
