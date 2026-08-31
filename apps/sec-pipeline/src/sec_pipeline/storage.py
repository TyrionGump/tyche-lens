"""Primitives for the on-disk artifact handoff: hashing, artifact references,
atomic writes, and re-validated reads."""

import hashlib
import json
import os
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import TextIO


def sha256_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def display_path(path: Path, base: Path) -> str:
    return os.path.relpath(path.resolve(), base.resolve())


def artifact(path: Path, base: Path) -> dict:
    return {"file": display_path(path, base), "sha256": sha256_file(path), "bytes": path.stat().st_size}


def parse_json_object(content: bytes, source: Path, label: str) -> dict:
    """Parse bytes into a JSON object, rejecting undecodable and non-object content."""
    try:
        value = json.loads(content)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid {label} JSON: {source}") from error
    if not isinstance(value, dict):
        raise TypeError(f"{label} root must be an object: {source}")
    return value


def read_json_object(path: Path, label: str) -> dict:
    """Read one JSON object from disk, reporting a missing file before parsing it."""
    if not path.is_file():
        raise FileNotFoundError(f"Missing {label}: {path}")
    return parse_json_object(path.read_bytes(), path, label)


# A wrong JSON type raises TypeError; a missing or blank value raises ValueError.
# Text is validated stripped but returned verbatim, because these fields are
# compared and re-hashed elsewhere and must not be silently rewritten.
def required_text(value: dict, field: str, source: Path) -> str:
    result = value.get(field)
    if not isinstance(result, str) or not result.strip():
        raise ValueError(f"Missing text {field!r} in {source}")
    return result


def required_object(value: dict, field: str, source: Path) -> dict:
    result = value.get(field)
    if not isinstance(result, dict):
        raise TypeError(f"Expected an object for {field!r} in {source}")
    return result


def required_list(value: dict, field: str, source: Path) -> list:
    result = value.get(field)
    if not isinstance(result, list):
        raise TypeError(f"Expected a list for {field!r} in {source}")
    return result


def write_bytes(path: Path, content: bytes) -> None:
    """Atomically replace a binary artifact after writing it completely."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        temporary.write_bytes(content)
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def text_writer(path: Path) -> Iterator[TextIO]:
    """Yield a text stream whose completed contents atomically replace the target."""
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{uuid.uuid4().hex}.tmp")
    try:
        with temporary.open("w", encoding="utf-8", newline="\n") as output:
            yield output
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def write_json(path: Path, value: object) -> None:
    with text_writer(path) as output:
        json.dump(value, output, indent=2)
        output.write("\n")
