import tempfile
import unittest
from pathlib import Path

from sec_pipeline.locks import exclusive_pipeline_lock


class PipelineLockTest(unittest.TestCase):
    def test_rejects_an_overlapping_writer_for_one_data_directory(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            data_directory = Path(temporary) / "data"

            with (
                exclusive_pipeline_lock(data_directory),
                self.assertRaisesRegex(RuntimeError, "Another SEC pipeline process"),
                exclusive_pipeline_lock(data_directory),
            ):
                self.fail("The second writer unexpectedly acquired the lock")

            with exclusive_pipeline_lock(data_directory):
                pass


if __name__ == "__main__":
    unittest.main()
