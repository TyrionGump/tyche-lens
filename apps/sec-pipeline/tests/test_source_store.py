import tempfile
import unittest
from pathlib import Path

from sec_pipeline.sources.store import load_company_facts
from tests.support import CIK, ENTITY, install_synthetic_source


class SourceStoreTest(unittest.TestCase):
    def test_loads_a_validated_source_with_declared_representation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, manifest = install_synthetic_source(Path(temporary))

            source = load_company_facts(manifest, CIK)

        self.assertEqual(ENTITY, source.company_facts["entityName"])
        self.assertEqual("transformed_snapshot", source.document.representation["kind"])

    def test_rejects_source_bytes_changed_after_import(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, manifest = install_synthetic_source(Path(temporary))
            source_file = manifest.parent / "companyfacts.json"
            source_file.write_bytes(source_file.read_bytes() + b" ")

            with self.assertRaisesRegex(ValueError, "Hash mismatch for document"):
                load_company_facts(manifest, CIK)


if __name__ == "__main__":
    unittest.main()
