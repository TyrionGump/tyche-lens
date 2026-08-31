import tempfile
import unittest
from email.message import Message
from pathlib import Path
from urllib.error import HTTPError

from sec_pipeline.models import SecAcquisitionSettings
from sec_pipeline.sources.acquisition import SourceAcquirer
from tests.support import CIK, company_config, company_facts_bytes


class _Response:
    def __init__(self, content: bytes) -> None:
        self._content = content
        self.status = 200
        self.headers = {"Content-Type": "application/json"}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback) -> None:
        return None

    def read(self) -> bytes:
        return self._content


class AcquisitionTest(unittest.TestCase):
    def test_live_mode_requires_an_operator_identity_before_requesting(self) -> None:
        settings = SecAcquisitionSettings(mode="live", user_agent="")
        company = company_config(Path("unused-manifest.json"))

        with self.assertRaisesRegex(ValueError, "User-Agent"):
            SourceAcquirer(settings).acquire(company)

    def test_retries_a_rate_limit_response_and_preserves_the_download(self) -> None:
        calls = []
        sleeps = []

        def opener(request, timeout):
            calls.append((request, timeout))
            if len(calls) == 1:
                raise HTTPError(request.full_url, 429, "Too Many Requests", hdrs=Message(), fp=None)
            return _Response(company_facts_bytes())

        with tempfile.TemporaryDirectory() as temporary:
            manifest = Path(temporary) / "sources" / "synthetic" / "manifest.json"
            settings = SecAcquisitionSettings(
                mode="live",
                user_agent="Tyche Lens contact@example.com",
                minimum_request_interval_seconds=0,
                max_attempts=2,
            )
            result = SourceAcquirer(settings, opener=opener, sleeper=sleeps.append, clock=lambda: 0).acquire(
                company_config(manifest)
            )
            self.assertEqual(manifest, result.source_manifest_file)
            self.assertTrue(result.source_manifest_file.is_file())

        self.assertEqual("downloaded", result.status)
        self.assertEqual(2, len(calls))
        self.assertEqual([1], sleeps)
        self.assertEqual("Tyche Lens contact@example.com", calls[0][0].get_header("User-agent"))
        self.assertIn(CIK, calls[0][0].full_url)


if __name__ == "__main__":
    unittest.main()
