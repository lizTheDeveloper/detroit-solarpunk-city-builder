#!/usr/bin/env python3
"""
update-civic-data.py — Hybrid civic data updater for Solarpunk Detroit.

Layered approach:
  1. Wikidata SPARQL  — Mayor of Detroit (structured: Q14916519, verified working)
  2. Wikipedia REST API — election results & voting history
  3. detroitmi.gov scrape — current council roster with bios (9 members)
  4. Local file merge   — updates council-members.ts, detroit.ts

Run weekly via GitHub Action. Opens a PR if data changed.

Usage:
  python3 scripts/update-civic-data.py              # dry run (report changes)
  python3 scripts/update-civic-data.py --apply      # write updated files
  python3 scripts/update-civic-data.py --check      # exit 1 if data is stale
"""

import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ─── Configuration ───────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent
COUNCIL_MEMBERS_PATH = REPO_ROOT / "app/src/data/content/council-members.ts"
DETROIT_TS_PATH = REPO_ROOT / "app/src/city/detroit.ts"

SPARQL_ENDPOINT = "https://query.wikidata.org/sparql"

# Wikidata: verified Mayor of Detroit position (Q14916519)
# Note: Council members mostly aren't tagged with P39 → Q5265877 in Wikidata,
# so we rely on the scraper for their data.
WD_MAYOR_POSITION = "Q14916519"

# Known council member registry — names are hand-curated because the city
# website doesn't expose clean person names on most profile pages (h1 says
# "City Council District 3", not "Scott Benson"). The scraper updates bios
# but not names.
KNOWN_COUNCIL = [
    {"name": "James Tate", "district": 1, "leaning": "progressive", "disp": 60,
     "priorities": ["food_sovereignty", "vacant_land", "community_land_trusts"],
     "slug": "/government/city-council/city-council-president-district-1"},
    {"name": "Angela Whitfield-Calloway", "district": 2, "leaning": "moderate", "disp": 10,
     "priorities": ["historic_preservation", "property_tax", "public_safety"],
     "slug": "/government/city-council/city-council-district-2"},
    {"name": "Scott Benson", "district": 3, "leaning": "progressive", "disp": 40,
     "priorities": ["youth_programs", "education", "anti_blight"],
     "slug": "/government/city-council/city-council-district-3"},
    {"name": "Latisha Johnson", "district": 4, "leaning": "moderate", "disp": 15,
     "priorities": ["waterfront_access", "flood_resilience", "intergenerational_wealth"],
     "slug": "/government/city-council/city-council-district-4"},
    {"name": "Renata Miller", "district": 5, "leaning": "moderate", "disp": 20,
     "priorities": ["small_business", "arts_culture", "neighborhood_safety"],
     "slug": "/government/city-council/city-council-district-5"},
    {"name": "Gabriela Santiago-Romero", "district": 6, "leaning": "progressive", "disp": 50,
     "priorities": ["environmental_justice", "water_rights", "pollution_cleanup"],
     "slug": "/government/city-council/city-council-district-6"},
    {"name": "Denzel Anton McCampbell", "district": 7, "leaning": "moderate", "disp": 25,
     "priorities": ["immigrant_support", "manufacturing", "infrastructure"],
     "slug": "/government/city-council/city-council-district-7-0"},
    {"name": "Coleman Young II", "district": 0, "leaning": "progressive", "disp": 45,
     "priorities": ["youth_programs", "education", "community_land_trusts"],
     "slug": None},  # no dedicated page found
    {"name": "Mary Waters", "district": 0, "leaning": "moderate", "disp": 20,
     "priorities": ["small_business", "neighborhood_safety", "infrastructure"],
     "slug": "/government/city-council/mary-waters"},
]

HEADERS_BROWSER = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
}
HEADERS_API = {
    "User-Agent": "SolarpunkDetroitCivicUpdater/1.0 (multiverse-games)",
}

HTTP_TIMEOUT = 30
SPARQL_RETRY_COUNT = 3
SPARQL_RETRY_DELAY = 2


# ── Layer 1: Wikidata (Mayor) ──────────────────────────────────────────────

def fetch_mayor_from_wikidata() -> Optional[dict]:
    """Query Wikidata for the current Mayor of Detroit.
    
    Uses Q14916519 ("Mayor of Detroit, Michigan") — verified working.
    Returns: { name, wikidata_id, start_date, end_date, url, source }
    """
    query = f"""
    SELECT ?person ?personLabel ?start ?end
    WHERE {{
      ?person p:P39 ?stmt .
      ?stmt ps:P39 wd:{WD_MAYOR_POSITION} .
      ?stmt pq:P580 ?start .
      OPTIONAL {{ ?stmt pq:P582 ?end . }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    ORDER BY DESC(?start)
    LIMIT 3
    """

    rows = _sparql(query)
    if not rows:
        return None

    def parse_row(r: dict) -> dict:
        uri = r.get("person", {}).get("value", "")
        qid_match = re.search(r"Q\d+", uri)
        qid = qid_match.group(0) if qid_match else ""
        end_raw = r.get("end", {}).get("value", "")
        return {
            "name": r.get("personLabel", {}).get("value", ""),
            "wikidata_id": qid,
            "start_date": r.get("start", {}).get("value", "")[:10],
            "end_date": end_raw[:10] if end_raw else None,
            "url": f"https://www.wikidata.org/wiki/{qid}",
        }

    mayors = [parse_row(r) for r in rows]
    now = datetime.now(timezone.utc).isoformat()[:10]
    current = [m for m in mayors if m["end_date"] is None or m["end_date"] > now]
    result = current[0] if current else mayors[0]
    result["source"] = "wikidata"
    return result


def _sparql(query: str) -> list[dict]:
    """Execute SPARQL with retries."""
    for attempt in range(SPARQL_RETRY_COUNT):
        try:
            resp = requests.get(
                SPARQL_ENDPOINT,
                params={"query": query, "format": "json"},
                headers=HEADERS_API,
                timeout=HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json().get("results", {}).get("bindings", [])
        except Exception as e:
            if attempt < SPARQL_RETRY_COUNT - 1:
                print(f"  SPARQL attempt {attempt+1} failed: {e}, retrying...")
                time.sleep(SPARQL_RETRY_DELAY)
            else:
                print(f"  Wikidata SPARQL failed: {e}")
                return []


def lookup_wikidata_person(name: str) -> Optional[str]:
    """Look up a person's Wikidata QID by exact English label.
    Returns QID string or None. Best-effort — most council members
    don't have their council position tagged, but many have personal entries.
    """
    query = f"""
    SELECT ?person WHERE {{
      ?person rdfs:label "{name}"@en .
    }}
    LIMIT 1
    """
    rows = _sparql(query)
    if not rows:
        return None
    uri = rows[0].get("person", {}).get("value", "")
    m = re.search(r"Q\d+", uri)
    return m.group(0) if m else None


# ─── Layer 2: Wikipedia (Election results) ──────────────────────────────────

def fetch_mayor_election_results() -> list[dict]:
    """Fetch Detroit mayoral election results from Wikipedia.
    
    Articles tried:
    - 2025_Detroit_mayoral_election (most recent)
    - List_of_mayors_of_Detroit (history)
    
    Returns list of { year, winner, vote_share, source }.
    """
    results = []

    # 2025 election page (has structured results table)
    data = _wiki_html("2025_Detroit_mayoral_election")
    if data:
        soup = BeautifulSoup(data, "html.parser")
        text = soup.get_text()
        # Find "Mary Sheffield ... 88,229 ... 77.02%"
        m = re.search(r"Mary Sheffield.*?(\d+(?:,\d+)?)\D+(\d+(?:\.\d+)?)%", text[:20000], re.S)
        if m:
            results.append({
                "year": 2025,
                "winner": "Mary Sheffield",
                "votes": m.group(1),
                "vote_share": m.group(2),
                "source": "Wikipedia:2025_Detroit_mayoral_election",
            })

    # List of mayors for historical record
    data2 = _wiki_html("List_of_mayors_of_Detroit")
    if data2:
        soup2 = BeautifulSoup(data2, "html.parser")
        text2 = soup2.get_text()
        # Find "Mike Duggan" with dates
        m2 = re.search(r"Mike Duggan.*?(2\d{3})\D+(2\d{3})", text2[:30000], re.S)
        if m2:
            results.append({
                "year": int(m2.group(1)),
                "winner": "Mike Duggan",
                "term_end": int(m2.group(2)),
                "note": "served " + m2.group(1) + "-" + m2.group(2),
                "source": "Wikipedia:List_of_mayors_of_Detroit",
            })

    return results


def _wiki_html(title: str) -> Optional[str]:
    try:
        resp = requests.get(
            f"https://en.wikipedia.org/api/rest_v1/page/html/{title}",
            headers={**HEADERS_API, "Accept": "text/html"},
            timeout=HTTP_TIMEOUT,
        )
        resp.raise_for_status()
        return resp.text
    except Exception as e:
        print(f"  Wikipedia fetch failed for {title}: {e}")
        return None


# ─── Layer 3: detroitmi.gov scraper (Council bios) ──────────────────────────

def scrape_council_bios() -> dict:
    """Scrape profile pages for current council member bios.
    
    Key insight: detroitmi.gov profile pages don't expose clean person names
    in the HTML (h1 = "City Council District 3", not "Scott Benson").
    We use KNOWN_COUNCIL slugs to identify which member page is which,
    and extract bio text only — names come from the registry.
    
    Returns: { slug_key: { bio: str, url: str } }
    """
    bios = {}

    for member in KNOWN_COUNCIL:
        slug = member.get("slug")
        if not slug:
            continue

        url = f"https://detroitmi.gov{slug}"
        try:
            resp = requests.get(url, headers=HEADERS_BROWSER, timeout=HTTP_TIMEOUT)
            resp.raise_for_status()
        except requests.RequestException as e:
            print(f"  ✗ Failed to fetch {slug}: {e}")
            continue

        soup = BeautifulSoup(resp.text, "html.parser")
        bio = _extract_bio(soup, member["name"])

        bios[_slug_key(member["name"])] = {
            "bio": bio,
            "url": url,
            "source": "detroitmi.gov",
        }

        # Polite rate limit
        time.sleep(0.3)

    return bios


def _extract_bio(soup: BeautifulSoup, member_name: str = "") -> str:
    """Extract bio text from a council profile page.
    
    Strategies (in order):
    1. Meta <meta name="description"> / og:description (most reliable — server-rendered)
    2. "Council Member Bio" section → subsequent text until next heading
    3. Paragraphs mentioning the member's name (fallback for JS-rendered pages)
    4. Longest paragraph in <main> or <article> (last resort)
    """
    # Strategy 1: meta tags (works for Denzel's empty Drupal view)
    for meta_key, meta_attr in [("og:description", "property"), ("description", "name"), ("abstract", "name")]:
        meta = soup.find("meta", {meta_attr: meta_key})
        if meta and meta.get("content"):
            content = meta["content"].strip()
            # Skip CSS/JS fragments, nav text, and boilerplate
            is_bad = (
                len(content) < 60 or
                content.startswith(".") or
                content.startswith("function") or
                content.startswith("var ") or
                "district do i live" in content.lower() or
                "online services" in content.lower() or
                "city of detroit" in content.lower()[:60]
            )
            if not is_bad:
                return _clean_bio(content)

    # Strategy 2: structured bio section
    bio = ""
    bio_header = soup.find(
        ["h2", "h3"],
        string=lambda s: s and "bio" in s.lower() if s else False,
    )
    if bio_header:
        for sibling in bio_header.find_next_siblings():
            if not hasattr(sibling, "name"):
                continue
            if sibling.name in ["h2", "h3"]:
                break
            txt = sibling.get_text(strip=True)
            if txt and len(txt) > 20:
                bio += txt + " "

    # Check if we got real content (not just whitespace div)
    if len(bio.strip()) > 50:
        return _clean_bio(bio)

    # Strategy 3: paragraphs mentioning the member's name
    if member_name:
        name_parts = [p for p in member_name.split() if len(p) > 2]
        best = ""
        best_score = 0
        for p in soup.find_all("p"):
            txt = p.get_text(strip=True)
            if len(txt) < 80:
                continue
            score = sum(10 for part in name_parts if part.lower() in txt.lower())
            score += min(5, len(txt) // 100)
            # Penalize navigation/boilerplate
            if any(skip in txt.lower() for skip in ["city of detroit", "request translation", "online services"]):
                score -= 20
            if score > best_score and score > 5:
                best_score = score
                best = txt
        if best:
            return best

    # Strategy 4: longest paragraph in main area
    main = soup.find("main") or soup.find("article")
    if main:
        paragraphs = [
            (len(p.get_text()), p.get_text(strip=True))
            for p in main.find_all("p")
            if len(p.get_text(strip=True)) > 100
        ]
        if paragraphs:
            paragraphs.sort(reverse=True)
            return paragraphs[0][1]

    return ""


def _clean_bio(raw: str) -> str:
    """Clean scraped bio text."""
    # Collapse whitespace, remove trailing artifacts
    text = re.sub(r"\s+", " ", raw).strip()
    # Remove trailing underscore artifacts from CMS
    text = re.sub(r"\s*_+$", "", text)
    # Truncate to reasonable length
    return text[:600] if text else ""


# ─── Merge ──────────────────────────────────────────────────────────────────

def merge_all_data(
    mayor: Optional[dict],
    scraped_bios: dict,
    elections: list[dict],
) -> dict:
    """Merge all layers into canonical structure."""
    council = []

    for member in KNOWN_COUNCIL:
        key = _slug_key(member["name"])
        scraper = scraped_bios.get(key) or {}

        wikidata_id = lookup_wikidata_person(member["name"])
        wikidata_url = f"https://www.wikidata.org/wiki/{wikidata_id}" if wikidata_id else ""

        backstory = scraper.get("bio", "")
        if not backstory:
            backstory = _fallback_bio(member["name"])

        council.append({
            "name": member["name"],
            "district_number": member["district"],
            "leaning": member["leaning"],
            "disposition": member["disp"],
            "priorities": member["priorities"],
            "backstory": backstory,
            "wikidata_id": wikidata_id or "",
            "profile_url": scraper.get("url", ""),
            "source": scraper.get("source", "reference"),
        })

    # Sort: districts 1-7, then at-large (0) at end
    council.sort(key=lambda m: (m["district_number"] if m["district_number"] > 0 else 99, m["name"]))

    # Changes vs local
    current_names = _read_local_names()
    current_mayor = _read_local_mayor()
    new_names = [m["name"] for m in council]
    new_mayor_name = mayor["name"] if mayor else _reference_mayor()["name"]

    changes = {
        "mayor_changed": (current_mayor or "").lower() != new_mayor_name.lower(),
        "old_mayor": current_mayor,
        "new_mayor": new_mayor_name,
        "added": [n for n in new_names if n.lower() not in set(x.lower() for x in current_names)],
        "removed": [n for n in current_names if n.lower() not in set(x.lower() for x in new_names)],
    }

    queried_at = datetime.now(timezone.utc).isoformat()[:19] + "Z"

    return {
        "mayor": mayor or _reference_mayor(),
        "council": council,
        "elections": elections,
        "sources": {
            "mayor": "wikidata" if mayor else "reference",
            "council": "scraped" if scraped_bios else "reference",
            "elections": "wikipedia" if elections else "none",
            "queried_at": queried_at,
        },
        "changes": changes,
    }


def _fallback_bio(name: str) -> str:
    """Fallback bios for members whose pages are unavailable or empty."""
    bios = {
        "James Tate": "City Council President. Former State Representative and executive director of the School Reform Office. Built his career in education policy and community institutions. Represents the northwest neighborhoods where vacant land policy is an existential question.",
        "Coleman Young II": "Council President Pro Tem. Carries the name of Detroit's first Black mayor, Coleman Young, who served from 1974 to 1994. Elected at-large, serving all nine districts. Progressive voice on youth investment, education equity, and community ownership of land.",
        "Denzel Anton McCampbell": "Elected in 2025 with a community-first platform. Hosts monthly District Digest meetings to keep constituents informed and involved. Represents working-class neighborhoods in west-central Detroit where infrastructure and manufacturing define daily life.",
        "Mary Waters": "At-large council member focused on fiscal responsibility and constituent services. Represents the entire city rather than a single district. Bridges progressive and moderate positions — votes with the body's center.",
    }
    return bios.get(name, "")


def _reference_mayor() -> dict:
    return {
        "name": "Mary Sheffield",
        "start_date": "2026-01-01",
        "wikidata_id": "Q75243565",
        "url": "https://detroitmi.gov/government/mayors-office",
        "source": "reference",
    }


# ─── Local File IO ──────────────────────────────────────────────────────────

def _read_local_names() -> list[str]:
    if not COUNCIL_MEMBERS_PATH.exists():
        return []
    return re.findall(r"name:\s*'([^']+)'", COUNCIL_MEMBERS_PATH.read_text())


def _read_local_mayor() -> Optional[str]:
    if not DETROIT_TS_PATH.exists():
        return None
    m = re.search(r"mayor:\s*\{[^}]*name:\s*'([^']+)'", DETROIT_TS_PATH.read_text())
    return m.group(1) if m else None


def _slug_key(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


# District → game tile IDs (game design data, not auto-derived)
_DISTRICT_TILES = {
    1: ["brightmoor", "warrendale", "grandmont_rosedale", "rouge_park"],
    2: ["palmer_park", "highland_park"],
    3: ["banglatown", "hamtramck"],
    4: ["indian_village", "west_village"],
    5: ["midtown", "eastern_market", "north_end"],
    6: ["southwest_detroit", "corktown", "mexicantown", "delray"],
    7: ["livernois_mcnichols", "fitzgerald"],
    0: [],
}


def _district_label(num: int) -> str:
    return {1: "Northwest Detroit", 2: "North-Central Detroit", 3: "Northeast Detroit",
            4: "Far East Side", 5: "Central Detroit", 6: "Southwest Detroit",
            7: "West-Central Detroit", 0: "At-Large"}.get(num, f"District {num}")


def _write_council_members(data: dict) -> None:
    members = data["council"]
    src = data["sources"].get("council", "")
    queried_at = data["sources"].get("queried_at", "")

    lines = [
        f"// AUTO-GENERATED {queried_at} (source: {src})",
        f"// Do NOT hand-edit — overwritten by scripts/update-civic-data.py",
        f"// To edit priorities/leaning/disposition, edit KNOWN_COUNCIL in the script.",
        "",
        "import type { CouncilMember } from '../../state/types';",
        "",
        "export const COUNCIL_MEMBERS: Record<string, CouncilMember> = {",
        "",
    ]

    for member in members:
        key = _slug_key(member["name"])
        tiles = _DISTRICT_TILES.get(member["district_number"], [])
        backstory = member["backstory"].replace("'", "\\'")[:600]

        lines.append(f"  {key}: {{")
        lines.append(f"    id: '{key}',")
        lines.append(f"    name: '{member['name']}',")
        lines.append(f"    district: '{_district_label(member['district_number'])}',")
        lines.append(f"    districtNumber: {member['district_number']},")
        lines.append(f"    leaning: '{member['leaning']}',")
        lines.append(f"    priorities: {json.dumps(member['priorities'])},")
        lines.append(f"    disposition: {member['disposition']},")
        lines.append(f"    backstory: '{backstory}',")
        lines.append(f"    tileIds: {json.dumps(tiles)},")
        if member.get("wikidata_id"):
            lines.append(f"    wikidataId: '{member['wikidata_id']}',")
        if member.get("profile_url"):
            lines.append(f"    profileUrl: '{member['profile_url']}',")
        lines.append(f"  }},")
        lines.append("")

    lines.append("};\n")
    COUNCIL_MEMBERS_PATH.write_text("\n".join(lines))
    print(f"  ✓ Wrote {COUNCIL_MEMBERS_PATH}")


def _write_mayor(detroit_ts_path: Path, mayor: dict) -> None:
    if not detroit_ts_path.exists():
        print(f"  ✗ {detroit_ts_path} not found")
        return

    content = detroit_ts_path.read_text()
    since = mayor["start_date"][:4] if mayor.get("start_date") else ""
    wikidata_id = mayor.get("wikidata_id", "")

    new_block = (
        f"    mayor: {{\n"
        f"      name: '{mayor['name']}',\n"
        f"      contact: 'https://detroitmi.gov/government/mayors-office',\n"
        f"      since: '{since}',\n"
        f"      wikidataId: '{wikidata_id}',\n"
        f"    }},"
    )

    new_content = re.sub(r"    mayor:\s*\{[^}]*\},", new_block, content, count=1)
    if new_content != content:
        detroit_ts_path.write_text(new_content)
        print(f"  ✓ Updated mayor in {detroit_ts_path}")
    else:
        print(f"  — Mayor unchanged in {detroit_ts_path}")


# ─── Main ───────────────────────────────────────────────────────────────────

def main() -> int:
    apply_mode = "--apply" in sys.argv
    check_only = "--check" in sys.argv

    print("=" * 60)
    print("Solarpunk Detroit — Civic Data Update")
    print(f"Run at: {datetime.now(timezone.utc).isoformat()[:19]}Z")
    print("=" * 60)

    # Layer 1
    print("\n[1/3] Wikidata → Mayor of Detroit")
    mayor = fetch_mayor_from_wikidata()
    if mayor:
        print(f"  Mayor: {mayor['name']} (since {mayor['start_date'][:4]}) — {mayor.get('url','?')}")
    else:
        print("  Mayor: no Wikidata result (will use reference: Mary Sheffield)")

    # Layer 2
    print("\n[2/3] Wikipedia → Election history")
    elections = fetch_mayor_election_results()
    for e in elections:
        winner = e.get("winner", "?")
        share = e.get("vote_share", "")
        year = e.get("year", "?")
        extra = f" ({share}%)" if share else f" [{e.get('note', '')}]" if e.get('note') else ""
        print(f"  {year}: {winner}{extra}")

    # Layer 3
    print("\n[3/3] detroitmi.gov → Council member bios")
    bios = scrape_council_bios()
    for key, info in bios.items():
        bio_len = len(info.get("bio", ""))
        print(f"  {key}: bio_len={bio_len} source={info.get('source','?')}")
    missing = [
        m["name"] for m in KNOWN_COUNCIL
        if _slug_key(m["name"]) not in bios and m.get("slug")
    ]
    if missing:
        print(f"  ⚠ No bio scraped for: {', '.join(missing)}")

    # Merge
    print("\n[Merge] Combining sources...")
    merged = merge_all_data(mayor, bios, elections)
    changes = merged["changes"]

    # Report
    print(f"\n{'─'*50}")
    print(f"  Mayor: {changes['old_mayor']} → {changes['new_mayor']}"
          if changes["mayor_changed"] else
          f"  Mayor: no change ({changes['new_mayor']})")
    print(f"  Council: {len(_read_local_names())} local → {len(merged['council'])} from sources")
    for c in changes.get("added", []):
        print(f"    + {c}")
    for c in changes.get("removed", []):
        print(f"    - {c}")
    print(f"\n  Sources: {', '.join(f'{k}={v}' for k, v in merged['sources'].items() if k != 'queried_at')}")

    # Write or check
    if apply_mode:
        print(f"\n{'─'*50}")
        print("Applying changes...")
        _write_council_members(merged)
        if mayor:
            _write_mayor(DETROIT_TS_PATH, mayor)
        # Also update reference for mayor's Wikidata ID
        print("Done.")
        return 0

    if check_only:
        stale = changes["mayor_changed"] or bool(changes.get("added")) or bool(changes.get("removed"))
        if stale:
            print(f"\nSTALE — run with --apply or let CI open a PR")
            return 1
        else:
            print(f"\nUp to date ✓")
            return 0

    print(f"\n{'─'*50}")
    print("Dry run. Pass --apply to write changes, --check for CI exit code.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
