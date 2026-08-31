"""Prevent overlapping writers from using one pipeline data directory."""

import fcntl
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import TextIO


@contextmanager
def exclusive_pipeline_lock(data_directory: Path) -> Iterator[None]:
    """Fail immediately when another process owns this data directory."""
    data_directory.mkdir(parents=True, exist_ok=True)
    lock_file = data_directory / ".pipeline.lock"
    with lock_file.open("a+", encoding="utf-8") as handle:
        _acquire(handle, lock_file)
        try:
            yield
        finally:
            fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def _acquire(handle: TextIO, lock_file: Path) -> None:
    try:
        fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        raise RuntimeError(f"Another SEC pipeline process is already writing to {lock_file.parent}") from error
