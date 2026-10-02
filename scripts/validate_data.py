#!/usr/bin/env python3
"""Validate data/conferences.json using only the Python standard library."""

from __future__ import annotations

import json
import re
import sys
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "data" / "conferences.json"

ALLOWED_AREAS = {
    "general", "computational", "systems", "cognitive", "neuroimaging",
    "eeg_meg", "bci", "neurotech", "neuroai",
}
ALLOWED_VENUE_TYPES = {"conference", "workshop", "summer_school"}
ALLOWED_DEADLINE_TYPES = {
    "abstract", "poster", "paper", "workshop", "travel_grant", "late_breaking",
}
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def parse_date(value: str, context: str) -> date:
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        fail(f"{context}: expected ISO date YYYY-MM-DD, got {value!r}")


def validate_url(value: str, context: str) -> None:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        fail(f"{context}: invalid HTTP(S) URL {value!r}")


def require(obj: dict, key: str, context: str):
    if key not in obj:
        fail(f"{context}: missing required field {key!r}")
    return obj[key]


def main() -> None:
    try:
        payload = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"cannot read {DATA_FILE}: {exc}")

    if payload.get("schema_version") != 1:
        fail("schema_version must be 1")
    parse_date(require(payload, "updated_on", "root"), "root.updated_on")

    conferences = require(payload, "conferences", "root")
    if not isinstance(conferences, list):
        fail("root.conferences must be a list")

    seen_ids: set[str] = set()
    for index, conf in enumerate(conferences):
        ctx = f"conferences[{index}]"
        conf_id = require(conf, "id", ctx)
        if not isinstance(conf_id, str) or not ID_RE.fullmatch(conf_id):
            fail(f"{ctx}.id: use lowercase kebab-case")
        if conf_id in seen_ids:
            fail(f"{ctx}.id: duplicate id {conf_id!r}")
        seen_ids.add(conf_id)

        for key in ("name", "full_name"):
            value = require(conf, key, ctx)
            if not isinstance(value, str) or not value.strip():
                fail(f"{ctx}.{key}: must be a non-empty string")

        year = require(conf, "year", ctx)
        if not isinstance(year, int) or not 2000 <= year <= 2100:
            fail(f"{ctx}.year: invalid year")

        validate_url(require(conf, "website", ctx), f"{ctx}.website")

        venue_type = require(conf, "venue_type", ctx)
        if venue_type not in ALLOWED_VENUE_TYPES:
            fail(f"{ctx}.venue_type: unsupported value {venue_type!r}")

        areas = require(conf, "areas", ctx)
        if not isinstance(areas, list) or not areas:
            fail(f"{ctx}.areas: must be a non-empty list")
        unknown_areas = set(areas) - ALLOWED_AREAS
        if unknown_areas:
            fail(f"{ctx}.areas: unsupported values {sorted(unknown_areas)}")

        event = require(conf, "event", ctx)
        start = parse_date(require(event, "start", f"{ctx}.event"), f"{ctx}.event.start")
        end = parse_date(require(event, "end", f"{ctx}.event"), f"{ctx}.event.end")
        if end < start:
            fail(f"{ctx}.event: end precedes start")
        if start.year != year:
            fail(f"{ctx}.event.start year does not match conference year")
        if not isinstance(require(event, "location", f"{ctx}.event"), str):
            fail(f"{ctx}.event.location must be a string")

        deadlines = require(conf, "deadlines", ctx)
        if not isinstance(deadlines, list):
            fail(f"{ctx}.deadlines must be a list")

        if not deadlines:
            if not conf.get("tba_note"):
                fail(f"{ctx}: deadline-free entry must include tba_note")
            parse_date(require(conf, "verified_on", ctx), f"{ctx}.verified_on")

        for d_index, deadline in enumerate(deadlines):
            dctx = f"{ctx}.deadlines[{d_index}]"
            dtype = require(deadline, "type", dctx)
            if dtype not in ALLOWED_DEADLINE_TYPES:
                fail(f"{dctx}.type: unsupported value {dtype!r}")
            if not isinstance(require(deadline, "label", dctx), str):
                fail(f"{dctx}.label must be a string")
            deadline_date = parse_date(require(deadline, "date", dctx), f"{dctx}.date")
            if "opens_on" in deadline:
                opens = parse_date(deadline["opens_on"], f"{dctx}.opens_on")
                if opens > deadline_date:
                    fail(f"{dctx}: opens_on is after deadline date")
            if "datetime" in deadline:
                try:
                    parsed_dt = datetime.fromisoformat(deadline["datetime"])
                except (TypeError, ValueError):
                    fail(f"{dctx}.datetime: expected ISO 8601 datetime with UTC offset")
                if parsed_dt.tzinfo is None:
                    fail(f"{dctx}.datetime: UTC offset is required")
                if parsed_dt.date() != deadline_date:
                    fail(f"{dctx}.datetime date must match {dctx}.date")
            validate_url(require(deadline, "source_url", dctx), f"{dctx}.source_url")
            parse_date(require(deadline, "verified_on", dctx), f"{dctx}.verified_on")

    print(f"OK: {len(conferences)} conferences validated from {DATA_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
