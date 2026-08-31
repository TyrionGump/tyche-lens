"""Assemble the explicitly supported company profiles in processing order."""

from pathlib import Path

from ..models import CompanyConfig
from .aapl import build_aapl_profile
from .jpmorgan import build_jpmorgan_profile
from .walmart import build_walmart_profile


def build_company_profiles(source_data_directory: Path) -> tuple[CompanyConfig, ...]:
    """Build the reviewed company profiles for one source-store location."""
    return (
        build_aapl_profile(source_data_directory / "aapl" / "manifest.json"),
        build_walmart_profile(source_data_directory / "walmart" / "manifest.json"),
        build_jpmorgan_profile(source_data_directory / "jpmorgan" / "manifest.json"),
    )
