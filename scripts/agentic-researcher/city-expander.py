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
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, List, Tuple, Optional

# Use the web scraper
sys.path.insert(0, str(Path(__file__).parent.parent / "web-scraper"))
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
    
    def _extract_character(self, article: Dict) -> Optional[Dict]:
        """Extract character info from an article."""
        title = article.get("title", "")
        snippet = article.get("snippet", "")
        url = article.get("url", "")
        
        # Skip generic Wikipedia/disambiguation pages
        if "disambiguation" in title.lower() or "list of" in title.lower():
            return None
        
        # Try to extract name from title (e.g., "Jane Smith - Portland Climate Leader")
        import re
        name_match = re.search(r'^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})', title)
        if not name_match:
            name_match = re.search(r'^([A-Z][a-z]+(?: [A-Z][a-z]+){1,3})', snippet)
        
        if not name_match:
            return None
        
        name = name_match.group(1)
        
        # Skip if name looks generic or incomplete
        if len(name.split()) < 2:
            return None
        
        # Extract role/organization from snippet
        role = self._extract_role(snippet)
        org = self._extract_organization(article, snippet)
        neighborhood = self._guess_neighborhood(article)
        
        return {
            "name": name,
            "role": role,
            "organization": org,
            "neighborhood": neighborhood,
            "url": url,
            "description": snippet[:200]
        }
    
    def _extract_role(self, snippet: str) -> str:
        """Extract role/title from snippet."""
        # Look for common role patterns
        roles = [
            (r'founder(?:,| of)', 'founder'),
            (r'director(?: of|,)', 'director'),
            (r'organizer(?:,| for)', 'organizer'),
            (r'coordinator(?:,| of)', 'coordinator'),
            (r'activist(?:,| in)', 'activist'),
            (r'leader(?: of|,)', 'leader'),
            (r'researcher(?: at| for)', 'researcher'),
            (r'manager(?: at| of)', 'manager')
        ]
        
        for pattern, role in roles:
            if re.search(pattern, snippet, re.IGNORECASE):
                return role
        
        return "community leader"
    
    def _extract_organization(self, article: Dict, snippet: str) -> str:
        """Extract organization from article."""
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
