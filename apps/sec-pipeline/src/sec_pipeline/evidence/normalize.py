"""Flatten preserved Company Facts into observations and a concept catalog."""

import json

from ..models import NormalizationResult, SourceSnapshot
from ..storage import artifact, required_object, sha256_file, text_writer, write_json

SCHEMA_VERSION = 1


def normalize_company_facts(snapshot: SourceSnapshot) -> NormalizationResult:
    """Write a streaming observation table and summary catalog for selection."""
    if sha256_file(snapshot.raw_file) != snapshot.raw_sha256:
        raise ValueError("Company Facts source hash changed before normalization")
    company_facts = json.loads(snapshot.raw_file.read_bytes())
    if not isinstance(company_facts, dict):
        raise TypeError("Company Facts root must be an object")
    cik = str(company_facts["cik"]).zfill(10)
    if cik != snapshot.cik or company_facts["entityName"] != snapshot.entity:
        raise ValueError("Company Facts identity changed after source preservation")
    facts = required_object(company_facts, "facts", snapshot.raw_file)

    output_directory = snapshot.run_directory / "normalized"
    observations_file = output_directory / "observations.jsonl"
    catalog_file = output_directory / "concepts.json"
    catalog = []
    observation_count = 0

    with text_writer(observations_file) as output:
        for taxonomy, concepts in sorted(facts.items()):
            if not isinstance(concepts, dict):
                raise TypeError(f"Taxonomy {taxonomy!r} must contain an object")
            for tag, concept in sorted(concepts.items()):
                units = _validated_units(taxonomy, tag, concept)
                catalog.append(_concept_summary(taxonomy, tag, concept, units))
                for unit, observations in sorted(units.items()):
                    for observation in observations:
                        row = {
                            "cik": cik,
                            "entity": snapshot.entity,
                            "taxonomy": taxonomy,
                            "tag": tag,
                            "unit": unit,
                            **observation,
                        }
                        output.write(json.dumps(row, separators=(",", ":")))
                        output.write("\n")
                        observation_count += 1

    catalog_document = {
        "schema_version": SCHEMA_VERSION,
        "company": {"entity": snapshot.entity, "cik": snapshot.cik},
        "source": {
            "company_facts": artifact(snapshot.raw_file, snapshot.run_directory),
            "manifest": artifact(snapshot.manifest_file, snapshot.run_directory),
        },
        "counts": {"concepts": len(catalog), "observations": observation_count},
        "concepts": catalog,
    }
    write_json(catalog_file, catalog_document)

    return NormalizationResult(
        observations_file=observations_file,
        catalog_file=catalog_file,
        observation_count=observation_count,
        concept_count=len(catalog),
    )


def _validated_units(taxonomy: str, tag: str, concept: object) -> dict[str, list[dict]]:
    if not isinstance(concept, dict):
        raise TypeError(f"Concept {taxonomy}:{tag} must be an object")
    units = concept.get("units")
    if not isinstance(units, dict):
        raise TypeError(f"Concept {taxonomy}:{tag} has no units object")
    for unit, observations in units.items():
        if not isinstance(unit, str) or not isinstance(observations, list):
            raise TypeError(f"Concept {taxonomy}:{tag} has invalid unit observations")
        if not all(isinstance(observation, dict) for observation in observations):
            raise TypeError(f"Concept {taxonomy}:{tag} unit {unit!r} contains a non-object observation")
    return units


def _concept_summary(taxonomy: str, tag: str, concept: dict, units: dict[str, list[dict]]) -> dict:
    unit_summaries = []
    total_observations = 0
    for unit, observations in sorted(units.items()):
        end_dates = [item["end"] for item in observations if "end" in item]
        total_observations += len(observations)
        unit_summaries.append(
            {
                "unit": unit,
                "observation_count": len(observations),
                "first_end": min(end_dates) if end_dates else None,
                "last_end": max(end_dates) if end_dates else None,
                "forms": sorted({item["form"] for item in observations if "form" in item}),
            }
        )

    return {
        "taxonomy": taxonomy,
        "tag": tag,
        "label": concept.get("label"),
        "description": concept.get("description"),
        "observation_count": total_observations,
        "units": unit_summaries,
    }
