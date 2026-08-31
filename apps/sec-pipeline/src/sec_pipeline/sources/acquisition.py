"""Acquire SEC Company Facts from replay storage or the live SEC endpoint."""

import gzip
from datetime import UTC, datetime
from time import monotonic, sleep
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from ..models import AcquisitionResult, CollectedCompanyFacts, CompanyConfig, SecAcquisitionSettings
from .store import load_company_facts, store_collected_company_facts

COMPANY_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
RETRYABLE_HTTP_STATUS = {429, 500, 502, 503, 504}
PRESERVED_RESPONSE_HEADERS = {"content-encoding", "content-type", "etag", "last-modified"}


class SourceAcquirer:
    """Make the source store current and report how its input was acquired."""

    def __init__(self, settings: SecAcquisitionSettings, opener=None, sleeper=sleep, clock=monotonic) -> None:
        self.settings = settings
        self._opener = opener or urlopen
        self._sleeper = sleeper
        self._clock = clock
        self._last_request_started: float | None = None

    def acquire(self, company: CompanyConfig) -> AcquisitionResult:
        """Replay a validated source or download and store its latest response."""
        if self.settings.mode == "replay":
            return self._replay(company)

        collected = self._download(company.cik)
        stored = store_collected_company_facts(
            collected=collected, destination=company.source.manifest.parent, expected_cik=company.cik
        )
        source = load_company_facts(stored.manifest_file, company.cik)
        document = source.document
        return AcquisitionResult(
            mode="live",
            status="downloaded" if stored.changed else "unchanged",
            source_manifest_file=stored.manifest_file,
            source_sha256=document.sha256,
            source_url=document.url,
            source_fetched_at=document.fetched_at,
            request_finished_at=collected.fetched_at,
        )

    def _replay(self, company: CompanyConfig) -> AcquisitionResult:
        source = load_company_facts(company.source.manifest, company.cik)
        document = source.document
        return AcquisitionResult(
            mode="replay",
            status="replayed",
            source_manifest_file=source.manifest_file,
            source_sha256=document.sha256,
            source_url=document.url,
            source_fetched_at=document.fetched_at,
            request_finished_at=None,
        )

    def _download(self, cik: str) -> CollectedCompanyFacts:
        if not self.settings.user_agent.strip():
            raise ValueError("Live SEC acquisition requires a configured contact-style User-Agent")

        url = COMPANY_FACTS_URL.format(cik=cik)
        request = Request(
            url,
            headers={"Accept": "application/json", "Accept-Encoding": "gzip", "User-Agent": self.settings.user_agent},
        )

        for attempt in range(1, self.settings.max_attempts + 1):
            self._wait_for_request_slot()
            try:
                return self._read_response(request, url)
            except HTTPError as error:
                error.close()
                if error.code not in RETRYABLE_HTTP_STATUS or attempt == self.settings.max_attempts:
                    raise RuntimeError(f"SEC request failed with HTTP {error.code}: {url}") from error
            except (TimeoutError, URLError) as error:
                if attempt == self.settings.max_attempts:
                    raise RuntimeError(f"SEC request failed: {url}") from error

            # Backoff is additional to this pipeline's minimum request interval.
            self._sleeper(2 ** (attempt - 1))

        raise RuntimeError(f"SEC request failed: {url}")

    def _read_response(self, request: Request, url: str) -> CollectedCompanyFacts:
        content: bytes | None = None
        status_code: int | None = None
        with self._opener(request, timeout=self.settings.request_timeout_seconds) as response:
            content = response.read()
            status_code = getattr(response, "status", None)
            if status_code is None:
                status_code = response.getcode()
            headers = {
                key.lower(): value
                for key, value in response.headers.items()
                if key.lower() in PRESERVED_RESPONSE_HEADERS
            }

        if not isinstance(content, bytes):
            raise TypeError(f"SEC response did not provide byte content: {url}")
        if isinstance(status_code, bool) or not isinstance(status_code, int):
            raise TypeError(f"SEC response did not provide an integer status code: {url}")

        response_content = content
        content_encoding = headers.get("content-encoding", "identity").lower()
        transformation = None
        if content_encoding == "gzip":
            response_content = gzip.decompress(response_content)
            transformation = "Decompressed the HTTP gzip content encoding."
        elif content_encoding not in {"", "identity"}:
            raise ValueError(f"Unsupported SEC content encoding: {content_encoding}")

        return CollectedCompanyFacts(
            content=response_content,
            url=url,
            fetched_at=datetime.now(UTC).isoformat(),
            status_code=status_code,
            response_headers=headers,
            content_encoding=content_encoding or "identity",
            transformation=transformation,
        )

    def _wait_for_request_slot(self) -> None:
        now = self._clock()
        if self._last_request_started is not None:
            elapsed = now - self._last_request_started
            remaining = self.settings.minimum_request_interval_seconds - elapsed
            if remaining > 0:
                self._sleeper(remaining)
        self._last_request_started = self._clock()
