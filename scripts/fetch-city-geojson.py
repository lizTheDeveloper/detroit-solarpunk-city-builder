#!/usr/bin/env python3
"""
Fetch geographic boundary data for a city from multiple sources.

Usage:
    python3 scripts/fetch-city-geojson.py "Minneapolis" --state "MN"

Fetches from:
  1. Nominatim (OpenStreetMap) — city bounding box
  2. Wikipedia — neighborhood names
  3. Grid approximation — generates polygons from city bbox + neighborhood names

Output:
  Writes neighborhoods.geojson to public/data/cities/{slug}/
"""

import argparse
import json
import math
import os
import re
import sys
import time
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).parent.parent
PUBLIC_DATA_DIR = REPO_ROOT / "public/data/cities"

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
WIKI_API_URL = "https://en.wikipedia.org/w/api.php"
GEOCODE_URL = "https://nominatim.openstreetmap.org/search"

HEADERS = {"User-Agent": "SolarpunkCityBuilder/1.0 (city-simulator)"}

# Neighborhoods known to be actual places (not Wikipedia categories, files, etc.)
NON_NEIGHBORHOOD_PATTERNS = [
    re.compile(r'^Category:', re.I),
    re.compile(r'^File:', re.I),
    re.compile(r'^Template:', re.I),
    re.compile(r'^Help:', re.I),
    re.compile(r'city council', re.I),
    re.compile(r'neighborhoods in saint paul', re.I),
    re.compile(r'^Minneapolis$'),
    re.compile(r'^List'),
    re.compile(r'industrial area$', re.I),
    re.compile(r'Industrial$'),  # "Mid-City Industrial", etc.
    # Filter out non-neighborhood links
    re.compile(r'^\d{4}'),  # Year pages
    re.compile(r'^\d+th '),  # Street names
    re.compile(r'Bridge$', re.I),
    re.compile(r'United States (census|presidential|election)', re.I),
    re.compile(r'(World Series|NFL|NBA|NHL|Super Bowl|Championship)', re.I),
    re.compile(r'(tornado|disaster|murder|shooting)', re.I),
    re.compile(r'Republican|Democratic|Convention', re.I),
    re.compile(r'^Template:'),
    re.compile(r'^Portal:'),
    re.compile(r'^Wikipedia:'),
    re.compile(r'^Help:'),
    re.compile(r'^MediaWiki:'),
    re.compile(r'^(Mayor|Governor|Senator) of', re.I),
    re.compile(r'University of', re.I),
    re.compile(r'Augsburg|Hamline|Macalester|Minneapolis College'),
    re.compile(r'^American Indian Movement$'),
    re.compile(r'^School| High School$'),
    re.compile(r'^(Fraternity|Sorority)'),
    re.compile(r'Stadium$', re.I),
    re.compile(r'^(Interstate|Highway) \d'),
    re.compile(r'^(Mississippi |St\.? Croix )?River', re.I),
    re.compile(r'^(National Register|Star Tribune|Time \(|Twin Cities Public|WCCO|local community)', re.I),
    re.compile(r'\(magazine\)|\(TV|TV\)|\(newspaper\)'),
    re.compile(r'Water Tower$'),
    re.compile(r'^local community$'),
    re.compile(r'Avenue$'),  # Street names
    re.compile(r'Transit Company$', re.I),  # "Twin City Rapid Transit Company"
    re.compile(r'^George Floyd Square$'),  # Memorial/plaza
    re.compile(r'^Henry Wadsworth Longfellow$'),  # The poet, not neighborhood
    re.compile(r'^Lake (of the Isles|Harriet|Nokomis|Calhoun|Como)$'),  # Lakes, not neighborhoods
    re.compile(r'^University$'),  # Ambiguous
    re.compile(r'^Square$'),  # Generic squares
]


def normalize_slug(name: str) -> str:
    """Convert a name to a lowercase slug."""
    s = name.lower().strip()
    s = re.sub(r'[\s\.\'\"]+', ' ', s)
    s = re.sub(r'[^\w\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    return s.strip('-')


def get_city_bbox(city_name: str, state: str) -> dict:
    """Get city bounding box from Nominatim."""
    query = f"{city_name}, {state}, USA"
    params = {
        "q": query,
        "format": "json",
        "limit": 1,
    }
    resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    if not data:
        raise ValueError(f"Could not find {city_name}, {state} in Nominatim")

    item = data[0]
    bbox = item["boundingbox"]  # [south, north, west, east] as strings
    return {
        "south": float(bbox[0]),
        "north": float(bbox[1]),
        "west": float(bbox[2]),
        "east": float(bbox[3]),
    }


def get_neighborhood_names_from_wikipedia(
    city_name: str, state: str
) -> list[str]:
    """Scrape neighborhood names from Wikipedia article."""
    # Search with specific patterns that match neighborhood list articles
    search_queries = [
        f'"Neighborhoods of {city_name}"',
        f'{city_name} neighborhoods list',
        f'Neighborhoods in {city_name} {state}',
    ]
    
    page_title = None
    for query in search_queries:
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": 5,
            "format": "json",
        }
        resp = requests.get(WIKI_API_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        search_data = resp.json()
        
        results = search_data.get("query", {}).get("search", [])
        for r in results:
            title = r["title"].lower()
            # Must mention neighborhoods AND city name
            if "neighbo" in title and city_name.lower().split()[0] in title:
                # Must NOT be a Twin Cities / metro article
                if "saint paul" not in title and "twin cities" not in title:
                    page_title = r["title"]
                    break
        if page_title:
            break
    
    if not page_title:
        print(f"  Could not find Wikipedia article for neighborhoods in {city_name}")
        return []

    print(f"  Found Wikipedia article: '{page_title}'")

    # Get page content
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "wikitext",
        "format": "json",
    }
    resp = requests.get(WIKI_API_URL, params=params, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    parse_data = resp.json()

    if "parse" not in parse_data:
        print(f"  Could not parse Wikipedia page")
        return []

    wikitext = parse_data["parse"].get("wikitext", {}).get("*", "")

    # Extract all wiki links
    raw_links = set()
    for match in re.finditer(r'\[\[([^\]|#]+?)(?:[#|][^\]]*)?\]\]', wikitext):
        raw_links.add(match.group(1).strip())

    # Filter to real neighborhood names
    city_pattern = re.escape(city_name)
    neighborhoods = set()
    for link in raw_links:
        # Clean up Wikipedia disambiguation suffixes before filtering
        clean = link
        # "Neighborhood (CityName)" -> "Neighborhood"
        # "Neighborhood, CityName" -> "Neighborhood"
        # "Central (neighborhood), CityName" -> "Central"
        clean = re.sub(rf'\s*,\s*{city_pattern}\b', '', clean, flags=re.I)
        clean = re.sub(rf'\s*\([^)]*{city_pattern}[^)]*\)', '', clean, flags=re.I)
        clean = re.sub(r'\s*\(\s*neighborhood\s*\)', '', clean, flags=re.I)
        clean = re.sub(r'\s*\([^)]*Minnesota[^)]*\)', '', clean, flags=re.I)
        clean = clean.strip()

        if len(clean) <= 2:
            continue

        # Skip non-neighborhood entries (applied to cleaned name)
        if any(pat.search(clean) for pat in NON_NEIGHBORHOOD_PATTERNS):
            continue

        neighborhoods.add(clean)

    return sorted(neighborhoods)


def geocode_neighborhoods(
    neighborhood_names: list[str],
    city_name: str,
    state: str,
    city_bbox: dict,
) -> dict[str, tuple[float, float]]:
    """
    Geocode neighborhoods via Nominatim.

    Falls back to the city center for neighborhoods that can't be geocoded.
    Returns {name: (lat, lon)} dict.
    """
    geocoded = {}
    city_lat = (city_bbox["south"] + city_bbox["north"]) / 2
    city_lon = (city_bbox["west"] + city_bbox["east"]) / 2

    for i, name in enumerate(neighborhoods):
        query = f"{name}, {city_name} {state}"
        try:
            params = {
                "q": query,
                "format": "json",
                "limit": 1,
                "viewbox": f"{city_bbox['west']},{city_bbox['north']},{city_bbox['east']},{city_bbox['south']}",
                "bounded": 0,
            }
            resp = requests.get(
                GEOCODE_URL, params=params, headers=HEADERS, timeout=8
            )
            resp.raise_for_status()
            data = resp.json()

            if data:
                lat = float(data[0]["lat"])
                lon = float(data[0]["lon"])
                # Verify it's within or near the city bbox
                if (
                    city_bbox["south"] - 0.02 <= lat <= city_bbox["north"] + 0.02
                    and city_bbox["west"] - 0.02 <= lon <= city_bbox["east"] + 0.02
                ):
                    geocoded[name] = (lat, lon)
                else:
                    # Too far from city, use city center
                    geocoded[name] = (city_lat, city_lon)
            else:
                geocoded[name] = (city_lat, city_lon)

            # Rate limit: Nominatim requires max 1 request/second
            if i < len(neighborhoods) - 1:
                time.sleep(1.1)

        except Exception as e:
            print(f"    Failed to geocode '{name}': {e}")
            geocoded[name] = (city_lat, city_lon)

    return geocoded


def generate_bbox_polygon(
    lat: float, lon: float, radius_km: float = 1.0
) -> list[list[list[float]]]:
    """Generate a simple square polygon around a point. Returns GeoJSON coordinates."""
    # ~0.009 degrees per km latitude, ~0.009/cos(lat) degrees per km longitude
    radius_deg_lat = radius_km / 111.0
    radius_deg_lon = radius_km / (111.0 * math.cos(math.radians(lat)))

    coords = [
        [lon - radius_deg_lon, lat - radius_deg_lat],
        [lon + radius_deg_lon, lat - radius_deg_lat],
        [lon + radius_deg_lon, lat + radius_deg_lat],
        [lon - radius_deg_lon, lat + radius_deg_lat],
        [lon - radius_deg_lon, lat - radius_deg_lat],  # close ring
    ]
    return [coords]


def generate_grid_polygons(
    neighborhood_names: list[str],
    city_bbox: dict,
) -> dict[str, tuple[float, float]]:
    """
    Fallback: distribute neighborhoods on a grid across the city bbox.
    Returns {name: (lat, lon)} dict.
    """
    n = len(neighborhood_names)
    if n == 0:
        return {}

    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)

    lat_step = (city_bbox["north"] - city_bbox["south"]) / max(rows, 1)
    lon_step = (city_bbox["east"] - city_bbox["west"]) / max(cols, 1)

    positions = {}
    for i, name in enumerate(neighborhood_names):
        row = i // cols
        col = i % cols
        lat = city_bbox["south"] + (row + 0.5) * lat_step
        lon = city_bbox["west"] + (col + 0.5) * lon_step
        positions[name] = (lat, lon)

    return positions


def build_geojson(
    neighborhood_names: list[str],
    positions: dict[str, tuple[float, float]],
    city_bbox: dict,
) -> dict:
    """Build a GeoJSON FeatureCollection from neighborhood names and positions."""
    features = []

    for name in neighborhood_names:
        lat, lon = positions.get(name, ((city_bbox["south"] + city_bbox["north"]) / 2,
                                         (city_bbox["west"] + city_bbox["east"]) / 2))
        # Scale polygon size based on how many neighborhoods there are
        city_area_km2 = (
            (city_bbox["north"] - city_bbox["south"]) * 111
            * (city_bbox["east"] - city_bbox["west"]) * 111 * math.cos(math.radians(lat))
        )
        n = len(neighborhood_names) or 1
        radius_km = math.sqrt(city_area_km2 / n) * 0.45  # 45% of average cell radius

        polygon = generate_bbox_polygon(lat, lon, radius_km)

        features.append({
            "type": "Feature",
            "properties": {
                "id": normalize_slug(name),
                "name": name,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": polygon,
            },
        })

    return {"type": "FeatureCollection", "features": features}


def main():
    parser = argparse.ArgumentParser(description="Fetch city geographic boundaries")
    parser.add_argument("city_name", help="City name (e.g., 'Minneapolis')")
    parser.add_argument("--state", "-s", required=True, help="State abbreviation (e.g., 'MN')")
    parser.add_argument(
        "--use-geocoding",
        action="store_true",
        help="Use Nominatim geocoding (slow, 1 request/sec per neighborhood)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print results but don't write files",
    )
    args = parser.parse_args()

    city_name = args.city_name
    state = args.state
    slug = normalize_slug(city_name)

    print(f"=== Fetching geography for {city_name}, {state} ===")

    # Step 1: Get city bounding box
    print(f"\n[1/3] Getting city bounding box from Nominatim...")
    bbox = get_city_bbox(city_name, state)
    print(f"  BBox: S={bbox['south']:.4f} N={bbox['north']:.4f} W={bbox['west']:.4f} E={bbox['east']:.4f}")

    # Step 2: Get neighborhood names from Wikipedia
    print(f"\n[2/3] Getting neighborhood names from Wikipedia...")
    neighborhoods = get_neighborhood_names_from_wikipedia(city_name, state)
    print(f"  Found {len(neighborhoods)} neighborhoods")
    for n in neighborhoods[:10]:
        print(f"    - {n}")
    if len(neighborhoods) > 10:
        print(f"    ... and {len(neighborhoods) - 10} more")

    # Step 3: Get positions
    if args.use_geocoding and neighborhoods:
        print(f"\n[3/3] Geocoding neighborhoods (slow, ~1 sec each)...")
        positions = geocode_neighborhoods(neighborhoods, city_name, state, bbox)
        geocoded = sum(1 for _, (lat, lon) in positions.items()
                       if lat != (bbox["south"] + bbox["north"]) / 2
                       or lon != (bbox["west"] + bbox["east"]) / 2)
        print(f"  Geocoded {geocoded}/{len(neighborhoods)} neighborhoods")
    else:
        print(f"\n[3/3] Generating grid layout ({len(neighborhoods)} neighborhoods)...")
        positions = generate_grid_polygons(neighborhoods, bbox)

    # Build GeoJSON
    geojson = build_geojson(neighborhoods, positions, bbox)

    if args.dry_run:
        print(f"\n  Would write {len(geojson['features'])} features to "
              f"public/data/cities/{slug}/neighborhoods.geojson")
        return 0

    # Write output
    out_dir = PUBLIC_DATA_DIR / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "neighborhoods.geojson"
    with open(out_path, "w") as f:
        json.dump(geojson, f, indent=2)
    print(f"\n  Wrote {len(geojson['features'])} features to {out_path.relative_to(REPO_ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
