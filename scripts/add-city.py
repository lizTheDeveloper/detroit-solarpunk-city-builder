#!/usr/bin/env python3
"""
add-city.py — Automated city onboarding tool for Solarpunk City Builder.

Usage:
    python3 scripts/add-city.py "Minneapolis"
    python3 scripts/add-city.py "Seattle" --census-key YOUR_KEY
    python3 scripts/add-city.py "Portland" --skip-geojson

This script:
    1. Queries Wikidata for mayor and city council members
    2. Attempts to scrape government website for council roster (if Wikidata incomplete)
    3. Queries Census API for demographics (if key provided)
    4. Generates neighborhood boundaries GeoJSON (if possible)
    5. Creates the city package directory and TypeScript files
    6. Registers the city in the app's registry
    7. Validates the generated package

Output:
    - app/src/city/{slug}/package.ts
    - app/src/city/{slug}/index.ts
    - public/data/cities/{slug}/geography.geojson (if available)
    - Updates app/src/city/registry.ts

Requirements:
    - Python 3.10+
    - requests, SPARQLWrapper (pip install -r scripts/requirements.txt)
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

# Try to import SPARQLWrapper, fall back to direct SPARQL if not available
try:
    from SPARQLWrapper import SPARQLWrapper, JSON
    HAS_SPARQLWRAPPER = True
except ImportError:
    HAS_SPARQLWRAPPER = False
    print("Warning: SPARQLWrapper not installed, using direct HTTP requests")

# ─── Configuration ──────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).parent.parent
CITY_DIR = REPO_ROOT / "app/src/city"
PUBLIC_DATA_DIR = REPO_ROOT / "public/data/cities"
REGISTRY_FILE = CITY_DIR / "registry.ts"

# Wikidata SPARQL endpoint
SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# Census API configuration
CENSUS_API_BASE = "https://api.census.gov/data/2023/acs/acs5"

# HTTP configuration
HTTP_TIMEOUT = 30
USER_AGENT = "SolarpunkCityBuilder/1.0 (https://github.com/multiverse-games)"


# ─── Wikidata Queries ───────────────────────────────────────────────────────

def execute_sparql(query: str) -> list[dict]:
    """Execute SPARQL query and return results as list of dicts."""
    if HAS_SPARQLWRAPPER:
        sparql = SPARQLWrapper(SPARQL_ENDPOINT)
        sparql.setQuery(query)
        sparql.setReturnFormat(JSON)
        sparql.addCustomHttpHeader("User-Agent", USER_AGENT)
        results = sparql.query().convert()
        return results["results"]["bindings"]
    else:
        # Fallback to direct HTTP request
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        r = requests.get(SPARQL_ENDPOINT, 
                        params={"query": query, "format": "json"},
                        headers=headers, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        data = r.json()
        return data["results"]["bindings"]


def get_city_info(city_name: str) -> Optional[dict]:
    """Query Wikidata for basic city information."""
    query = f"""
    SELECT ?city ?cityLabel ?population ?area ?coord WHERE {{
      ?city rdfs:label "{city_name}"@en .
      ?city wdt:P31 ?type .
      ?type wdt:P279* wd:Q515 .  # instance of city
      OPTIONAL {{ ?city wdt:P1082 ?population . }}
      OPTIONAL {{ ?city wdt:P2046 ?area . }}
      OPTIONAL {{ ?city wdt:P625 ?coord . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,[AUTO_LANGUAGE]". }}
    }} LIMIT 1
    """
    try:
        results = execute_sparql(query)
        if results:
            return results[0]
        return None
    except Exception as e:
        print(f"Error querying city info: {e}")
        return None


def get_mayor(city_name: str) -> Optional[dict]:
    """Query Wikidata for current mayor of a city."""
    query = f"""
    SELECT ?mayor ?mayorLabel ?start ?wikidataId WHERE {{
      ?city rdfs:label "{city_name}"@en .
      ?city wdt:P31 ?type .
      ?type wdt:P279* wd:Q515 .
      ?city p:P6 ?stmt .
      ?stmt ps:P6 ?mayor .
      ?stmt pq:P580 ?start .
      OPTIONAL {{ ?stmt pq:P582 ?end . }}
      FILTER(!BOUND(?end))  # current mayor only
      BIND(SUBSTR(STR(?mayor), 32) AS ?wikidataId)  # extract QID from URI
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,[AUTO_LANGUAGE]". }}
    }}
    ORDER BY DESC(?start)
    LIMIT 1
    """
    try:
        results = execute_sparql(query)
        if results:
            return results[0]
        return None
    except Exception as e:
        print(f"Error querying mayor: {e}")
        return None


def get_city_council_wikidata(city_name: str) -> list[dict]:
    """Query Wikidata for city council members (inconsistent coverage)."""
    query = f"""
    SELECT ?member ?memberLabel ?position ?start ?wikidataId ?district WHERE {{
      ?member p:P39 ?stmt .
      ?stmt ps:P39 ?position .
      ?position wdt:P279* wd:Q194197 .  # "council"
      ?position wdt:P1001 ?city .
      ?city rdfs:label "{city_name}"@en .
      ?stmt pq:P580 ?start .
      OPTIONAL {{ ?stmt pq:P582 ?end . }}
      OPTIONAL {{ ?stmt pq:P768 ?district }}  # district/ward if available
      FILTER(!BOUND(?end))  # current members only
      BIND(SUBSTR(STR(?member), 32) AS ?wikidataId)
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,[AUTO_LANGUAGE]". }}
    }}
    ORDER BY ?district ?memberLabel
    LIMIT 50
    """
    try:
        results = execute_sparql(query)
        return results
    except Exception as e:
        print(f"Error querying city council: {e}")
        return []


def get_council_generic(city_name: str) -> list[dict]:
    """Alternative query: find council members by searching for 'City Council' entity."""
    query = f"""
    SELECT ?member ?memberLabel ?start ?wikidataId ?district WHERE {{
      ?member p:P39 ?stmt .
      ?stmt ps:P39 ?position .
      ?position wdt:P361 ?councilBody .
      ?councilBody rdfs:label "{city_name} City Council"@en .
      ?stmt pq:P580 ?start .
      OPTIONAL {{ ?stmt pq:P582 ?end . }}
      OPTIONAL {{ ?stmt pq:P768 ?district }}
      FILTER(!BOUND(?end))
      BIND(SUBSTR(STR(?member), 32) AS ?wikidataId)
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en,[AUTO_LANGUAGE]". }}
    }}
    ORDER BY ?district ?memberLabel
    LIMIT 50
    """
    try:
        results = execute_sparql(query)
        return results
    except Exception as e:
        print(f"Error in alternative council query: {e}")
        return []


def get_council_members(city_name: str) -> list[dict]:
    """Get city council members, trying multiple Wikidata query strategies."""
    print(f"  Querying Wikidata for city council...")
    
    # Try first query strategy
    members = get_city_council_wikidata(city_name)
    if members:
        print(f"  ✓ Found {len(members)} council members via P1001 method")
        return members
    
    # Try alternative query
    members = get_council_generic(city_name)
    if members:
        print(f"  ✓ Found {len(members)} council members via City Council label method")
        return members
    
    print(f"  ⚠ No council members found on Wikidata for {city_name}")
    print(f"     Will attempt to scrape government website...")
    return []


# ─── Census API ─────────────────────────────────────────────────────────────

def get_census_data(city_name: str, state_name: str, api_key: Optional[str] = None) -> Optional[dict]:
    """Query Census API for city demographics."""
    if not api_key:
        print("  Skipping Census API (no API key provided)")
        return None
    
    # This would need FIPS code lookup - simplified for now
    # In full implementation, would look up FIPS code for city+state
    print(f"  Querying Census API for {city_name}, {state_name}...")
    
    # Placeholder - would need actual implementation
    # Example query structure:
    # params = {
    #     "get": "NAME,B01001_001E,B19013_001E,B25002_001E",
    #     "for": "place:{FIPS_CODE}",
    #     "in": f"state:{STATE_FIPS}",
    #     "key": api_key
    # }
    
    return {
        "population": None,
        "median_income": None,
        "housing_units": None,
        "note": "Census data placeholder - needs FIPS code lookup"
    }


# ─── Government Website Scraper ─────────────────────────────────────────────

KNOWN_GOVERNMENT_URLS = {
    "Minneapolis": {
        "url": "https://minneapolismn.gov",
        "council_path": "/government/city-council/",
        "selector": ".council-member-card .name",
    },
    "Seattle": {
        "url": "https://seattle.gov",
        "council_path": "/city-council",
        "selector": ".council-member .name",
    },
    "Chicago": {
        "url": "https://chicityclerk.com",
        "council_path": "/your-government/city-council",
        "selector": ".alderman-name",
    },
    # Add more cities as needed
}


def scrape_government_website(city_name: str) -> list[dict]:
    """Scrape city government website for council members."""
    if city_name not in KNOWN_GOVERNMENT_URLS:
        print(f"  No known government URL for {city_name}")
        return []
    
    config = KNOWN_GOVERNMENT_URLS[city_name]
    url = config["url"] + config["council_path"]
    
    print(f"  Scraping {url} for council members...")
    
    try:
        headers = {"User-Agent": USER_AGENT}
        r = requests.get(url, headers=headers, timeout=HTTP_TIMEOUT)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, "html.parser")
        
        # This would need city-specific parsing logic
        # For now, just a placeholder
        print(f"  ⚠ Government website scraping not yet implemented for {city_name}")
        print(f"     Please manually add council members to the generated package.ts")
        
        return []
    except Exception as e:
        print(f"  Error scraping government website: {e}")
        return []


# ─── Package Generation ─────────────────────────────────────────────────────

def generate_city_slug(city_name: str) -> str:
    """Convert city name to URL-safe slug."""
    slug = city_name.lower()
    slug = re.sub(r'[^a-z0-9]+', '_', slug)
    slug = slug.strip('_')
    return slug


def generate_package_ts(
    city_name: str,
    slug: str,
    state: str,
    mayor_data: Optional[dict],
    council_data: list[dict],
    census_data: Optional[dict],
) -> str:
    """Generate TypeScript package.ts file for the city."""
    
    # Extract mayor info
    if mayor_data:
        mayor_name = mayor_data.get("mayorLabel", {}).get("value", "Unknown")
        mayor_since = mayor_data.get("start", {}).get("value", "")[:10]
        mayor_wikidata = mayor_data.get("wikidataId", {}).get("value", "")
    else:
        mayor_name = "Unknown"
        mayor_since = ""
        mayor_wikidata = ""
    
    # Extract council members
    council_members = []
    for i, member in enumerate(council_data):
        name = member.get("memberLabel", {}).get("value", "Unknown")
        wikidata_id = member.get("wikidataId", {}).get("value", "")
        district = member.get("district", {}).get("value", f"District {i+1}")
        
        council_members.append({
            "name": name,
            "district": district,
            "wikidataId": wikidata_id,
            "disposition": 0,  # placeholder
            "leaning": "moderate",  # placeholder
            "priorities": [],
        })
    
    # Census data placeholders
    population = 0
    if census_data and census_data.get("population"):
        population = census_data["population"]
    
    median_income = 0
    if census_data and census_data.get("median_income"):
        median_income = census_data["median_income"]
    
    # Generate TypeScript
    council_members_ts = json.dumps(council_members, indent=2)
    
    ts_content = f"""// AUTO-GENERATED by add-city.py on {datetime.now().isoformat()}
// City: {city_name}, {state}

import type {{ CityPackage }} from '../types';

const {slug}Package: CityPackage = {{
  meta: {{
    cityName: "{city_name}",
    state: "{state}",
    slug: "{slug}",
  }},
  
  powerStructure: {{
    mayor: {{
      name: "{mayor_name}",
      since: "{mayor_since}",
      wikidataId: "{mayor_wikidata}",
    }},
    cityCouncil: {council_members_ts},
    // TODO: Add other power structure elements
    // utilities: [],
    // developers: [],
  }},
  
  calibration: {{
    budget: {{
      // TODO: Update with real budget data
      // Source: City budget document
      totalBudget: 0,
      source: "Unknown",
    }},
    population: {population},
    medianIncome: {median_income},
    // TODO: Add other calibration data
    // vacancyRate: 0,
    // treeCanopy: 0,
    // foodAccess: 0,
  }},
  
  geography: {{
    // TODO: Update with real neighborhood data
    // GeoJSON files should be in public/data/cities/{slug}/
    neighborhoodBoundaries: [],
    blockPolygons: [],
  }},
  
  arcConfigs: {{
    // TODO: Configure city-specific arc settings
    // Based on city's unique challenges and history
  }},
  
  newsSources: {{
    // TODO: Add local news sources
    // Example:
    // local: ["https://example.com/rss"],
  }},
  
  customRules: {{
    // TODO: Add city-specific game rules
    // Example: rent control, special zoning, etc.
  }},
}};

export default {slug}Package;
"""
    
    return ts_content


def generate_index_ts(slug: str) -> str:
    """Generate index.ts for city directory."""
    return f"""// AUTO-GENERATED by add-city.py
import {slug}Package from './package';

export default {slug}Package;
"""


def generate_geography_geojson(city_name: str, neighborhoods: list[dict]) -> dict:
    """Generate placeholder GeoJSON for city geography."""
    # In full implementation, would use OpenStreetMap Overpass API
    # For now, generate empty placeholder
    
    features = []
    for n in neighborhoods:
        # Placeholder - would need real boundary data
        feature = {
            "type": "Feature",
            "properties": {
                "id": n.get("id", "unknown"),
                "name": n.get("name", "Unknown"),
                "district": n.get("district", ""),
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": []  # Empty - would need real data
            }
        }
        features.append(feature)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


# ─── File Operations ────────────────────────────────────────────────────────

def create_city_directory(slug: str) -> Path:
    """Create city directory structure."""
    city_path = CITY_DIR / slug
    city_path.mkdir(parents=True, exist_ok=True)
    
    public_path = PUBLIC_DATA_DIR / slug
    public_path.mkdir(parents=True, exist_ok=True)
    
    return city_path


def write_city_files(
    slug: str,
    package_ts: str,
    index_ts: str,
    geography_geojson: dict,
) -> None:
    """Write generated files to disk."""
    city_path = CITY_DIR / slug
    public_path = PUBLIC_DATA_DIR / slug
    
    # Write package.ts
    package_file = city_path / "package.ts"
    package_file.write_text(package_ts)
    print(f"  ✓ Created {package_file.relative_to(REPO_ROOT)}")
    
    # Write index.ts
    index_file = city_path / "index.ts"
    index_file.write_text(index_ts)
    print(f"  ✓ Created {index_file.relative_to(REPO_ROOT)}")
    
    # Write geography.geojson
    geojson_file = public_path / "geography.geojson"
    geojson_file.write_text(json.dumps(geography_geojson, indent=2))
    print(f"  ✓ Created {geojson_file.relative_to(REPO_ROOT)}")


def register_city_in_app(slug: str) -> None:
    """Add city to app/src/city/registry.ts."""
    if not REGISTRY_FILE.exists():
        print(f"  ⚠ Registry file not found at {REGISTRY_FILE}")
        return
    
    content = REGISTRY_FILE.read_text()
    
    # Check if already registered
    if f'"{slug}"' in content:
        print(f"  ⚠ City already registered in registry.ts")
        return
    
    # Find the cityRegistry dictionary and add import
    # Look for the last import statement
    import_pattern = r"(import\s+[^\n]+\n)+"
    imports_match = re.search(import_pattern, content)
    
    if imports_match:
        # Add import for new city
        import_stmt = f"import {slug}Package from './{slug}/package';\n"
        insert_pos = imports_match.end()
        content = content[:insert_pos] + import_stmt + content[insert_pos:]
    
    # Find the cityRegistry dictionary and add entry
    registry_pattern = r"const cityRegistry:\s*Record<string,\s*CityPackage>\s*=\s*\{([^}]*)\}"
    registry_match = re.search(registry_pattern, content, re.DOTALL)
    
    if registry_match:
        dict_content = registry_match.group(1)
        # Add new entry
        new_entry = f"  {slug}: {slug}Package,"
        if dict_content.strip():
            # Has existing entries, add after last one
            content = content[:registry_match.end(1)] + "\n" + new_entry + content[registry_match.end(1):]
        else:
            # Empty dict
            content = content.replace(
                registry_match.group(0),
                f"const cityRegistry: Record<string, CityPackage> = {{\n{new_entry}\n}};"
            )
        
        REGISTRY_FILE.write_text(content)
        print(f"  ✓ Registered {slug} in registry.ts")
    else:
        print(f"  ⚠ Could not find cityRegistry in registry.ts")
        print(f"     Please manually add: import {slug}Package from './{slug}/package';")
        print(f"     And add {slug}: {slug}Package to cityRegistry")


# ─── Validation ─────────────────────────────────────────────────────────────

def validate_package(slug: str) -> bool:
    """Validate the generated package."""
    print(f"  Validating {slug} package...")
    
    # Check files exist
    package_file = CITY_DIR / slug / "package.ts"
    index_file = CITY_DIR / slug / "index.ts"
    geojson_file = PUBLIC_DATA_DIR / slug / "geography.geojson"
    
    if not package_file.exists():
        print(f"  ✗ package.ts not found")
        return False
    if not index_file.exists():
        print(f"  ✗ index.ts not found")
        return False
    if not geojson_file.exists():
        print(f"  ✗ geography.geojson not found")
        return False
    
    # Try to parse package.ts (basic syntax check)
    try:
        content = package_file.read_text()
        # Check for basic structure
        if "export default" not in content:
            print(f"  ✗ package.ts missing export default")
            return False
        if "CityPackage" not in content:
            print(f"  ✗ package.ts missing CityPackage type")
            return False
    except Exception as e:
        print(f"  ✗ Error reading package.ts: {e}")
        return False
    
    # Validate GeoJSON
    try:
        geojson = json.loads(geojson_file.read_text())
        if geojson.get("type") != "FeatureCollection":
            print(f"  ✗ geography.geojson is not a valid FeatureCollection")
            return False
    except Exception as e:
        print(f"  ✗ Error reading geography.geojson: {e}")
        return False
    
    print(f"  ✓ Package validation passed")
    return True


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Add a new city to Solarpunk City Builder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 scripts/add-city.py "Minneapolis"
  python3 scripts/add-city.py "Seattle" --state Washington --census-key YOUR_KEY
  python3 scripts/add-city.py "Portland" --skip-geojson

For Census API key (free):
  Sign up at https://api.census.gov/data/key_signup.html
        """
    )
    
    parser.add_argument("city_name", help="Name of the city to add")
    parser.add_argument("--state", "-s", default="Unknown", help="State name (default: Unknown)")
    parser.add_argument("--census-key", "-k", help="Census API key (free, optional)")
    parser.add_argument("--skip-geojson", action="store_true", help="Skip generating GeoJSON (placeholder only)")
    parser.add_argument("--force", "-f", action="store_true", help="Overwrite existing city directory")
    
    args = parser.parse_args()
    
    city_name = args.city_name
    state = args.state
    census_key = args.census_key
    skip_geojson = args.skip_geojson
    force = args.force
    
    print(f"=== Adding city: {city_name}, {state} ===\n")
    
    # Generate slug
    slug = generate_city_slug(city_name)
    print(f"City slug: {slug}")
    
    # Check if already exists
    city_path = CITY_DIR / slug
    if city_path.exists() and not force:
        print(f"Error: City directory already exists at {city_path}")
        print(f"Use --force to overwrite")
        sys.exit(1)
    
    # Step 1: Query Wikidata for city info
    print(f"\n[1/6] Querying Wikidata for city info...")
    city_info = get_city_info(city_name)
    if city_info:
        city_qid = city_info.get("city", {}).get("value", "")
        print(f"  ✓ Found city: {city_qid}")
    else:
        print(f"  ⚠ No city info found on Wikidata")
    
    # Step 2: Query Wikidata for mayor
    print(f"\n[2/6] Querying Wikidata for mayor...")
    mayor_data = get_mayor(city_name)
    if mayor_data:
        mayor_name = mayor_data.get("mayorLabel", {}).get("value", "Unknown")
        mayor_since = mayor_data.get("start", {}).get("value", "")[:10]
        print(f"  ✓ Found mayor: {mayor_name} (since {mayor_since})")
    else:
        print(f"  ⚠ No mayor found on Wikidata")
        print(f"     You can add this manually to the generated package.ts")
    
    # Step 3: Query Wikidata for city council
    print(f"\n[3/6] Querying Wikidata for city council...")
    council_data = get_council_members(city_name)
    if not council_data:
        # Try scraping government website
        council_data = scrape_government_website(city_name)
    
    # Step 4: Query Census API
    print(f"\n[4/6] Querying Census API...")
    census_data = get_census_data(city_name, state, census_key)
    
    # Step 5: Generate geography GeoJSON
    print(f"\n[5/6] Generating geography GeoJSON...")
    if skip_geojson:
        print(f"  Skipping GeoJSON generation (--skip-geojson flag)")
        neighborhoods = []
        geojson_path = None
    else:
        # Call the geojson fetcher script
        import subprocess
        fetcher = Path(__file__).parent / "fetch-city-geojson.py"
        if fetcher.exists():
            print(f"  Running {fetcher.name}...")
            result = subprocess.run(
                [sys.executable, str(fetcher), city_name, "--state", state],
                capture_output=True,
                text=True,
            )
            # Print the fetcher output
            for line in result.stdout.splitlines():
                print(f"    {line}")
            if result.returncode != 0:
                print(f"  ⚠ GeoJSON fetcher failed: {result.stderr[:200]}")
            geojson_path = PUBLIC_DATA_DIR / slug / "neighborhoods.geojson"
        else:
            print(f"  ⚠ fetch-city-geojson.py not found, creating placeholder")
        neighborhoods = []
    
    # Step 6: Generate and write files
    print(f"\n[6/6] Generating city package...")
    
    city_path = create_city_directory(slug)
    
    # Generate TypeScript files
    package_ts = generate_package_ts(
        city_name, slug, state, mayor_data, council_data, census_data
    )
    index_ts = generate_index_ts(slug)
    geography_geojson = generate_geography_geojson(slug, neighborhoods)
    
    # Write files
    write_city_files(slug, package_ts, index_ts, geography_geojson)
    
    # Register in app
    register_city_in_app(slug)
    
    # Validate
    print(f"\nValidating generated package...")
    if validate_package(slug):
        print(f"\n✓ Success! City '{city_name}' added to game")
        print(f"\nNext steps:")
        print(f"  1. Review and edit app/src/city/{slug}/package.ts")
        print(f"     - Add real budget data from city budget documents")
        print(f"     - Update calibration data (vacancy rate, tree canopy, etc.)")
        print(f"     - Configure city-specific arc settings")
        print(f"  2. Replace placeholder geography data:")
        print(f"     - Download real neighborhood boundaries from OpenStreetMap")
        print(f"     - Save as public/data/cities/{slug}/geography.geojson")
        print(f"  3. Add local news sources to package.ts")
        print(f"  4. Add city-specific custom rules")
        print(f"  5. Test the city in-game:")
        print(f"     cd app && npm run dev")
        print(f"     Select '{city_name}' from city selection screen")
        print(f"\nNote: This is an automated scaffold. Manual review and updates are required.")
    else:
        print(f"\n✗ Validation failed. Please check the generated files.")
        sys.exit(1)


if __name__ == "__main__":
    main()
