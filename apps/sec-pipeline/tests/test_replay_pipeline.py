import json
import tempfile
import unittest
from dataclasses import replace
from pathlib import Path

from sec_pipeline.models import ArchivedCompanyFactsSource
from sec_pipeline.runner import run_pipeline
from tests.support import install_synthetic_source, pipeline_settings


class ReplayPipelineTest(unittest.TestCase):
    def test_complete_replay_is_traceable_and_logically_repeatable(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            data_directory, source_manifest = install_synthetic_source(Path(temporary))
            settings = pipeline_settings(data_directory, source_manifest)

            self.assertEqual(0, run_pipeline(settings))
            first_pointer = _read_json(data_directory / "deliveries" / "latest.json")
            manifest_file = data_directory / "deliveries" / first_pointer["manifest"]["file"]
            first_manifest_bytes = manifest_file.read_bytes()
            publication = _read_bundle_publication(manifest_file)

            self.assertEqual(0, run_pipeline(settings))
            second_pointer = _read_json(data_directory / "deliveries" / "latest.json")
            second_manifest_bytes = manifest_file.read_bytes()

            run_files = list((data_directory / "pipeline-runs").glob("*.json"))

        self.assertEqual(first_pointer["delivery_id"], second_pointer["delivery_id"])
        self.assertEqual(first_manifest_bytes, second_manifest_bytes)
        self.assertEqual(2, len(run_files))

        evidence = {item["name"]: item for item in publication["evidence"]}
        revenue = evidence["revenue"]["observations"]
        self.assertEqual(
            ["2021-12-31", "2022-12-31", "2023-12-31"], [observation["period"]["end"] for observation in revenue]
        )
        self.assertEqual([100, 125, 150], [item["fact"]["val"] for item in revenue])
        self.assertTrue(revenue[1]["selection"]["different_reported_values"])

        net_income = evidence["net_income"]["observations"]
        self.assertEqual("missing", net_income[1]["status"])
        self.assertEqual(
            {"different_reported_values", "missing_evidence"}, {issue["code"] for issue in publication["issues"]}
        )

    def test_failed_run_keeps_the_last_complete_delivery_pointer(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            data_directory, source_manifest = install_synthetic_source(Path(temporary))
            settings = pipeline_settings(data_directory, source_manifest)
            self.assertEqual(0, run_pipeline(settings))
            pointer_file = data_directory / "deliveries" / "latest.json"
            successful_pointer = pointer_file.read_bytes()

            missing_source = replace(
                settings.companies[0],
                source=ArchivedCompanyFactsSource(manifest=data_directory / "sources" / "missing.json"),
            )
            failed_settings = replace(settings, companies=(missing_source,))
            with self.assertLogs("sec_pipeline.runner", level="ERROR"):
                exit_code = run_pipeline(failed_settings)
            failed_report = _read_json(data_directory / "latest-run.json")
            pointer_after_failure = pointer_file.read_bytes()

        self.assertEqual(1, exit_code)
        self.assertEqual(successful_pointer, pointer_after_failure)
        self.assertEqual("failed", failed_report["status"])
        self.assertEqual("skipped", failed_report["delivery"]["status"])


def _read_bundle_publication(manifest_file: Path) -> dict:
    manifest = _read_json(manifest_file)
    publication_file = manifest_file.parent / manifest["publications"][0]["artifact"]["file"]
    return _read_json(publication_file)


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
