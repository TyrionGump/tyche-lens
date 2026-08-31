"""Command-line entry point for the SEC evidence pipeline."""

import logging

from .runner import run_pipeline
from .settings import load_settings

logger = logging.getLogger(__name__)


def main() -> int:
    """Load settings and run the pipeline with process-level error logging."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    # The CLI boundary must turn any unreported pipeline failure into an exit code.
    # noinspection PyBroadException
    try:
        return run_pipeline(load_settings())
    except Exception:
        logger.exception("SEC pipeline failed before a run report was written")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
