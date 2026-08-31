"""Validate cross-stage settings before any pipeline stage performs I/O."""

from datetime import date

from .models import PipelineSettings


def validate_settings(settings: PipelineSettings) -> None:
    """Validate a complete configuration, including directly constructed test settings."""
    date.fromisoformat(settings.as_of)
    if not settings.companies:
        raise ValueError("At least one company must be configured")

    selection = settings.selection
    if selection.period_count < 1:
        raise ValueError("period_count must be positive")

    acquisition = settings.acquisition
    if acquisition.mode not in {"replay", "live"}:
        raise ValueError("acquisition mode must be 'replay' or 'live'")
    if acquisition.mode == "live" and not acquisition.user_agent.strip():
        raise ValueError("Live SEC acquisition requires a configured contact-style User-Agent")
    if acquisition.request_timeout_seconds <= 0:
        raise ValueError("request timeout must be positive")
    if acquisition.minimum_request_interval_seconds < 0:
        raise ValueError("request interval cannot be negative")
    if acquisition.max_attempts < 1:
        raise ValueError("max_attempts must be positive")
    minimum, maximum = selection.annual_duration_days
    if minimum < 1 or minimum > maximum:
        raise ValueError("annual_duration_days must be a positive ordered range")

    slugs = [company.slug for company in settings.companies]
    if len(slugs) != len(set(slugs)):
        raise ValueError("Company slugs must be unique")

    for company in settings.companies:
        if len(company.cik) != 10 or not company.cik.isdigit():
            raise ValueError(f"{company.slug}: CIK must contain ten digits")
        names = [definition.name for definition in company.evidence]
        if len(names) != len(set(names)):
            raise ValueError(f"{company.slug}: evidence names must be unique")
        if company.period_anchor not in names:
            raise ValueError(f"{company.slug}: period anchor must name an evidence definition")
