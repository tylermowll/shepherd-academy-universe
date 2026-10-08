# The Necklace reading rehearsal

Use [the paste-ready excerpt](the-necklace-excerpt.txt) in the web app's
**Paste reading or study material** mode. It is 5,347 characters, within the
50,000-character supplied-text limit. The full story in this edition is 16,119
characters and also fits that limit. Choose a topic such as “Reading comprehension:
The Necklace — character, evidence, and irony” and start a session. The app
generates a question. Choose **Read in sections** for guided practice or **Use the
whole text** if you have already read it. **Next activity**, **Easier next activity**,
and **Harder next activity** reuse the current section; **Previous section** and
**Next section** move through the saved text independently of question difficulty.

This is a continuous excerpt from Guy de Maupassant's _The Necklace_, beginning
“At the end of a week they had lost all hope” and ending with Mme. Forestier's
revelation. It includes the replacement purchase, repayment, and ending, but
omits the opening and ball. It is not an abridgment or an AI-written retelling.
Only whitespace was normalized. It contains the ending of the story.

Source: [Project Gutenberg eBook 12758](https://www.gutenberg.org/ebooks/12758),
_Library of the World's Best Mystery and Detective Stories_, edited by Julian
Hawthorne. The catalog identifies the edition as public domain in the USA;
the text does not identify the English translator. Downloaded 2026-10-08 from
<https://www.gutenberg.org/ebooks/12758.txt.utf-8>. Exact source-file SHA256 and
attribution are recorded in [the fixture](reading-necklace-v1.json).
The public-domain story is separate from this repository's original synthetic
questions, responses, follow-ups, and review criteria.

The fixture exercises three cases, each with initial feedback, a follow-up,
and a new question: correct literal understanding, a mistaken comparison of
the two necklaces, and a supported alternative interpretation of Mathilde.
Review notes stay out of model prompts. They are evaluator criteria, not
learner-facing answer keys or a model grading rubric.

Run the contract rehearsal without inference:

```sh
UV_NO_ENV_FILE=1 uv run --project apps/api --locked --no-env-file \
  python -m math_tutor.reading_evaluation \
  --fixtures evals/fixtures/reading-necklace-v1.json \
  --output /tmp/shepherd-necklace-mock.json
```

This mock command cannot establish tutoring quality. Live evaluation requires
explicit authorization and a call budget. The dated report distinguishes a
Muse CLI prompt rehearsal from testing the web app's configured provider.
