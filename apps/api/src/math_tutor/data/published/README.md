# Published reading collection

This public reference corpus is separate from the application's MIT-licensed
code and from all learner records. It contains 868 selectable texts from 21
English-language Project Gutenberg editions in 12 categories. The manifest is
the authority for the exact source editions, download addresses, file hashes
and record hashes.

Each edition's mirror catalog records “Public domain in the USA.” Each selected
text retains its author, book, Gutenberg landing page and permission metadata.
Do not infer copyright status in another jurisdiction from that US statement.
The original downloaded bytes, including their existing notices, are retained
as deterministic gzip files under `originals`. Some modern mirror text files
omit the full boilerplate, so `GUTENBERG-LICENSE.txt` also preserves the complete
Gutenberg terms supplied with edition 28722. Gutenberg's name/trademarks and
distribution terms are described there; the collection is not endorsed by
Project Gutenberg.

Selections are literal slices after UTF-8 BOM removal and CRLF-to-LF
normalization. They exclude contents pages, indexes, editorial biographies,
glossaries and transcription notes. Stories, poems, essays and chapters retain
their source wording. Oversized units are split at paragraph boundaries and
labeled as numbered excerpts. All units fit the existing 50,000-character
passage limit. Identical text hashes are included only once.

`word_count` counts whitespace-delimited tokens. The optional reading band uses
the Flesch–Kincaid grade formula with a documented, approximate English syllable
heuristic in `scripts/build-reading-library.py`. Poems and texts below 100
alphabetic words remain unrated. These estimates describe aspects of vocabulary
and sentence complexity; they are not reviewed curriculum placements, age
ratings or assessments of a learner. Historical language and ideas remain
unchanged; the historical-science category is labeled explicitly.

The initial corpus contains about 6.9 MB of selected text and about 7.2 MB of
downloaded originals. The complete package is about 10.6 MB with compressed
originals, metadata and notices. Learner passage snapshots are stored separately
in SQLite and follow their own retention/deletion policy.

Rebuild into a review directory with:

```sh
python3 scripts/build-reading-library.py --cache /tmp/shepherd-reading-sources --destination /tmp/shepherd-reading-review --download
```

Downloads require the explicit flag and use only the reviewed Gutenberg IDs and
its mirror, with bounded requests and a two-second interval. Rebuilding from a
populated cache needs no network. Source boundaries and expected unit counts
must be reviewed when an edition changes. Review the output and hashes before
replacing the packaged corpus; the runtime importer validates every record and
refuses conflicting changes to an existing text ID.

Sources: [Gutenberg offline catalog](https://www.gutenberg.org/ebooks/offline_catalogs.html),
[bulk/mirror guidance](https://www.gutenberg.org/help/mirroring.html), and each
edition's landing page recorded in `manifest.json`.
