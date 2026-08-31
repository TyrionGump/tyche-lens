"""Select reviewed evidence from normalized observations under an explicit policy."""

import json
from collections import defaultdict
from dataclasses import dataclass
from datetime import date

from ..models import (
    CompanyConfig,
    EvidenceDefinition,
    NormalizationResult,
    SelectionPolicy,
    SelectionResult,
    SourceSnapshot,
)
from ..storage import artifact, read_json_object, required_list, required_object, write_json

SCHEMA_VERSION = 1


@dataclass(frozen=True)
class SelectedEvidenceDocument:
    """Validated selected-evidence fields exposed to the publishing stage."""

    company: dict
    as_of: str
    selection_policy: dict
    periods: list
    evidence: list
    issues: list


def select_evidence(
    company: CompanyConfig,
    policy: SelectionPolicy,
    as_of: str,
    snapshot: SourceSnapshot,
    normalized: NormalizationResult,
) -> SelectionResult:
    """Select comparable annual evidence while retaining missingness and revisions."""
    definitions_by_source = _definitions_by_source(company.evidence)
    grouped = {definition.name: defaultdict(list) for definition in company.evidence}

    loaded_observation_count = 0
    with normalized.observations_file.open(encoding="utf-8") as observations:
        for line_number, line in enumerate(observations, start=1):
            loaded_observation_count += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid normalized observation on line {line_number}") from error

            source_key = (row["taxonomy"], row["tag"], row["unit"])
            for definition in definitions_by_source.get(source_key, ()):
                period_key = _eligible_period_key(row, definition, policy, as_of)
                if period_key is not None:
                    grouped[definition.name][period_key].append(row)

    if loaded_observation_count != normalized.observation_count:
        raise ValueError(
            "Normalized observation count changed between stages: "
            f"expected {normalized.observation_count}, "
            f"loaded {loaded_observation_count}"
        )

    # Establish periods once from the anchor so every evidence item uses the same windows.
    anchor = _definition(company, company.period_anchor)
    if anchor.period_type != "duration":
        raise ValueError("The current annual period anchor must be a duration fact")
    periods = sorted(grouped[anchor.name], key=lambda candidate_period: (candidate_period[1], candidate_period[0]))[
        -policy.period_count :
    ]
    if len(periods) < policy.period_count:
        raise ValueError(f"{company.slug}: found only {len(periods)} eligible annual periods")

    evidence = []
    issues = []
    reported_observation_count = 0
    for definition in company.evidence:
        observations = []
        missing_periods = []
        revised_periods = []

        for annual_period in periods:
            period_key = annual_period if definition.period_type == "duration" else annual_period[1]
            candidates = grouped[definition.name].get(period_key, [])
            if candidates:
                observation = _select_observation(candidates, snapshot.cik, annual_period)
                reported_observation_count += 1
                if observation["selection"]["different_reported_values"]:
                    revised_periods.append(annual_period[1])
            else:
                observation = {
                    "status": "missing",
                    "period": {"start": annual_period[0], "end": annual_period[1]},
                    "candidate_count": 0,
                }
                missing_periods.append(annual_period[1])
            observations.append(observation)

        if missing_periods:
            issues.append(
                _issue(
                    code="missing_evidence",
                    definition=definition,
                    periods=missing_periods,
                    message=f"No eligible {definition.tag} observation exists for {', '.join(missing_periods)}.",
                )
            )
        if revised_periods:
            issues.append(
                _issue(
                    code="different_reported_values",
                    definition=definition,
                    periods=revised_periods,
                    message=(
                        f"Eligible filings contain different values for "
                        f"{', '.join(revised_periods)}; the latest was selected."
                    ),
                )
            )

        evidence.append(
            {
                "name": definition.name,
                "label": definition.label,
                "category": definition.category,
                "evidence_type": "structured_reported_fact",
                "taxonomy": definition.taxonomy,
                "tag": definition.tag,
                "unit": definition.unit,
                "period_type": definition.period_type,
                "selection_reason": definition.reason,
                "observations": observations,
            }
        )

    output = {
        "schema_version": SCHEMA_VERSION,
        "configuration_sha256": snapshot.configuration_sha256,
        "as_of": as_of,
        "company": {"slug": company.slug, "entity": snapshot.entity, "cik": snapshot.cik},
        "selection_policy": {
            "forms": list(policy.annual_forms),
            "fiscal_period": policy.fiscal_period,
            "annual_duration_days": list(policy.annual_duration_days),
            "period_count": policy.period_count,
            "period_anchor": company.period_anchor,
            "duplicate_rule": "latest filed date, then accession number",
        },
        "periods": [{"start": start, "end": end} for start, end in periods],
        "source": {
            "raw": artifact(snapshot.raw_file, snapshot.run_directory),
            "raw_manifest": artifact(snapshot.manifest_file, snapshot.run_directory),
            "concept_catalog": artifact(normalized.catalog_file, snapshot.run_directory),
            "observations": artifact(normalized.observations_file, snapshot.run_directory),
        },
        "evidence": evidence,
        "issues": issues,
    }

    output_directory = snapshot.run_directory / "selected"
    evidence_file = output_directory / "evidence.json"
    write_json(evidence_file, output)
    return SelectionResult(
        evidence_file=evidence_file,
        evidence_count=len(evidence),
        reported_observation_count=reported_observation_count,
        issue_count=len(issues),
    )


def load_selected_evidence(
    selected: SelectionResult, company: CompanyConfig, as_of: str, snapshot: SourceSnapshot
) -> SelectedEvidenceDocument:
    """Load and validate the selected-evidence artifact owned by this stage."""
    document = read_json_object(selected.evidence_file, "selected evidence")
    if document.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"Unsupported selected-evidence schema: {selected.evidence_file}")

    expected_company = {"slug": company.slug, "entity": snapshot.entity, "cik": company.cik}
    if document.get("company") != expected_company:
        raise ValueError("Selected evidence company identity changed")
    if document.get("as_of") != as_of:
        raise ValueError("Selected evidence as_of changed")
    if document.get("configuration_sha256") != snapshot.configuration_sha256:
        raise ValueError("Selected evidence configuration changed")

    selection_policy = required_object(document, "selection_policy", selected.evidence_file)
    periods = required_list(document, "periods", selected.evidence_file)
    evidence = required_list(document, "evidence", selected.evidence_file)
    issues = required_list(document, "issues", selected.evidence_file)
    return SelectedEvidenceDocument(
        company=expected_company,
        as_of=as_of,
        selection_policy=selection_policy,
        periods=periods,
        evidence=evidence,
        issues=issues,
    )


def _definitions_by_source(
    definitions: tuple[EvidenceDefinition, ...],
) -> dict[tuple[str, str, str], list[EvidenceDefinition]]:
    result = defaultdict(list)
    for definition in definitions:
        result[(definition.taxonomy, definition.tag, definition.unit)].append(definition)
    return result


def _definition(company: CompanyConfig, name: str) -> EvidenceDefinition:
    for definition in company.evidence:
        if definition.name == name:
            return definition
    raise ValueError(f"{company.slug}: unknown period anchor {name!r}")


def _eligible_period_key(
    row: dict, definition: EvidenceDefinition, policy: SelectionPolicy, as_of: str
) -> tuple[str, str] | str | None:
    filed = row.get("filed")
    end_value = row.get("end")
    if (
        row.get("form") not in policy.annual_forms
        or row.get("fp") != policy.fiscal_period
        or not isinstance(filed, str)
        or not filed
        or filed > as_of
        or not isinstance(end_value, str)
    ):
        return None

    try:
        date.fromisoformat(filed)
        end = date.fromisoformat(end_value)
    except ValueError as error:
        raise ValueError(f"Invalid SEC observation date: {row}") from error

    if definition.period_type == "instant":
        return end.isoformat()
    start_value = row.get("start")
    if not isinstance(start_value, str):
        return None

    try:
        start = date.fromisoformat(start_value)
    except ValueError as error:
        raise ValueError(f"Invalid SEC observation start date: {row}") from error
    duration_days = (end - start).days + 1
    minimum, maximum = policy.annual_duration_days
    if not minimum <= duration_days <= maximum:
        return None
    return start.isoformat(), end.isoformat()


def _select_observation(candidates: list[dict], cik: str, period: tuple[str, str]) -> dict:
    # Later filings supersede earlier values, but the output still flags that values differed.
    selected = max(candidates, key=lambda row: (row["filed"], row["accn"]))
    fact = {key: value for key, value in selected.items() if key not in {"cik", "entity", "taxonomy", "tag", "unit"}}
    fact["filing_url"] = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{selected['accn'].replace('-', '')}/"
    values = {json.dumps(row["val"], sort_keys=True) for row in candidates}
    return {
        "status": "reported",
        "period": {"start": period[0], "end": period[1]},
        "fact": fact,
        "selection": {"eligible_observation_count": len(candidates), "different_reported_values": len(values) > 1},
    }


def _issue(code: str, definition: EvidenceDefinition, periods: list[str], message: str) -> dict:
    return {
        "code": code,
        "severity": "warning",
        "evidence_name": definition.name,
        "period_ends": periods,
        "message": message,
    }


