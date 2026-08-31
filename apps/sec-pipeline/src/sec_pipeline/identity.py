"""Create stable configuration identities and unique operational run IDs."""

import json
import uuid
from dataclasses import asdict
from datetime import datetime

from .models import CompanyConfig, SelectionPolicy
from .storage import sha256_bytes

CONFIGURATION_SCHEMA_VERSION = 3


def configuration_sha256(company: CompanyConfig, policy: SelectionPolicy) -> str:
    """Hash every reviewed input that can change selected company evidence."""
    value = {
        "schema_version": CONFIGURATION_SCHEMA_VERSION,
        "company": {
            "slug": company.slug,
            "cik": company.cik,
            "period_anchor": company.period_anchor,
            "evidence": [asdict(definition) for definition in company.evidence],
        },
        "selection_policy": {
            "annual_forms": policy.annual_forms,
            "fiscal_period": policy.fiscal_period,
            "annual_duration_days": policy.annual_duration_days,
            "period_count": policy.period_count,
        },
    }
    content = json.dumps(value, sort_keys=True, separators=(",", ":")).encode()
    return sha256_bytes(content)


def pipeline_run_id(started_at: str) -> str:
    """Create a readable unique ID for an operational pipeline invocation."""
    timestamp = datetime.fromisoformat(started_at).strftime("%Y%m%dT%H%M%S.%fZ")
    return f"{timestamp}-{uuid.uuid4().hex[:8]}"
