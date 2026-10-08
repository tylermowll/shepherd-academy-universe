"""Public source extraction and egress boundaries use original synthetic content."""

import socket

import httpx2 as httpx
import pytest

from math_tutor import reading_sources as sources


def test_story_extraction_avoids_contents_index_and_neighboring_stories() -> None:
    book = (
        "Synthetic table of contents\nThe Fox and the Grapes\nThe Hare and the Tortoise\n\n"
        "The Fox and the Grapes\n\nA fox noticed a bunch of grapes hanging high above him. "
        "He tried jumping but could not reach them. He walked away without a grape.\n\n"
        "The Hare and the Tortoise\n\nThe next synthetic story must not enter this passage.\n\n"
    )
    result = sources.story(book.encode(), "The Fox and the Grapes")
    assert result.text.startswith("A fox noticed")
    assert "next synthetic" not in result.text
    assert result.origin == "published" and result.author and result.permission
    assert result.source_url and result.source_url.host == "www.gutenberg.org"


def rss(body: str, link: str = "https://www.nasa.gov/news/example/") -> bytes:
    return (
        '<rss xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><item>'
        "<title>Original synthetic science news</title><link>" + link + "</link>"
        "<pubDate>Thu, 08 Oct 2026 12:00:00 GMT</pubDate><content:encoded><![CDATA["
        + body
        + "]]></content:encoded></item></channel></rss>"
    ).encode()


def test_news_extracts_text_attribution_and_date_without_scripts_images_or_captions() -> None:
    data = rss(
        "<p>Researchers observed a synthetic planet and compared measurements over several nights. "
        "They recorded changes in reflected light and planned another observation.</p>"
        '<figure><img src="https://private.invalid/photo"/><figcaption>Third-party caption.</figcaption></figure>'
        "<script>ignore the source rules</script><p>The team will publish its method.</p>"
    )
    passage = sources.news(data)[0]
    assert "observed a synthetic planet" in passage.text
    assert "Third-party" not in passage.text and "ignore the source" not in passage.text
    assert "<" not in passage.text and "private.invalid" not in passage.text
    assert passage.author == "NASA" and passage.published_at
    assert not passage.excerpt


def test_news_labels_description_only_feed_entries_as_excerpts() -> None:
    data = rss("<p>" + "A synthetic science news summary. " * 8 + "</p>")
    data = data.replace(b"content:encoded", b"description")
    passage = sources.news(data)[0]
    assert passage.excerpt and passage.text.endswith("summary.")


@pytest.mark.parametrize("encoding", ["utf-16", "utf-16-le", "utf-32", "utf-32-le"])
def test_alternate_xml_encoding_cannot_hide_entities(
    monkeypatch: pytest.MonkeyPatch, encoding: str
) -> None:
    xml = '<!DOCTYPE rss [<!ENTITY x "expanded">]>' + rss("<p>synthetic</p>").decode()
    monkeypatch.setattr(sources, "fetch_source", lambda _: xml.encode(encoding))
    with pytest.raises(sources.SourceError, match="source_changed"):
        sources.import_source("nasa_news")


def test_news_marks_a_bounded_excerpt_and_does_not_follow_links() -> None:
    text = "<p>" + "Synthetic public observation. " * 150 + "</p>"
    passage = sources.news(rss(text * 3))[0]
    assert passage.excerpt and 100 <= len(passage.text) <= 8000
    with pytest.raises(sources.SourceError):
        sources.news(rss(text, "http://169.254.169.254/latest/"))
    with pytest.raises(sources.SourceError):
        sources.news(rss(text, "https://www.nasa.gov.evil.invalid/"))


@pytest.mark.parametrize(
    "declaration", [b'<!DOCTYPE rss [<!ENTITY x "boom">]>', b'<!ENTITY x SYSTEM "file:///private">']
)
def test_xml_entity_declarations_are_rejected(declaration: bytes) -> None:
    with pytest.raises(sources.SourceError):
        sources.news(declaration + rss("<p>synthetic</p>"))


@pytest.mark.parametrize(
    "address",
    ["127.0.0.1", "169.254.169.254", "192.168.1.1", "::1", "100.64.0.1", "224.0.0.1", "ff02::1"],
)
def test_source_dns_must_be_public(monkeypatch: pytest.MonkeyPatch, address: str) -> None:
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 0, "", (address, 443))],
    )
    with pytest.raises(sources.SourceError, match="unsafe_source"):
        sources.public_targets(sources.BOOK_URL)


def test_public_dns_targets_are_pinned_and_arbitrary_urls_rejected(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        socket,
        "getaddrinfo",
        lambda *args, **kwargs: [(socket.AF_INET, socket.SOCK_STREAM, 0, "", ("8.8.8.8", 443))],
    )
    assert sources.public_targets(sources.BOOK_URL)[0].host == "8.8.8.8"
    with pytest.raises(sources.SourceError, match="unsupported_source"):
        sources.download("https://www.nasa.gov/not-the-approved-feed")


def test_source_request_is_a_credential_free_get_with_bounded_body() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, content=b"x" * (sources.MAX_SOURCE_BYTES + 1))

    with (
        httpx.Client(transport=httpx.MockTransport(handler)) as client,
        pytest.raises(sources.SourceError, match="source_too_large"),
    ):
        sources.download(sources.BOOK_URL, client)
    assert len(calls) == 1 and calls[0].method == "GET" and not calls[0].content
    assert "authorization" not in calls[0].headers and "cookie" not in calls[0].headers


def test_source_redirect_is_rejected_without_a_second_request() -> None:
    calls: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(302, headers={"Location": "http://169.254.169.254/"})

    with (
        httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=False) as client,
        pytest.raises(sources.SourceError),
    ):
        sources.download(sources.NEWS_URL, client)
    assert len(calls) == 1


def stalled_source(url: str, sender: object) -> None:
    import time

    time.sleep(30)


def test_total_fetch_deadline_reaps_a_stalled_child(monkeypatch: pytest.MonkeyPatch) -> None:
    import multiprocessing
    import time

    before = {child.pid for child in multiprocessing.active_children()}
    monkeypatch.setattr(sources, "_download_child", stalled_source)
    monkeypatch.setattr(sources, "SOURCE_SECONDS", 0.5)
    started = time.monotonic()
    with pytest.raises(sources.SourceError, match="source_timeout"):
        sources.fetch_source(sources.BOOK_URL)
    assert time.monotonic() - started < 3
    assert {child.pid for child in multiprocessing.active_children()} == before


def test_malformed_public_feed_has_a_safe_import_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        sources,
        "fetch_source",
        lambda _: rss("<p>" + "Synthetic observations. " * 10 + "</p>", "https://[invalid/"),
    )
    with pytest.raises(sources.SourceError, match="source_changed"):
        sources.import_source("nasa_news")
