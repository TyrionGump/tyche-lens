"""Load operational settings while keeping evidence profiles explicit."""

import os
from collections.abc import Mapping
from datetime import UTC, datetime
from pathlib import Path

from .models import PipelineSettings, SecAcquisitionSettings
from .profiles.registry import build_company_profiles

SOURCE_MODE_VARIABLE = "TYCHE_SEC_SOURCE_MODE"
DATA_DIRECTORY_VARIABLE = "TYCHE_SEC_DATA_DIRECTORY"
AS_OF_VARIABLE = "TYCHE_SEC_AS_OF"
SEC_USER_AGENT = "tyriongump@gmail.com"


def load_settings(environ: Mapping[str, str] | None = None, working_directory: Path | None = None) -> PipelineSettings:
    """Build one run configuration from process environment values."""
    values = os.environ if environ is None else environ
    base_directory = (Path.cwd() if working_directory is None else working_directory).resolve()
    data_directory = _data_directory(values, base_directory)
    configured_source_mode = values.get(SOURCE_MODE_VARIABLE, "replay").strip()
    if configured_source_mode not in {"replay", "live"}:
        raise ValueError(f"{SOURCE_MODE_VARIABLE} must be 'replay' or 'live', not {configured_source_mode!r}")

    return PipelineSettings(
        data_directory=data_directory,
        as_of=values.get(AS_OF_VARIABLE, datetime.now(UTC).astimezone().date().isoformat()).strip(),
        companies=build_company_profiles(data_directory / "sources"),
        acquisition=SecAcquisitionSettings(mode=configured_source_mode, user_agent=SEC_USER_AGENT),
    )


def _data_directory(environ: Mapping[str, str], working_directory: Path) -> Path:
    configured = environ.get(DATA_DIRECTORY_VARIABLE, "").strip()
    if not configured:
        return working_directory / "data"
    candidate = Path(configured).expanduser()
    if not candidate.is_absolute():
        candidate = working_directory / candidate
    return candidate.resolve()
