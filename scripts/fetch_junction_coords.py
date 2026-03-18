#!/usr/bin/env python3
"""Fetch coordinates for railway junctions and infrastructure missing from station_coords.json.

Queries OpenStreetMap via Overpass for all named railway nodes in Great Britain,
then matches them to stanox CSV entries that currently lack coordinates.

Usage:
    python scripts/fetch_junction_coords.py [--dry-run]
"""
import argparse
import csv
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

SHARED_PATH = Path(__file__).parent.parent / "shared"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
GB_BBOX = "49.5,-8.5,61.0,2.5"  # Great Britain bounding box

# UK railway abbreviation expansions (uppercase → uppercase)
ABBREVS = [
    (r"\bJN\b", "JUNCTION"),
    (r"\bJCT\b", "JUNCTION"),
    (r"\bSDG\b", "SIDING"),
    (r"\bSDGS\b", "SIDINGS"),
    (r"\bTMNL\b", "TERMINAL"),
    (r"\bTMN\b", "TERMINAL"),
    (r"\bGDS\b", "GOODS"),
    (r"\bC\.S\.\b", "CARRIAGE SIDINGS"),
    (r"\bCS\b", "CARRIAGE SIDINGS"),
    (r"\bT\.?R\.?S\.?M\.?D\.?\b", "TRACTION MAINTENANCE DEPOT"),
    (r"\bE\.?M\.?U\.?\b", "EMU"),
    (r"\bD\.?M\.?U\.?\b", "DMU"),
    (r"\bT&RS\b", "TRACTION"),
    (r"\bLDN\b", "LONDON"),
    (r"\bELL\b", "EAST LONDON LINE"),
    (r"\bNT\b", "NORTH"),
    (r"\bST\b", "STREET"),
    (r"\bRD\b", "ROAD"),
    (r"\bBR\b", "BRIDGE"),
]

# Strip these tokens entirely — they don't appear in OSM names
STRIP_TOKENS = re.compile(
    r"\b(UP|DOWN|DN|SIGNAL|SIG|EMB|SIG\s+\w+|TD\w+|E\d{3,}|[A-Z]{1,2}\d{3,})\b"
)


def normalize(name: str) -> str:
    n = name.upper()
    n = re.sub(r"\(.*?\)", "", n)     # strip parenthetical suffixes: (ELL), (LOTHIAN), etc.
    for pattern, replacement in ABBREVS:
        n = re.sub(pattern, replacement, n)
    n = STRIP_TOKENS.sub("", n)
    n = re.sub(r"[^\w\s]", " ", n)   # punctuation → space
    n = " ".join(n.split())           # collapse whitespace
    return n


def overpass_query() -> list[dict]:
    """Fetch all named railway nodes in GB from Overpass."""
    query = f"""
[out:json][timeout:180][bbox:{GB_BBOX}];
(
  node["railway"="junction"]["name"];
  node["railway"="station"]["name"];
  node["railway"="halt"]["name"];
  node["railway"="stop"]["name"];
  node["railway"="crossing"]["name"];
  node["railway"="signal_box"]["name"];
  node["railway"="yard"]["name"];
  node["railway"="siding"]["name"];
);
out body;
"""
    print("Querying Overpass for all named railway nodes in GB…")
    data = urllib.parse.urlencode({"data": query}).encode()
    req = urllib.request.Request(
        OVERPASS_URL, data=data,
        headers={"User-Agent": "RailTrack/1.0 (open source rail tracker)"},
    )
    with urllib.request.urlopen(req, timeout=200) as r:
        result = json.load(r)
    nodes = [e for e in result.get("elements", []) if e.get("type") == "node"]
    print(f"Got {len(nodes):,} named railway nodes from OSM")
    return nodes


def build_name_index(nodes: list[dict]) -> dict[str, dict]:
    """Build normalized_name → {lat, lng, osm_name} index from OSM nodes.

    When multiple nodes share a normalized name, prefer those tagged
    railway=station, then railway=halt, then others.
    """
    PREF = {"station": 0, "halt": 1, "junction": 2, "crossing": 3}
    index: dict[str, dict] = {}
    for node in nodes:
        tags = node.get("tags", {})
        osm_name = tags.get("name", "")
        if not osm_name:
            continue
        n = normalize(osm_name)
        if not n:
            continue
        priority = PREF.get(tags.get("railway", ""), 9)
        existing = index.get(n)
        if existing is None or priority < existing["priority"]:
            index[n] = {
                "lat": node["lat"],
                "lng": node["lon"],
                "osm_name": osm_name,
                "priority": priority,
            }
    return index


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Print matches without writing")
    args = parser.parse_args()

    coords_path = SHARED_PATH / "station_coords.json"
    csv_path = SHARED_PATH / "stanox-code.csv"

    if not coords_path.exists():
        sys.exit(f"station_coords.json not found at {coords_path}")
    if not csv_path.exists():
        sys.exit(f"stanox-code.csv not found at {csv_path}")

    # Load existing coords
    with coords_path.open() as f:
        existing: dict[str, dict] = json.load(f)
    print(f"Existing coords: {len(existing):,}")

    # Load stanox CSV — only entries missing from existing
    missing: dict[str, dict] = {}
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            stanox = row.get("STANOX NO.", "").strip()
            name = row.get("FULL NAME", "").strip()
            crs = row.get("CRS CODE", "").strip()
            route = row.get("Route Description", "").strip()
            if stanox and name and stanox not in existing:
                missing[stanox] = {"name": name, "crs": crs, "route": route}

    print(f"Stanox entries missing coords: {len(missing):,}")

    # Build normalized name → stanox lookup for missing entries
    norm_to_stanox: dict[str, str] = {}
    for stanox, info in missing.items():
        n = normalize(info["name"])
        if n and n not in norm_to_stanox:
            norm_to_stanox[n] = stanox

    # Fetch OSM nodes and build index
    try:
        nodes = overpass_query()
    except Exception as exc:
        sys.exit(f"Overpass query failed: {exc}")

    osm_index = build_name_index(nodes)
    print(f"Unique normalized OSM names: {len(osm_index):,}")

    # Match
    matched: dict[str, dict] = {}
    for norm_name, stanox in norm_to_stanox.items():
        hit = osm_index.get(norm_name)
        if hit:
            info = missing[stanox]
            matched[stanox] = {
                "lat": hit["lat"],
                "lng": hit["lng"],
                "name": info["name"].title(),
                "crs": info["crs"],
                "route": info["route"],
            }

    print(f"\nMatched {len(matched):,} new stanox entries")
    print(f"Still unmatched: {len(missing) - len(matched):,} (signals, sidings, depot tracks, etc.)")

    if matched:
        print("\nSample matches:")
        for stanox, data in list(matched.items())[:15]:
            print(f"  {stanox:6s}  {data['name']:40s}  {data['lat']:.5f}, {data['lng']:.5f}")

    if args.dry_run:
        print("\n[dry-run] Not writing.")
        return

    existing.update(matched)
    with coords_path.open("w") as f:
        json.dump(existing, f, separators=(",", ":"))

    print(f"\nWritten {len(existing):,} total entries to {coords_path}")
    print(f"Added {len(matched):,} new junction/infrastructure coordinates")


if __name__ == "__main__":
    main()
