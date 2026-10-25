"""Rebuild the reviewed public corpus; network downloads require --download.

Only the listed Gutenberg IDs and its public mirror are accepted. This is an
operator/build tool, never a learner/model retrieval tool. Originals retain the
Gutenberg notices; selected text is a literal slice of the normalized original.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
DESTINATION = ROOT / "apps/api/src/math_tutor/data/published"
MIRROR = "https://gutenberg.pglaf.org"
# id, display title, credited author, category, layout
BOOKS = [
    (21, "Aesop's Fables", "Aesop; translated by George Fyler Townsend", "Fables", "fables"),
    (2591, "Grimms' Fairy Tales", "Jacob and Wilhelm Grimm", "Fairy tales", "caps"),
    (1597, "Andersen's Fairy Tales", "Hans Christian Andersen", "Fairy tales", "caps"),
    (11, "Alice's Adventures in Wonderland", "Lewis Carroll", "Fantasy", "chapter"),
    (12, "Through the Looking-Glass", "Lewis Carroll", "Fantasy", "chapter"),
    (55, "The Wonderful Wizard of Oz", "L. Frank Baum", "Fantasy", "chapter"),
    (16, "Peter Pan", "J. M. Barrie", "Fantasy", "chapter"),
    (113, "The Secret Garden", "Frances Hodgson Burnett", "Family and friendship", "chapter"),
    (45, "Anne of Green Gables", "L. M. Montgomery", "Family and friendship", "chapter"),
    (514, "Little Women", "Louisa May Alcott", "Family and friendship", "chapter"),
    (28722, "A Child's Garden of Verses", "Robert Louis Stevenson", "Poetry", "poems"),
    (
        23,
        "Narrative of the Life of Frederick Douglass",
        "Frederick Douglass",
        "History and biography",
        "bare_chapter",
    ),
    (5726, "The Fairy-Land of Science", "Arabella B. Buckley", "Historical science", "science"),
    (575, "The Essays or Counsels, Civil and Moral", "Francis Bacon", "Essays", "essays"),
    (35, "The Time Machine", "H. G. Wells", "Science fiction", "roman"),
    (1661, "The Adventures of Sherlock Holmes", "Arthur Conan Doyle", "Mystery", "holmes"),
    (120, "Treasure Island", "Robert Louis Stevenson", "Adventure", "roman"),
    (236, "The Jungle Book", "Rudyard Kipling", "Animal stories", "mixed"),
    (271, "Black Beauty", "Anna Sewell", "Animal stories", "numbered"),
    (289, "The Wind in the Willows", "Kenneth Grahame", "Animal stories", "roman"),
    (2781, "Just So Stories", "Rudyard Kipling", "Animal stories", "caps"),
]
EXPECTED_UNITS = {
    21: 308,
    2591: 63,
    1597: 18,
    11: 12,
    12: 12,
    55: 24,
    16: 17,
    113: 27,
    45: 38,
    514: 47,
    28722: 63,
    23: 11,
    5726: 10,
    575: 59,
    35: 16,
    1661: 12,
    120: 34,
    236: 14,
    271: 49,
    289: 12,
    2781: 12,
}
NAMESPACES = {
    "pg": "http://www.gutenberg.org/2009/pgterms/",
    "dc": "http://purl.org/dc/terms/",
    "rdf": "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url: str) -> bytes:
    if not url.startswith(MIRROR + "/"):
        raise ValueError("Only the reviewed Gutenberg mirror is allowed.")
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "ShepherdAcademyUniverse/0.1 (educational library import)",
            "Accept-Encoding": "identity",
        },
    )
    try:
        with opener.open(request, timeout=30) as response:
            data = response.read(8_000_001)
            if len(data) > 8_000_000:
                raise ValueError("Public source exceeds the 8 MB import bound.")
            return data
    finally:
        time.sleep(2)


def cache_book(cache: Path, book_id: int, download: bool) -> tuple[bytes, bytes, str]:
    rdf_path = cache / f"{book_id}.rdf"
    text_path = cache / f"{book_id}.txt"
    url_path = cache / f"{book_id}.url"
    if not rdf_path.exists():
        if not download:
            raise ValueError(f"Missing metadata for {book_id}; use --download explicitly.")
        rdf_path.write_bytes(fetch(f"{MIRROR}/cache/epub/{book_id}/pg{book_id}.rdf"))
    metadata = rdf_path.read_bytes()
    if b"<!DOCTYPE" in metadata.upper() or b"<!ENTITY" in metadata.upper():
        raise ValueError("External declarations are not accepted in catalog metadata.")
    root = ElementTree.fromstring(metadata)
    ebook = root.find("pg:ebook", NAMESPACES)
    if (
        ebook is None
        or ebook.findtext("dc:rights", namespaces=NAMESPACES) != "Public domain in the USA."
    ):
        raise ValueError(f"Book {book_id} does not have the reviewed US public-domain status.")
    languages = ebook.findall("dc:language/rdf:Description/rdf:value", NAMESPACES)
    if not any(value.text == "en" for value in languages):
        raise ValueError(f"Book {book_id} is not cataloged in English.")
    if not text_path.exists():
        if not download:
            raise ValueError(f"Missing text for {book_id}; use --download explicitly.")
        digits = "/".join(str(book_id)[:-1])
        urls = [
            f"{MIRROR}/{digits}/{book_id}/{book_id}-0.txt",
            f"{MIRROR}/cache/epub/{book_id}/pg{book_id}.txt",
            f"{MIRROR}/{digits}/{book_id}/{book_id}.txt",
        ]
        for url in urls:
            try:
                original = fetch(url)
            except urllib.error.HTTPError as error:
                if error.code != 404:
                    raise
            else:
                original.decode("utf-8-sig")
                text_path.write_bytes(original)
                url_path.write_text(url + "\n")
                break
        else:
            raise ValueError(f"No UTF-8 text found for reviewed book {book_id}.")
    return metadata, text_path.read_bytes(), url_path.read_text().strip()


def body_text(original: bytes) -> str:
    normalized = original.decode("utf-8-sig").replace("\r\n", "\n")
    start = re.search(
        r"(?im)^\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*[^\n]*\n",
        normalized,
    )
    end = re.search(r"(?im)^\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK", normalized)
    if start is None or end is None or start.end() >= end.start():
        raise ValueError("Expected explicit Gutenberg body boundaries.")
    body = normalized[start.end() : end.start()]
    return re.split(r"(?im)^End of (?:the )?Project Gutenberg", body, maxsplit=1)[0]


def heading_spans(body: str, layout: str, book_id: int) -> list[tuple[str, str]]:
    collection_starts = {
        21: "The Lion And The Mouse",
        2591: "THE GOLDEN BIRD",
        1597: "THE EMPEROR'S NEW CLOTHES",
        236: "Mowgli’s Brothers",
        2781: "HOW THE WHALE GOT HIS THROAT",
    }
    allowed_titles: set[str] | None = None
    if book_id in collection_starts:
        first = re.search(r"(?m)^" + re.escape(collection_starts[book_id]) + r"[ \t]*\n", body)
        if first is None:
            raise ValueError(f"Missing reviewed opening heading for {book_id}.")
        contents = body[: first.start()]
        contents_start = re.search(r"(?im)^[ \t]*(?:TABLE OF )?CONTENTS:?[ \t]*\n", contents)
        if contents_start is None:
            raise ValueError(f"Missing reviewed contents for collection {book_id}.")
        allowed_titles = {
            line.strip().casefold()
            for line in contents[contents_start.end() :].splitlines()
            if line.strip()
        }
        body = body[first.start() :]
    if book_id == 21:
        body = re.split(r"(?m)^FOOTNOTES\s*$", body, maxsplit=1)[0]
    if book_id == 2591:
        body = re.split(r"(?m)^\*{5}\s*$", body, maxsplit=1)[0]
    if book_id == 28722:
        body = re.split(r"(?m)^Transcriber's Note:", body, maxsplit=1)[0]
    if book_id == 575:
        body = re.split(r"(?m)^A Glossary Of Archaic Words And Phrases", body, maxsplit=1)[0]
    if book_id == 5726:
        opening = re.search(r"(?m)^LECTURE I[ \t]*\n", body)
        if opening is None:
            raise ValueError("Missing reviewed first science lecture.")
        body = body[opening.start() :]
    patterns = {
        "fables": r"(?m)^([^\W\d_][\w’' ,\-]{2,110})[ \t]*\n[ \t]*\n",
        "caps": r"(?m)^([A-Z“][A-Z0-9’' ,:;!?—\-\[\]“”]{3,140})[ \t]*\n[ \t]*\n",
        "mixed": r"(?m)^([^\n]{3,140})[ \t]*\n[ \t]*\n",
        "chapter": r"(?im)^(CHAPTER[ \t]+[A-Z0-9-]+\.?[^\n]*)[ \t]*\n",
        "bare_chapter": r"(?im)^[ \t]*(CHAPTER[ \t]+[IVXLCDM0-9]+\.?)[ \t]*\n[ \t]*\n",
        "numbered": r"(?m)^([0-9]{2}[ \t]+[^\n]+)\n[ \t]*\n",
        "poems": r"(?m)^([IVXLCDM]+)[ \t]*\n(?:[ \t]*\n)*([^\n]+)\n",
        "science": r"(?m)^((?:LECTURE|Lecture)[ \t]+[IVXLCDM0-9]+(?=[ \t.\n])(?:\.[ \t]*|[ \t]+)?(?:[A-Z][^\n]*)?)[ \t]*\n",
        "essays": r"(?m)^(Of [^\n]+)\n[ \t]*\n",
        "roman": r"(?m)^[ \t]*([IVXLCDM]+\.?)[ \t]*\n(?:[ \t]*\n)*([^\n]+)\n",
        "holmes": r"(?m)^([IVXLCDM]+[.]?[ \t]+[A-Z][^\n]+)\n[ \t]*\n",
    }
    matches = list(re.finditer(patterns[layout], body))
    if allowed_titles is not None:
        matches = [
            match for match in matches if match.group(1).strip().casefold() in allowed_titles
        ]

    # A contents page can repeat real headings. Keep the last occurrence of an
    # identical heading; no selection should consist of a table of contents.
    def heading_key(match: re.Match[str]) -> str:
        return " ".join(group.strip() for group in match.groups() if group is not None)

    last = {heading_key(match): match.start() for match in matches}
    matches = [match for match in matches if last[heading_key(match)] == match.start()]
    spans = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        value = body[match.end() : end].strip()
        title = heading_key(match)
        if layout == "chapter":
            # These reviewed novel editions put the chapter title on the next
            # nonblank line. Douglass uses bare_chapter to preserve its opening.
            inline_title = re.sub(r"(?i)^CHAPTER\s+[A-Z0-9-]+\.?\s*", "", title)
            if not inline_title:
                next_line, separator, rest = value.partition("\n")
                if separator and len(next_line) <= 160:
                    title += " — " + next_line
                    value = rest.strip()
        if layout == "science":
            value = re.sub(r"\s+Week [0-9]+\s*$", "", value).strip()
        if book_id == 23:
            value = re.split(r"(?m)^[ \t]*APPENDIX\s*$", value, maxsplit=1)[0].strip()
        if value:
            spans.append((title, value))
    return spans


def pieces(text: str) -> list[str]:
    """Split only oversized units at literal paragraph boundaries."""
    result = []
    while len(text) > 48_000:
        boundary = text.rfind("\n\n", 20_000, 48_000)
        if boundary < 0:
            boundary = text.rfind(" ", 20_000, 48_000)
        if boundary < 0:
            raise ValueError("A source has no safe excerpt boundary.")
        result.append(text[:boundary].strip())
        text = text[boundary:].strip()
    if text:
        result.append(text)
    return result


def estimate_level(text: str, text_kind: str) -> tuple[str | None, str]:
    words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)?", text)
    if text_kind == "poem" or len(words) < 100:
        return (
            None,
            "Unrated: poetry and texts under 100 words are excluded from the automatic estimate.",
        )
    syllables = 0
    for word in words:
        lower = word.lower()
        groups = len(re.findall(r"[aeiouy]+", lower))
        if lower.endswith("e") and not lower.endswith(("le", "ye")):
            groups -= 1
        syllables += max(1, groups)
    sentences = max(1, len(re.findall(r"[.!?]+(?:[\"'’”)]*)?(?:\s|$)", text)))
    grade = 0.39 * len(words) / sentences + 11.8 * syllables / len(words) - 15.59
    band = (
        "grades_k_2"
        if grade < 3
        else "grades_3_5"
        if grade < 6
        else "grades_6_8"
        if grade < 9
        else "grades_9_12"
        if grade < 13
        else "adult"
    )
    return (
        band,
        "Automatic Flesch–Kincaid estimate with heuristic English syllable counts; approximate vocabulary/sentence complexity, not an age or curriculum rating.",
    )


def build(cache: Path, download: bool, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "texts").mkdir(exist_ok=True)
    (destination / "originals").mkdir(exist_ok=True)
    records = []
    sources = []
    counts = Counter()
    content_hashes: set[str] = set()
    for book_id, book_title, author, category, layout in BOOKS:
        rdf, original, download_url = cache_book(cache, book_id, download)
        body = body_text(original)
        units = heading_spans(body, layout, book_id)
        if len(units) != EXPECTED_UNITS[book_id]:
            raise ValueError(
                f"Review changed source {book_id}: expected {EXPECTED_UNITS[book_id]} units, found {len(units)}."
            )
        source_url = f"https://www.gutenberg.org/ebooks/{book_id}"
        original_path = f"originals/pg{book_id}.txt.gz"
        (destination / original_path).write_bytes(gzip.compress(original, mtime=0))
        sources.append(
            {
                "book_id": str(book_id),
                "title": book_title,
                "author": author,
                "source_url": source_url,
                "download_url": download_url,
                "rights": "Public domain in the USA.",
                "original_path": original_path,
                "original_sha256": hashlib.sha256(original).hexdigest(),
                "metadata_sha256": hashlib.sha256(rdf).hexdigest(),
                "layout": layout,
            }
        )
        for index, (heading, text) in enumerate(units, 1):
            chunks = pieces(text)
            for part, chunk in enumerate(chunks, 1):
                if chunk not in body:
                    raise ValueError("An excerpt must remain literal source text.")
                kind = (
                    "poem"
                    if category == "Poetry"
                    else "essay"
                    if category == "Essays"
                    else "story"
                    if layout in {"fables", "caps"}
                    else "chapter"
                )
                if layout == "mixed":
                    kind = (
                        "poem"
                        if any(
                            word in heading.casefold()
                            for word in ("song", "chant", "lukannon", "shiv")
                        )
                        else "story"
                    )
                if book_id == 1661:
                    kind = "story"
                if len(chunks) > 1:
                    kind = "excerpt"
                content_hash = hashlib.sha256(chunk.encode()).hexdigest()
                if content_hash in content_hashes:
                    continue
                content_hashes.add(content_hash)
                level, basis = estimate_level(chunk, kind)
                identifier = f"pg{book_id}-{index:03d}" + (f"-{part}" if len(chunks) > 1 else "")
                label = heading.title()
                label = label.replace("'S", "'s").replace("’S", "’s")
                label = re.sub(
                    r"(?i)^(Chapter |Lecture )?([ivxlcdm]+)([. ]|$)",
                    lambda match: (match.group(1) or "") + match.group(2).upper() + match.group(3),
                    label,
                )
                if layout == "poems":
                    label = re.sub(r"^[IVXLCDM]+[. ]+", "", label)
                if len(chunks) > 1:
                    label += f" — excerpt {part} of {len(chunks)}"
                title = (
                    label
                    if layout in {"fables", "caps", "poems", "essays"}
                    else f"{book_title}: {label}"
                )
                record = {
                    "id": identifier,
                    "title": title[:200],
                    "text": chunk,
                    "author": author,
                    "category": category,
                    "word_count": len(chunk.split()),
                    "text_kind": kind,
                    "reading_level": level,
                    "level_basis": basis,
                    "source_url": source_url,
                    "permission": f"Project Gutenberg eBook {book_id}; public domain in the United States. Original source and Gutenberg notices are retained with the library. Check local permissions outside the US.",
                    "excerpt": kind in {"chapter", "excerpt"},
                    "source_book_id": str(book_id),
                    "source_book_title": book_title,
                    "content_sha256": content_hash,
                }
                encoded = (json.dumps(record, ensure_ascii=False, indent=2) + "\n").encode()
                path = f"texts/{identifier}.json"
                (destination / path).write_bytes(encoded)
                records.append({"path": path, "sha256": hashlib.sha256(encoded).hexdigest()})
                counts[category] += 1
        print(
            json.dumps({"book": book_id, "units": len(units), "raw_bytes": len(original)}),
            flush=True,
        )
    if not 500 <= len(records) <= 1000:
        raise ValueError(f"Expected 500–1000 reviewed selections, got {len(records)}.")
    license_source = (cache / "28722.txt").read_bytes().decode("utf-8-sig").replace("\r\n", "\n")
    license_start = license_source.find("START: FULL LICENSE")
    if license_start < 0:
        raise ValueError("The reviewed full Gutenberg license is missing.")
    (destination / "GUTENBERG-LICENSE.txt").write_text(
        license_source[license_start:].rstrip() + "\n"
    )
    manifest = {
        "schema_version": 1,
        "source_policy": "Reviewed English-language US-public-domain Gutenberg editions, downloaded from its mirror. Literal stories/poems/essays/chapters; oversized units labeled excerpts. Automatic reading bands are approximate and do not certify age or curriculum suitability. UTF-8 BOM removal and CRLF normalization only; original bytes and notices retained. GUTENBERG-LICENSE.txt includes the full Gutenberg terms from edition 28722. Historical science and biography reflect their publication period.",
        "sources": sources,
        "records": records,
    }
    (destination / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    )
    print(
        json.dumps(
            {
                "selections": len(records),
                "books": len(sources),
                "categories": dict(counts),
                "bytes": sum(
                    path.stat().st_size for path in destination.rglob("*") if path.is_file()
                ),
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache", type=Path, default=Path("/tmp/shepherd-reading-sources"))
    parser.add_argument("--destination", type=Path, default=DESTINATION)
    parser.add_argument("--download", action="store_true")
    arguments = parser.parse_args()
    arguments.cache.mkdir(parents=True, exist_ok=True)
    build(arguments.cache, arguments.download, arguments.destination)
