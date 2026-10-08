"""User-requested public text imports from fixed sources, with no model tools."""

import base64
import hashlib
import hmac
import ipaddress
import multiprocessing
import os
import re
import socket
import threading
import time
from contextlib import nullcontext
from html.parser import HTMLParser
from multiprocessing.connection import Connection
from typing import Literal
from uuid import UUID
from xml.etree import ElementTree

import httpx2 as httpx
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, HttpUrl, ValidationError

from math_tutor import settings
from math_tutor.reading import ReadingPassage

BOOK_URL = "https://gutenberg.pglaf.org/2/21/21-0.txt"
NEWS_URL = "https://www.nasa.gov/news-release/feed/"
MAX_SOURCE_BYTES = 1_048_576
SOURCE_SECONDS = 12
SourceId = Literal["aesop_hare", "aesop_grapes", "nasa_news"]
SOURCES: dict[str, str] = {
    "aesop_hare": "Aesop — The Hare and the Tortoise",
    "aesop_grapes": "Aesop — The Fox and the Grapes",
    "nasa_news": "NASA — Recent science and space news",
}


class SourceError(Exception):
    pass


class SourceChoice(BaseModel):
    id: SourceId
    title: str


class ImportedPassage(BaseModel):
    passage: ReadingPassage
    source_token: str


class SourceClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    learner_id: UUID
    expires_at: int
    passage: ReadingPassage


def sign_source(passage: ReadingPassage, learner_id: UUID) -> ImportedPassage:
    claim = SourceClaim(learner_id=learner_id, expires_at=int(time.time()) + 3600, passage=passage)
    payload = base64.urlsafe_b64encode(claim.model_dump_json().encode()).decode().rstrip("=")
    signature = hmac.new(
        settings.session_secret().encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return ImportedPassage(passage=passage, source_token=payload + "." + signature)


def verify_source_token(token: str, learner_id: UUID) -> ReadingPassage:
    try:
        payload, signature = token.split(".")
        expected = hmac.new(
            settings.session_secret().encode(), payload.encode(), hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        claim = SourceClaim.model_validate_json(
            base64.b64decode(payload + "=" * (-len(payload) % 4), altchars=b"-_", validate=True)
        )
        if claim.learner_id != learner_id or claim.expires_at <= time.time():
            raise ValueError("expired or wrong learner")
        if claim.passage.origin != "published":
            raise ValueError("source")
        return claim.passage
    except ValueError, TypeError, ValidationError:
        raise HTTPException(
            422,
            "This source preview expired or is invalid for this learner. Load the source again.",
        ) from None


def public_targets(url: str) -> list[httpx.URL]:
    if url not in {BOOK_URL, NEWS_URL}:
        raise SourceError("unsupported_source")
    endpoint = httpx.URL(url)
    rows = socket.getaddrinfo(endpoint.host, 443, type=socket.SOCK_STREAM)
    hosts = list(dict.fromkeys(str(row[4][0]) for row in rows))
    addresses = [ipaddress.ip_address(host) for host in hosts]
    if not hosts or any(
        not address.is_global
        or address.is_multicast
        or address.is_reserved
        or getattr(address, "scope_id", None) is not None
        for address in addresses
    ):
        raise SourceError("unsafe_source")
    return [endpoint.copy_with(host=host) for host in hosts]


def download(url: str, client: httpx.Client | None = None) -> bytes:
    """Only fixed URLs, pinned public addresses, TLS, no redirects/cookies/proxies."""
    if url not in {BOOK_URL, NEWS_URL}:
        raise SourceError("unsupported_source")
    endpoint = httpx.URL(url)
    targets = [endpoint] if client is not None else public_targets(url)
    with (
        nullcontext(client)
        if client is not None
        else httpx.Client(timeout=SOURCE_SECONDS, follow_redirects=False, trust_env=False)
    ) as transport:
        for target in targets:
            try:
                with transport.stream(
                    "GET",
                    target,
                    headers={
                        "Host": endpoint.netloc.decode(),
                        "Accept-Encoding": "identity",
                        "User-Agent": "ShepherdAcademyUniverse/0.1 (educational text import)",
                    },
                    extensions={"sni_hostname": endpoint.host},
                    follow_redirects=False,
                ) as response:
                    if (
                        response.status_code != 200
                        or response.headers.get("content-encoding", "identity") != "identity"
                    ):
                        raise SourceError("source_unavailable")
                    data = bytearray()
                    for chunk in response.iter_bytes(chunk_size=65536):
                        data.extend(chunk)
                        if len(data) > MAX_SOURCE_BYTES:
                            raise SourceError("source_too_large")
                    return bytes(data)
            except httpx.ConnectError, httpx.ConnectTimeout:
                if target == targets[-1]:
                    raise SourceError("source_unavailable") from None
    raise SourceError("source_unavailable")


def _download_child(url: str, sender: Connection) -> None:
    timer = threading.Timer(SOURCE_SECONDS, os._exit, args=(1,))
    timer.daemon = True
    timer.start()
    try:
        sender.send_bytes(b"ok:" + download(url))
    except Exception:
        sender.send_bytes(b"error")
    finally:
        timer.cancel()
        sender.close()


def fetch_source(url: str) -> bytes:
    """A total deadline includes DNS, connection, and slowly arriving content."""
    if url not in {BOOK_URL, NEWS_URL}:
        raise SourceError("unsupported_source")
    context = multiprocessing.get_context("spawn")
    receiver, sender = context.Pipe(duplex=False)
    child = context.Process(target=_download_child, args=(url, sender), daemon=True)
    deadline = time.monotonic() + SOURCE_SECONDS
    try:
        child.start()
        sender.close()
        if not receiver.poll(max(0, deadline - time.monotonic())):
            raise SourceError("source_timeout")
        data = receiver.recv_bytes(maxlength=MAX_SOURCE_BYTES + 3)
        if not data.startswith(b"ok:"):
            raise SourceError("source_unavailable")
        return data[3:]
    except EOFError, OSError:
        raise SourceError("source_unavailable") from None
    finally:
        receiver.close()
        sender.close()
        if child.pid is not None:
            child.join(timeout=0.1)
            if child.is_alive():
                child.terminate()
                child.join(timeout=1)
            if child.is_alive():
                child.kill()
                child.join(timeout=1)
            child.close()


def story(data: bytes, title: str) -> ReadingPassage:
    text = data.decode("utf-8-sig").replace("\r\n", "\n")
    match = re.search(r"(?im)^" + re.escape(title) + r"[ \t]*\n[ \t]*\n", text)
    if match is None:
        raise SourceError("source_changed")
    remaining = text[match.end() :]
    end = re.search(r"\n{2,}[A-Z][A-Za-z’' ,\-]{2,100}\n{2,}", remaining)
    if end is None:
        raise SourceError("source_changed")
    body = remaining[: end.start()].strip()
    if not 40 <= len(body) <= 8000:
        raise SourceError("source_changed")
    return ReadingPassage(
        title=title,
        text=body,
        origin="published",
        author="Aesop (George Fyler Townsend translation)",
        source_url=HttpUrl("https://www.gutenberg.org/ebooks/21"),
        excerpt=True,
        permission="Project Gutenberg eBook 21; public domain in the United States. Source text imported from the Gutenberg mirror; check local permissions outside the US.",
    )


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []
        self.hidden: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag in {"script", "style", "figure", "svg", "noscript"}:
            self.hidden.append(tag)
        if not self.hidden and tag in {"p", "br", "div", "h1", "h2", "h3", "li"}:
            self.parts.append("\n\n")

    def handle_endtag(self, tag: str) -> None:
        if self.hidden and tag == self.hidden[-1]:
            self.hidden.pop()
        if not self.hidden and tag in {"p", "div", "li", "h1", "h2", "h3"}:
            self.parts.append("\n\n")

    def handle_data(self, data: str) -> None:
        if not self.hidden:
            self.parts.append(data)

    def text(self) -> str:
        return "\n\n".join(
            " ".join(part.split()) for part in "".join(self.parts).split("\n\n") if part.strip()
        )


def news(data: bytes) -> list[ReadingPassage]:
    # The approved feed is UTF-8. Decode before checking declarations so alternate
    # XML encodings cannot hide entity expansion from the declaration guard.
    xml = data.decode("utf-8-sig")
    if "\x00" in xml or "<!DOCTYPE" in xml.upper() or "<!ENTITY" in xml.upper():
        raise SourceError("source_changed")
    root = ElementTree.fromstring(xml)
    passages: list[ReadingPassage] = []
    for item in root.findall("./channel/item")[:20]:
        link = item.findtext("link") or ""
        parsed = httpx.URL(link)
        if (
            parsed.scheme != "https"
            or parsed.host not in {"www.nasa.gov", "science.nasa.gov"}
            or parsed.port not in {None, 443}
            or parsed.username
            or parsed.password
        ):
            continue
        title = item.findtext("title") or ""
        full_text = item.findtext("{http://purl.org/rss/1.0/modules/content/}encoded")
        body = full_text or item.findtext("description") or ""
        extractor = TextExtractor()
        extractor.feed(body)
        text = extractor.text()
        if len(text) < 100 or not title.strip():
            continue
        excerpt = not full_text or len(text) > 8000
        if len(text) > 8000:
            # Select an explicit opening excerpt, ending at a paragraph when possible.
            prefix = text[:8000]
            end = prefix.rfind("\n\n")
            text = prefix[:end] if end >= 100 else prefix.rsplit(" ", 1)[0]
        passages.append(
            ReadingPassage(
                title=title[:200],
                text=text,
                origin="published",
                author="NASA",
                source_url=HttpUrl(link),
                published_at=(item.findtext("pubDate") or "")[:100] or None,
                excerpt=excerpt,
                permission="NASA text for educational/informational use; NASA acknowledged as source, no endorsement. Images and figure captions are excluded.",
            )
        )
        if len(passages) == 5:
            break
    if not passages:
        raise SourceError("source_changed")
    return passages


def import_source(source_id: SourceId) -> list[ReadingPassage]:
    if source_id not in SOURCES:
        raise SourceError("unsupported_source")
    try:
        if source_id == "nasa_news":
            return news(fetch_source(NEWS_URL))
        title = (
            "The Hare and the Tortoise" if source_id == "aesop_hare" else "The Fox and the Grapes"
        )
        return [story(fetch_source(BOOK_URL), title)]
    except UnicodeError, ValueError, ElementTree.ParseError, httpx.InvalidURL:
        raise SourceError("source_changed") from None
