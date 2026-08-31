import tempfile
import unittest
from pathlib import Path

from sec_pipeline.settings import load_settings


class SettingsTest(unittest.TestCase):
    def test_loads_operational_values_relative_to_the_application_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            working_directory = Path(temporary).resolve()

            settings = load_settings(
                {
                    "TYCHE_SEC_SOURCE_MODE": "live",
                    "TYCHE_SEC_DATA_DIRECTORY": "runtime",
                    "TYCHE_SEC_AS_OF": "2025-06-30",
                    "SEC_USER_AGENT": "ignored@example.com",
                },
                working_directory=working_directory,
            )

        self.assertEqual(working_directory / "runtime", settings.data_directory)
        self.assertEqual("2025-06-30", settings.as_of)
        self.assertEqual("live", settings.acquisition.mode)
        self.assertEqual("tyriongump@gmail.com", settings.acquisition.user_agent)
        self.assertEqual(
            working_directory / "runtime" / "sources" / "aapl" / "manifest.json", settings.companies[0].source.manifest
        )

    def test_rejects_an_unknown_source_mode(self) -> None:
        with self.assertRaisesRegex(ValueError, "must be 'replay' or 'live'"):
            load_settings({"TYCHE_SEC_SOURCE_MODE": "sometimes"})


if __name__ == "__main__":
    unittest.main()
