#!/usr/bin/env python3
"""
Agentic City Expander
====================
Researches local climate leaders, solarpunk movements, and governance structures
for a given city, then generates character definitions and governance customization.

Usage:
  python3 scripts/agentic-researcher/city-expander.py "Portland" --state "OR"
  python3 scripts/agentic-researcher/city-expander.py "Austin" --state "TX"  # outputs JSON report
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# Import web scraper
sys.path.insert(0, str(Path(__file__).parent / "web-scraper"))
from web_scraper import web_scraper

REPO_ROOT = Path(__file__).parent.parent.parent
CITIES_DIR = REPO_ROOT / "app/src/city"
OUTPUT_DIR = REPO_ROOT / "research-output"


class GovernanceStructure:
    """Analyze and represent a city's governance structure."""
    
    def __init__(self, city: str, state: str):
        self.city = city
        self.state = state
        self.governance_type: Optional[str] = None  # "mayor-council", "council-manager", etc.
        self.council_size: Optional[int] = None
        self.council_structure: Optional[str] = None  # "district-only", "mixed", "at-large"
        self.key_position: Optional[str] = None  # "mayor" or "city-manager"
        
    def analyze(self) -> Dict:
        """Research the city's governance structure."""
        print(f"Analyzing governance structure for {self.city}, {self.state}...")
        
        # Search for governance structure
        query = f"{self.city} {self.state} city government structure mayor council"
        result = web_scraper.search(query, num_results=3)
        
        if result.get("snippet"):
            # Parse governance type from search results
            text = result["snippet"].lower()
            if "council-manager" in text:
                self.governance_type = "council-manager"
                self.key_position = "city-manager"
            elif "mayor-council" in text or "mayor" in text.split()[0:3]:
                self.governance_type = "mayor-council"
                self.key_position = "mayor"
            else:
                self.governance_type = "unknown"
                self.key_position = "mayor"  # default assumption
        
        # Search for council structure
        query = f"{self.city} city council districts at-large seats"
        result = web_scraper.search(query, num_results=3)
        
        if result.get("snippet"):
            text = result["snippet"].lower()
            # Look for seat counts
            import re
            seats = re.findall(r'(\d+)\s+seats', text)
            if seats:
                self.council_size = int(seats[0])
            
            # Look for district vs at-large
            if "district" in text and "at-large" in text:
                self.council_structure = "mixed"
            elif "at-large" in text:
                self.council_structure = "at-large"
            else:
                self.council_structure = "district-only"
        
        return self.to_dict()
    
    def to_dict(self) -> Dict:
        return {
            "city": self.city,
            "state": self.state,
            "governance_type": self.governance_type,
            "council_size": self.council_size,
            "council_structure": self.council_structure,
            "key_position": self.key_position
        }


class CharacterResearcher:
    """Research local climate leaders and sustainability activists."""
    
    def __init__(self, city: str, state: str):
        self.city = city
        self.state = state
        
    def search_climate_activists(self) -> List[Dict]:
        """Find local climate activists and sustainability leaders."""
        print(f"\nSearching for climate activists in {self.city}...")
        
        queries = [
            f"{self.city} climate activist leader",
            f"{self.city} sustainability organizer",
            f"{self.city} renewable energy advocate",
            f"{self.city} community organizer environmental justice"
        ]
        
        characters = []
        for query in queries:
            result = web_scraper.search(query, num_results=5)
            if result.get("results"):
                for article in result["results"][:2]:
                    char = self._extract_character(article)
                    if char:
                        characters.append(char)
            
            # Small delay to be respectful
            time.sleep(1)
        
        # Deduplicate by name
        seen = set()
        unique_chars = []
        for char in characters:
            key = char["name"].lower()
            if key not in seen:
                seen.add(key)
                unique_chars.append(char)
        
        return unique_chars[:6]  # Return top 6 characters
    
    def search_solarpunk_movements(self) -> List[Dict]:
        """Find existing solarpunk/sustainability movements in the city."""
        print(f"\nSearching for solarpunk movements in {self.city}...")
        
        queries = [
            f"{self.city} community garden cooperative",
            f"{self.city} mutual aid network",
            f"{self.city} community land trust",
            f"{self.city} solar cooperative",
            f"{self.city} urban farming"
        ]
        
        movements = []
        for query in queries:
            result = web_scraper.search(query, num_results=3)
            if result.get("results"):
                for article in result["results"][:1]:
                    move = self._extract_movement(article)
                    if move:
                        movements.append(move)
            time.sleep(1)
        
        return movements
    
    # --- Character extraction helpers ---

    # Words that signal an organization, not a person
    _ORG_KEYWORDS = {
        "network", "coalition", "office", "initiative", "foundation",
        "institute", "center", "council", "committee", "alliance",
        "association", "society", "union", "federation", "board",
        "department", "agency", "authority", "commission", "project",
        "program", "collective", "cooperative", "corp", "inc", "llc",
        "sustainability", "climate", "energy", "renewable", "green",
        "solar", "environmental", "ecological", "conservation",
        # Government / institutional
        "county", "city", "state", "municipal", "metro", "regional",
        "district", "ward", "precinct",
        # Business-sounding adjectives rarely used as first names
        "sustainable", "simpl", "simplicity", "organic", "clean",
        "advanced", "future", "urban", "rural", "global",
    }

    # Words that signal a headline / article title, not a person name
    _HEADLINE_KEYWORDS = {
        "how", "why", "what", "when", "where", "who", "which",
        "their", "your", "this", "that", "the", "these",
        "could", "would", "should", "will", "does",
        "join", "join", "launch", "announces", "debuts", "unveils",
        "releases", "opens", "starts", "begins", "launches",
        "advocate", "advocates", "leader", "leaders", "activist", "activists",
        "community", "meeting", "event", "plan", "plans",
        "taking", "making", "building", "growing", "moving",
        "new", "first", "local", "state", "regional", "national",
    }

    def _is_valid_person_name(self, name: str) -> bool:
        """Return True if *name* looks like a real person's name."""
        words = name.strip().split()

        # Must be 2 or 3 words (First Last, or First Middle Last)
        if len(words) < 2 or len(words) > 3:
            return False

        # Every word must start with an uppercase letter followed by lowercase
        for w in words:
            if not re.match(r'^[A-Z][a-z]+$', w):
                return False

        # Reject if any word is an org keyword or headline keyword
        lower_words = {w.lower() for w in words}
        if lower_words & self._ORG_KEYWORDS:
            return False
        if lower_words & self._HEADLINE_KEYWORDS:
            return False

        return True

    def _extract_names_from_snippet(self, snippet: str) -> List[str]:
        """
        Use journalist-attribution regex patterns to pull person names
        out of a search-result snippet.  Returns a deduplicated list
        in the order they were found.
        """
        if not snippet:
            return []

        # Patterns designed to catch common attribution forms
        patterns = [
            # "...," said FIRST LAST
            r'"[^"]*",\s*said\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # said FIRST LAST,
            r'said\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # according to FIRST LAST
            r'according\s+to\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # FIRST LAST, a/an ROLE
            r'\b([A-Z][a-z]+\s+[A-Z][a-z]+),\s+(?:a|an)\s+',
            # FIRST LAST is the/a/an ROLE
            r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+is\s+(?:the\s+|a\s+|an\s+)',
            # FIRST LAST, director/organizer/activist/founder of
            r'\b([A-Z][a-z]+\s+[A-Z][a-z]+),\s+(?:director|organizer|activist|founder|coordinator|leader|researcher|manager|chair|president|CEO|advocate|coordinator)\b',
            # ...told FIRST LAST
            r'told\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # FIRST LAST said/told
            r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\s+(?:said|told)\b',
            # by FIRST LAST
            r'\bby\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
            # with FIRST LAST
            r'\bwith\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
        ]

        seen: set = set()
        names: List[str] = []

        for pattern in patterns:
            for m in re.finditer(pattern, snippet):
                candidate = m.group(1).strip()
                if candidate in seen:
                    continue
                if self._is_valid_person_name(candidate):
                    seen.add(candidate)
                    names.append(candidate)

        return names

    def _extract_context_around_name(self, snippet: str, name: str) -> str:
        """Return ~120 chars of snippet surrounding the first occurrence of *name*."""
        idx = snippet.find(name)
        if idx == -1:
            return snippet[:200]
        start = max(0, idx - 40)
        end = min(len(snippet), idx + 80)
        return snippet[start:end].strip()

    def _extract_character(self, article: Dict) -> Optional[Dict]:
        """Extract character info from an article."""
        title = article.get("title", "")
        snippet = article.get("snippet", "")
        url = article.get("url", "")

        # Skip generic Wikipedia/disambiguation pages
        if "disambiguation" in title.lower() or "list of" in title.lower():
            return None

        # --- Step 1: try to pull a person name from the snippet ---
        name = None
        names_from_snippet = self._extract_names_from_snippet(snippet)
        if names_from_snippet:
            name = names_from_snippet[0]

        # --- Step 2: fall back to the title, but only if it passes validation
        #          AND also appears in the snippet (proving it's discussed,
        #          not just a decorative title) ---
        if name is None:
            title_match = re.search(r'([A-Z][a-z]+\s+[A-Z][a-z]+)', title)
            if title_match and self._is_valid_person_name(title_match.group(1)):
                candidate = title_match.group(1)
                if candidate in snippet:
                    name = candidate

        if not name:
            return None

        # --- Step 3: derive role, org, neighborhood ---
        context = self._extract_context_around_name(snippet, name)
        role = self._extract_role(snippet, name)
        org = self._extract_organization(article, snippet, name)
        neighborhood = self._guess_neighborhood(article)

        return {
            "name": name,
            "role": role,
            "organization": org,
            "neighborhood": neighborhood,
            "url": url,
            "description": snippet[:200]
        }
    
    def _extract_role(self, snippet: str, name: str = None) -> str:
        """Extract role/title from snippet, preferring context near *name*."""
        # Look for common role patterns
        roles = [
            (r'founder(?:,| of)', 'founder'),
            (r'director(?: of|,)', 'director'),
            (r'organizer(?:,| for)', 'organizer'),
            (r'coordinator(?:,| of)', 'coordinator'),
            (r'activist(?:,| in)', 'activist'),
            (r'leader(?: of|,)', 'leader'),
            (r'researcher(?: at| for)', 'researcher'),
            (r'manager(?: at| of)', 'manager'),
            (r'advocate(?:,| for)', 'advocate'),
            (r'chair(?: of|,)', 'chair'),
            (r'president(?: of|,)', 'president'),
            (r'CEO(?:,| at)', 'CEO'),
        ]

        # If we know the person's name, focus on the text around them
        search_text = snippet
        if name:
            context = self._extract_context_around_name(snippet, name)
            # Search context first so nearby roles take priority
            search_text = context

        for pattern, role in roles:
            if re.search(pattern, search_text, re.IGNORECASE):
                return role

        # Fallback: search the full snippet
        if name:
            for pattern, role in roles:
                if re.search(pattern, snippet, re.IGNORECASE):
                    return role

        return "community leader"

    def _extract_organization(self, article: Dict, snippet: str, name: str = None) -> str:
        """Extract organization from article, trying snippet context first."""
        # Try to find an organization name near the person's name in the snippet
        if name:
            context = self._extract_context_around_name(snippet, name)
            # Common patterns: "...FirstName, ROLE at ORGANIZATION"
            # "...FirstName, ROLE of ORGANIZATION"
            org_patterns = [
                r'(?:at|of|for)\s+([A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){1,4})',
                r'"([^"]+)"',  # organization in quotes
            ]
            for pat in org_patterns:
                m = re.search(pat, context)
                if m:
                    candidate = m.group(1).strip()
                    # Make sure it doesn't match the person's own name
                    if candidate != name and len(candidate.split()) >= 2:
                        return candidate

        # Try URL domain as fallback
        if article.get("url"):
            from urllib.parse import urlparse
            domain = urlparse(article["url"]).netloc
            if domain.startswith("www."):
                domain = domain[4:]
            if domain not in ["wikipedia.org", "linkedin.com", "twitter.com"]:
                return domain.replace(".", " ").title()

        return "Local Organization"
    
    def _guess_neighborhood(self, article: Dict) -> str:
        """Guess which neighborhood the person is associated with."""
        title = article.get("title", "") + " " + article.get("snippet", "")
        
        # Look for neighborhood names in text
        # This is city-specific, so we'd need a mapping
        # For now, return empty string
        return ""
    
    def _extract_movement(self, article: Dict) -> Optional[Dict]:
        """Extract movement/organization info from an article."""
        title = article.get("title", "")
        snippet = article.get("snippet", "")
        url = article.get("url", "")
        
        # Skip Wikipedia lists
        if "list of" in title.lower() or "disambiguation" in title.lower():
            return None
        
        # Skip if too generic
        if len(title.split()) < 3:
            return None
        
        return {
            "name": title,
            "description": snippet[:150],
            "url": url,
            "type": self._categorize_movement(title, snippet)
        }
    
    def _categorize_movement(self, title: str, snippet: str) -> str:
        """Categorize the type of movement."""
        text = (title + " " + snippet).lower()
        
        if "garden" in text:
            return "community garden"
        elif "mutual aid" in text:
            return "mutual aid"
        elif "land trust" in text:
            return "community land trust"
        elif "solar" in text or "renewable" in text:
            return "renewable energy coop"
        elif "farming" in text or "farm" in text:
            return "urban farming"
        elif "cooperative" in text or "co-op" in text:
            return "worker cooperative"
        else:
            return "sustainability initiative"


class GovernanceCustomizer:
    """Generate governance-specific character roles."""
    
    @staticmethod
    def suggest_characters(governance: Dict, characters: List[Dict]) -> List[Dict]:
        """
        Based on governance structure, suggest which character roles would be
        most impactful/realistic.
        """
        gov_type = governance.get("governance_type", "")
        council_structure = governance.get("council_structure", "")
        
        suggestions = []
        
        # Council-manager governments often have less visible political conflict
        # Focus on community organizers and bureaucrats
        if gov_type == "council-manager":
            suggestions.append("city-planner")
            suggestions.append("tenant-union-organizer")
            suggestions.append("sustainability-director")
        
        # Mayor-council governments have more visible political dynamics
        if gov_type == "mayor-council":
            suggestions.append("mayor-ally")
            suggestions.append("opposition-councilor")
            suggestions.append("community-activist")
        
        # District-based systems benefit from neighborhood-level organizers
        if council_structure in ["district-only", "mixed"]:
            suggestions.append("neighborhood-association-leader")
            suggestions.append("district-representative")
        
        # At-large systems benefit from citywide movement leaders
        if council_structure in ["at-large", "mixed"]:
            suggestions.append("citywide-coalition-builder")
        
        return suggestions


def research_city(city: str, state: str, output_json: bool = False) -> Dict:
    """
    Main research function. Researches a city and returns structured data.
    """
    print(f"{'='*60}")
    print(f"Agentic City Research: {city}, {state}")
    print(f"{'='*60}")
    
    # Phase 1: Governance analysis
    governance = GovernanceStructure(city, state)
    gov_data = governance.analyze()
    
    # Phase 2: Character research
    researcher = CharacterResearcher(city, state)
    characters = researcher.search_climate_activists()
    movements = researcher.search_solarpunk_movements()
    
    # Phase 3: Governance-specific customization
    suggested_roles = GovernanceCustomizer.suggest_characters(gov_data, characters)
    
    # Phase 4: Generate output
    result = {
        "city": city,
        "state": state,
        "governance": gov_data,
        "characters": characters,
        "movements": movements,
        "suggested_roles": suggested_roles,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }
    
    # Output
    if output_json:
        print(json.dumps(result, indent=2))
    else:
        print(f"\n{'='*60}")
        print("RESEARCH SUMMARY")
        print(f"{'='*60}\n")
        
        print("GOVERNANCE STRUCTURE:")
        print(json.dumps(gov_data, indent=2))
        
        print(f"\nFOUND {len(characters)} POTENTIAL CHARACTERS:")
        for i, char in enumerate(characters, 1):
            print(f"\n{i}. {char['name']}")
            print(f"   Role: {char['role']}")
            print(f"   Organization: {char['organization']}")
            print(f"   Description: {char['description'][:100]}...")
            if char['url']:
                print(f"   Source: {char['url']}")
        
        print(f"\nFOUND {len(movements)} SOLARPUNK MOVEMENTS:")
        for move in movements[:5]:
            print(f"\n  - {move['name']} ({move['type']})")
            print(f"    {move['description'][:80]}...")
        
        print(f"\nSUGGESTED CHARACTER ROLES for {gov_data['governance_type']}:")
        for role in suggested_roles:
            print(f"  - {role}")
    
    # Save to file
    OUTPUT_DIR.mkdir(exist_ok=True)
    output_file = OUTPUT_DIR / f"{city.lower()}-{state.lower()}-research.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n✓ Research saved to: {output_file}")
    
    return result


def main():
    parser = argparse.ArgumentParser(description="Research a city for Solarpunk City Builder expansion")
    parser.add_argument("city", help="City name (e.g., 'Portland')")
    parser.add_argument("--state", required=True, help="State abbreviation (e.g., 'OR')")
    parser.add_argument("--json", action="store_true", help="Output as JSON instead of formatted text")
    
    args = parser.parse_args()
    
    try:
        result = research_city(args.city, args.state, output_json=args.json)
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
