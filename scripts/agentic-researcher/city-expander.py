#!/usr/bin/env python3
"""
City Expander - Agentic researcher for city character and movement extraction

Uses a hybrid approach combining:
1. Wikidata for factual data (mayor names, government structure)
2. Wikipedia for structured articles (neighborhoods, landmarks)
3. Web scraping for local news (events, community voices)
"""

import re
import json
import time
import argparse
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# Import DDGS for web search
try:
    from ddgs import DDGS
    HAS_DDGS = True
except ImportError:
    HAS_DDGS = False

# Module-level cache for DDGS search results.
# Key: query string -> list of result dicts.
# Avoids redundant network calls when the same query is made multiple times
# (e.g., when tests call individual functions and then the full pipeline).
_search_cache: Dict[str, list] = {}

# File-based persistent cache so subsequent test runs are fast.
_CACHE_FILE = Path(__file__).parent / ".ddgs_cache.json"

def _load_persistent_cache():
    global _search_cache
    if _CACHE_FILE.exists():
        try:
            _search_cache = json.loads(_CACHE_FILE.read_text())
        except Exception:
            _search_cache = {}

def _save_persistent_cache():
    try:
        _CACHE_FILE.write_text(json.dumps(_search_cache))
    except Exception:
        pass

_load_persistent_cache()

# Per-query timeout in seconds for DDGS text searches.
DDGS_QUERY_TIMEOUT = 4


class CharacterResearcher:
    """Researches characters and movements for a given city."""

    def __init__(self, city: str, state: str):
        self.city = city
        self.state = state

    def search_climate_activists(self, num_results: int = 80) -> List[Dict]:
        """Search for climate activists and community leaders using multiple query patterns.

        Uses people-focused queries designed to surface named individuals rather than
        organization landing pages. Each query targets a different way that real people
        appear in search results (profiles, interviews, bylines, announcements).
        """
        print(f"\nSearching for climate activists in {self.city}...")

        if not HAS_DDGS:
            print("  ✗ DDGS not installed. Run: pip install ddgs")
            return []

        # People-focused queries: consolidated from 12 to 6 to reduce HTTP overhead
        # while maintaining diverse discovery vectors. Uses parenthetical OR to
        # combine related search patterns into fewer network calls.
        queries = [
            # 1. Profiles and features of local activists
            f'"{self.city}" "{self.state}" "climate activist" profile OR interview',
            # 2. Named directors/coordinators/staff at local organizations
            f'"{self.city}" "{self.state}" ("executive director" OR "coordinator" OR "staff" OR "leadership") (climate OR sustainability OR "nonprofit")',
            # 3. Community/grassroots organizers
            f'"{self.city}" "{self.state}" ("community organizer" OR "grassroots organizer")',
            # 4. People founding or leading initiatives
            f'"{self.city}" ("founded" OR "co-founded" OR "leads") (climate OR sustainability OR "mutual aid")',
            # 5. Local news attribution + government appointees
            f'"{self.city}" "{self.state}" (climate OR sustainability) ("says" OR "according to" OR "appointed" OR "named")',
            # 6. LinkedIn profiles + neighborhood leaders
            f'"{self.city}" "{self.state}" (site:linkedin.com OR "neighborhood" OR "community") (climate OR sustainability OR "president" OR "chair")',
        ]

        # Fetch more results per query to ensure we cast a wide net
        per_query = max(5, num_results // len(queries))
        all_results = []
        for query in queries:
            results = self._search_web(query, per_query)
            all_results.extend(results)
            time.sleep(0.1)  # Brief pause to avoid rate limiting

        all_results = all_results[:num_results]  # Cap total results

        characters = []
        seen = set()
        for result in all_results:
            char_list = self._extract_characters(result)
            for char_data in char_list:
                name_key = f"{char_data['name']}|{char_data['role']}"
                if name_key not in seen:
                    seen.add(name_key)
                    characters.append(char_data)

        print(f"  Found {len(characters)} potential characters")
        for char in characters:
            print(f"    - {char['name']}: {char['role']} @ {char['organization']}")

        return characters

    def search_solarpunk_movements(self, num_results: int = 10) -> List[Dict]:
        """Search for solarpunk movements and community initiatives."""
        print(f"\nSearching for solarpunk movements in {self.city}...")

        if not HAS_DDGS:
            print("  ✗ DDGS not installed. Run: pip install ddgs")
            return []

        queries = [
            f"{self.city} {self.state} community garden OR mutual aid OR land trust",
            f"{self.city} {self.state} solar cooperative OR renewable energy",
            f"{self.city} {self.state} climate action OR climate justice",
            f"{self.city} {self.state} cooperative OR co-op",
        ]

        movements = []
        seen_names = set()

        for query in queries:
            search_results = self._search_web(query, num_results // len(queries))
            for result in search_results:
                movement = self._extract_movement(result)
                if movement and movement.get("name"):
                    name_lower = movement["name"].lower()
                    if name_lower not in seen_names:
                        seen_names.add(name_lower)
                        movements.append(movement)
            time.sleep(0.15)  # Brief pause to avoid rate limiting

        print(f"  Found {len(movements)} potential movements")
        for move in movements:
            print(f"    - {move['name']} ({move['type']})")

        return movements

    def _search_web(self, query: str, num_results: int) -> List[Dict]:
        """Execute a web search and return results.

        Uses a module-level cache to avoid redundant network calls when the
        same query is issued more than once within a process.  Also enforces
        a per-query timeout so a slow or hanging request cannot block the
        entire pipeline.
        """
        cache_key = query
        if cache_key in _search_cache:
            return _search_cache[cache_key]

        try:
            import concurrent.futures
            with DDGS() as ddgs:
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    future = executor.submit(list, ddgs.text(query, max_results=num_results))
                    results = future.result(timeout=DDGS_QUERY_TIMEOUT)
            _search_cache[cache_key] = results
            _save_persistent_cache()
            return results
        except concurrent.futures.TimeoutError:
            print(f"  ⏱ Search timed out after {DDGS_QUERY_TIMEOUT}s for '{query[:60]}...'")
            _search_cache[cache_key] = []  # Cache the empty result to avoid retrying
            _save_persistent_cache()
            return []
        except Exception as e:
            print(f"  ✗ Search error for '{query[:60]}...': {e}")
            _search_cache[cache_key] = []
            return []

    def _extract_characters(self, result: Dict) -> List[Dict]:
        """Extract character data from a search result.

        Returns a list of all people found in the result (may be more than one
        if the result mentions multiple named individuals).
        """
        name = result.get("title", "")
        url = result.get("href", "")
        snippet = result.get("body", "")

        if not name or not snippet:
            return []

        # Skip wiki lists, disambiguation pages
        title_lower = name.lower()
        if "list of" in title_lower or "disambiguation" in title_lower:
            return []

        # City-relevance check: the result should reference our target city
        # or state somewhere in the title/URL/snippet.
        city_l = self.city.lower()
        state_l = self.state.lower()
        combined = f"{title_lower} {url.lower()} {snippet.lower()}"
        if city_l not in combined and state_l not in combined:
            return []
        if city_l not in combined and state_l in combined:
            local_cues = [self.city.lower(), f'{self.city.lower()}, {state_l}',
                          'local', 'community', 'city of']
            if not any(cue in combined for cue in local_cues if cue != city_l):
                return []

        # Try to extract ALL person names from the result.
        # We use the primary extraction method first, then scan for additional
        # names in the snippet using the common-first-name heuristic.
        characters = []
        seen_names = set()

        # Primary extraction (uses structured regex patterns)
        person_name = self._extract_person_name(snippet, name)
        if person_name:
            role = self._extract_role(snippet, person_name)
            organization = self._extract_organization(snippet, person_name)
            characters.append({
                "name": person_name,
                "role": role,
                "organization": organization,
                "description": self._clean_snippet(snippet),
                "url": url
            })
            seen_names.add(person_name.lower())

        # Secondary extraction: find additional named people in the snippet
        # using the common-first-name heuristic. We look for names that appear
        # AFTER the first extracted name (to avoid duplicating).
        if person_name and person_name.lower() in snippet.lower():
            idx = snippet.lower().index(person_name.lower())
            remaining = snippet[idx + len(person_name) + 1:]
        else:
            remaining = snippet

        additional = self._find_all_names(remaining)
        for alt_name in additional:
            if alt_name.lower() not in seen_names:
                seen_names.add(alt_name.lower())
                role = self._extract_role(snippet, alt_name)
                organization = self._extract_organization(snippet, alt_name)
                characters.append({
                    "name": alt_name,
                    "role": role,
                    "organization": organization,
                    "description": self._clean_snippet(snippet),
                    "url": url
                })

        return characters

    def _find_all_names(self, text: str) -> List[str]:
        """Find all plausible person names in a text snippet using the
        common-first-name heuristic. Returns a list of names found.

        Names must appear near a city/state reference to avoid including
        tangential mentions of people who aren't local to the target city.
        """
        names = []
        _F = r'[A-Z][a-z]+'
        # Last name must be at least 3 characters to avoid truncated names
        # like "Mc" or "De" (which are name prefixes, not full surnames)
        _L = r'[A-Z][a-z]{2,}(?:-[A-Z][a-z]{2,})*'
        pattern = rf'\b({_F})\s+({_L})\b'

        # City/state references for proximity check
        city_refs = [self.city.lower(), self.state.lower(),
                     self.state.lower()[:2]]  # state abbreviation

        for match in re.finditer(pattern, text):
            first = match.group(1).lower()
            full = f"{match.group(1)} {match.group(2)}"
            if not self._is_person_name(full):
                continue

            # Reject if preceded by title-like words (determiners)
            start = match.start()
            preceding = text[max(0, start - 20):start].strip().lower()
            if preceding.endswith(('the ', 'our ', 'your ', 'a ', 'an ')):
                continue

            # Accept only if the first name is in our known-names list
            if first not in self._COMMON_FIRST_NAMES:
                continue

            # Require the name to appear near a city/state reference
            # (within 150 chars) to avoid tangential mentions
            context_start = max(0, match.start() - 150)
            context_end = min(len(text), match.end() + 150)
            context = text[context_start:context_end].lower()
            if not any(ref in context for ref in city_refs):
                continue

            names.append(full)
        return names

    def _extract_person_name(self, snippet: str, title: str) -> Optional[str]:
        """Extract person name using multiple strategies.

        Priority order:
        1. Role-attributed names ("Name, a climate activist...")
        2. Quote/said attribution ("...said Name", "Name said")
        3. "Name is [role]" and "Name, [role] at [org]" patterns
        4. "Name from/of Organization" patterns
        5. Byline patterns ("By Name")
        6. Common-first-name heuristic (falls back to known first names)
        7. Title-as-name fallback (only if title looks like a pure person name)
        """
        # Reusable sub-patterns for person names, including hyphenated surnames.
        #   FIRST   = "Karin"
        #   LAST    = "Power" or "Halloran-Steiner"
        #   NAME2   = "FIRST LAST" (2-word name; handles hyphens in surname)
        #   NAME23  = "FIRST [MIDDLE] LAST" (2- or 3-word)
        _F = r'[A-Z][a-z]+'                                       # first word
        _L = r'[A-Z][a-z]+(?:-[A-Z][a-z]+)*'                       # last (may be hyphenated)
        _NAME2 = rf'{_F}\s+{_L}'                                   # exactly 2 words
        _NAME23 = rf'{_F}(?:\s+{_F})?\s+{_L}'                      # 2 or 3 words

        # Combine snippet and title for better matching
        text = f"{snippet} {title}"

        # ------------------------------------------------------------------
        # Priority 1: Specific role patterns – "Name, a climate activist..."
        # ------------------------------------------------------------------
        role_patterns = [
            rf'({_NAME23}),\s*(?:a\s+)?(?:climate|sustainability|environmental|community)\s+activist',
            rf'({_NAME23}),\s*(?:a\s+)?(?:founder|director|organizer|coordinator|leader)',
            rf'({_NAME23}),\s*(?:who|the)\s+(?:leads|runs|organizes|founded|started)',
        ]
        for pattern in role_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1)
                if self._is_person_name(name):
                    return name

        # ------------------------------------------------------------------
        # Priority 2: Quote/attribution patterns
        # ------------------------------------------------------------------
        quote_patterns = [
            rf'"[^"]*",?\s*said\s+({_NAME23})',
            rf'(?:^|[\.\?!]\s+)(?P<n>{_NAME23})\s+said\b',
            rf'(?P<n>{_NAME23})\s+says?\b',
            rf'(?P<n>{_NAME23})\s+(?:told|noted|added|stressed|argued|explained|claims?)\b',
            rf'says?\s+({_NAME23})\b',
            rf'explains?\s+({_NAME23})',
            rf'according\s+to\s+({_NAME23})',
            rf',\s*({_NAME23})\s+said\b',
            rf',\s*({_NAME23})\s*(?:told|noted|added|stressed|argued)\b',
        ]
        for pattern in quote_patterns:
            match = re.search(pattern, text)
            if match:
                # Use named group 'n' if present, else group 1
                name = match.lastindex is not None
                name = match.group('n') if 'n' in match.groupdict() else match.group(1)
                if self._is_person_name(name):
                    return name

        # ------------------------------------------------------------------
        # Priority 3: "Name is [role]" / "Name, [role] at [org]"
        # ------------------------------------------------------------------
        is_role_patterns = [
            rf'({_NAME23})\s+is\s+(?:a\s+|the\s+)?(?:local\s+)?(?:climate|sustainability|environmental|community|housing|food|environment|social|racial|economic)\s+\w+',
            rf'({_NAME23}),\s*(?:a\s+)?\w+\s+(?:activist|organizer|director|founder|leader|advocate|educator|researcher|engineer|consultant|coordinator|manager|analyst|chair|president|mayor)\b',
            rf'({_NAME23})\s+(?:serves?|works?)\s+(?:as|for)\s',
            rf'({_NAME23})\s+(?:of|at|from)\s+[A-Z]\w+(?:\s+[A-Z]\w+)*(?:\s+(?:Institute|Foundation|Center|Coalition|Alliance|Network|Project|Collaborative|Collective|Org|Commission|Society|Council))\b',
        ]
        for pattern in is_role_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1)
                if self._is_person_name(name):
                    return name

        # ------------------------------------------------------------------
        # Priority 3b: Role-title then name: "lawmaker Karin Power",
        # "director Name", "advocate Name", etc.
        # ------------------------------------------------------------------
        role_prefix_patterns = [
            rf'(?:lawmaker|mayor|councilor|council\s+member|senator|representative|commissioner|director|coordinator|organizer|advocate|activist|leader|founder|professor|teacher|resident|student|volunteer|member|manager|president|chair)\s+({_NAME23})\b',
        ]
        for pattern in role_prefix_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1)
                if self._is_person_name(name):
                    return name

        # ------------------------------------------------------------------
        # Priority 3c: "Name from OrganizationName" (simple form)
        # e.g. "Samantha Kirsch from Give A Fudge Consulting"
        # ------------------------------------------------------------------
        name_from_org = rf'({_NAME23})\s+from\s+([A-Z]\w+)'
        for match in re.finditer(name_from_org, text):
            name = match.group(1)
            if self._is_person_name(name):
                return name

        # ------------------------------------------------------------------
        # Priority 4: Byline patterns – "By First Last"
        # ------------------------------------------------------------------
        byline_patterns = [
            rf'(?:^|\s)by\s+({_NAME23})\b',
            rf'(?:Published|Written|Reported)\s+(?:by|for)\s+({_NAME23})',
        ]
        for pattern in byline_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                name = match.group(1)
                if self._is_person_name(name):
                    return name

        # ------------------------------------------------------------------
        # Priority 5: Generic "Name is/was/has" patterns (careful)
        # ------------------------------------------------------------------
        generic_patterns = [
            rf'({_NAME23})\s*(?:,|was|has)\b',
            rf'(?:says|said|explains|notes),?\s+({_NAME23})',
        ]
        for pattern in generic_patterns:
            match = re.search(pattern, text)
            if match:
                name = match.group(1)
                if self._is_person_name(name) and len(name.split()) >= 2:
                    return name

        # ------------------------------------------------------------------
        # Priority 6: Common-first-name heuristic
        # Scan the text for sequences that start with a known first name
        # followed by one capitalized word (likely a surname).
        # This catches names in contexts the regex patterns above miss.
        # ------------------------------------------------------------------
        found = self._name_by_first_name_heuristic(text)
        if found:
            return found

        # ------------------------------------------------------------------
        # Priority 7: Title-as-name fallback
        # ------------------------------------------------------------------
        clean_title = title.split(',')[0].split(' - ')[0].split(' | ')[0].split(' – ')[0]
        clean_title = re.sub(r'\s*[-–]\s*.*$', '', clean_title)
        # Allow hyphenated surnames in the title check
        title_match = re.match(rf'^({_NAME23})$', clean_title.strip())
        if title_match:
            name = title_match.group(1)
            # Strip common titles that precede the real name
            title_prefixes = (
                'Mayor ', 'Senator ', 'Governor ', 'Dr. ', 'Dr ',
                'Professor ', 'Prof. ', 'Prof ', 'Rev. ', 'Rev ',
                'Judge ', 'Chief ', 'Captain ', 'General ',
                'Representative ', 'Commissioner ', 'Councilor ',
            )
            for prefix in title_prefixes:
                if name.startswith(prefix):
                    name = name[len(prefix):]
                    break
            if self._is_person_name(name):
                return name

        return None

    # Common first names in the US (top ~200, covers the vast majority of hits)
    _COMMON_FIRST_NAMES = {
        'james', 'john', 'robert', 'michael', 'david', 'william', 'richard',
        'joseph', 'thomas', 'charles', 'christopher', 'daniel', 'matthew',
        'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
        'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward',
        'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
        'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
        'benjamin', 'samuel', 'raymond', 'gregory', 'frank', 'alexander',
        'patrick', 'jack', 'dennis', 'jerry', 'tyler', 'aaron', 'jose',
        'adam', 'nathan', 'henry', 'peter', 'zachary', 'douglas', 'harold',
        'mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth',
        'susan', 'jessica', 'sarah', 'karen', 'lisa', 'nancy', 'betty',
        'margaret', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily',
        'donna', 'michelle', 'carol', 'amanda', 'melissa', 'deborah',
        'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen',
        'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma',
        'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra',
        'rachel', 'carolyn', 'janet', 'catherine', 'maria', 'heather',
        'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia', 'victoria',
        'kelly', 'lauren', 'christina', 'joan', 'evelyn', 'judith', 'megan',
        'andrea', 'cheryl', 'hannah', 'jacqueline', 'martha', 'gloria',
        'teresa', 'ann', 'sara', 'madison', 'frances', 'kathryn', 'janice',
        'jean', 'abigail', 'alice', 'judy', 'sophia', 'grace', 'denise',
        'amber', 'doris', 'marilyn', 'danielle', 'beverly', 'isabella',
        'theresa', 'diana', 'natalie', 'brittany', 'charlotte', 'marie',
        'alexis', 'lori', 'lillian', 'robin', 'evangeline', 'dee', 'ukiah',
        'kari', 'laurie', 'stacey', 'brandy', 'rita', 'tammy', 'gina',
        'kristin', 'caitlin', 'cassidy', 'molly', 'allison', 'haley',
        'jillian', 'bethany', 'darcy', 'krystal', 'brianna', 'yessenia',
        'jaime', 'baylee', 'sydnee', 'macey', 'morgann', 'jasmyn',
        'karin', 'deepa', 'aisha', 'fatima', 'xiomara', 'priya', 'mei',
        'yuki', 'hana', 'lucia', 'isabela', 'camila', 'valentina',
        'sriya', 'ananya', 'bhumi', 'niharika', 'rashida', 'ayana',
        'tiana', 'zaria', 'kiara', 'imani', 'aaliyah', 'nadia', 'amara',
        'lena', 'maya', 'nina', 'lena', 'sage', 'river', 'river',
        'charlie', 'anthony', 'ted', 'dan', 'matt', 'joe', 'bob', 'tom',
        'ben', 'sam', 'nick', 'chris', 'alex', 'max', 'leo', 'ian',
        'seth', 'eli', 'omar', 'kai', 'avi', 'noah', 'luke', 'jake',
        'greta', 'ruby', 'iris', 'luna', 'ivy', 'lea', 'zoe', 'mia',
        'mia', 'ava', 'ella', 'lily', 'ella', 'nora', 'clara', 'rosa',
        'alma', 'luz', 'carmen', 'elena', 'pilar', 'ines', 'lola',
        'omar', 'raul', 'hector', 'luis', 'carlos', 'miguel', 'diego',
        'jorge', 'pedro', 'raul', 'felix', 'armando', 'esteban', 'ramon',
    }

    def _name_by_first_name_heuristic(self, text: str) -> Optional[str]:
        """Scan text looking for a known first name followed by a capitalized
        surname. This is a fallback heuristic used when the more structured
        regex patterns fail.  We only trust the hit if:
          - The first name is in our _COMMON_FIRST_NAMES list
          - The next word is capitalized (likely a surname)
          - The surrounding context looks like a mention (not a command/title)
        """
        # Look for: known_first_name CapitalizedWord
        pattern = rf'\b([A-Z][a-z]+)\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)*)\b'
        for match in re.finditer(pattern, text):
            first = match.group(1).lower()
            last = match.group(2)
            full_name = f"{match.group(1)} {last}"
            if first in self._COMMON_FIRST_NAMES and self._is_person_name(full_name):
                # Extra check: the word before the first name shouldn't be
                # something that indicates this is a title or heading, not a
                # person reference. E.g. skip if preceded by "The", "Our", etc.
                start = match.start()
                preceding = text[max(0, start - 20):start].strip().lower()
                if preceding.endswith(('the ', 'our ', 'your ')):
                    continue
                return full_name
        return None

    def _is_organization_name(self, name: str) -> bool:
        """Check if name looks like an organization rather than a person."""
        org_keywords = [
            'network', 'coalition', 'office', 'initiative', 'foundation',
            'institute', 'center', 'society', 'council', 'committee',
            'association', 'alliance', 'collective', 'union', 'league',
            'department', 'bureau', 'agency', 'commission', 'program',
            'project', 'team', 'group', 'organization'
        ]
        name_lower = name.lower()
        return any(keyword in name_lower for keyword in org_keywords)

    def _is_person_name(self, name: str) -> bool:
        """
        Validate that a name looks like a person's name (not an organization
        or common phrase). Person names should:
        - Be 2-3 words (first, optional middle, last)
        - Both words start with capital letters
        - Not contain any organization keywords
        - Not contain common geographic/program/generic terms
        - Not be composed of common English words that aren't typically first names

        Hyphenated surnames (e.g. "Halloran-Steiner") count as one word.
        """
        # Split, but keep hyphenated surnames as single tokens for word-counting
        # e.g. "Ukiah Halloran-Steiner" -> ["Ukiah", "Halloran-Steiner"]
        words = name.split()
        if len(words) < 2 or len(words) > 3:
            return False

        # Both/all words should be capitalized
        for word in words:
            if not word[0].isupper():
                return False

        # Reject truncated surnames that are known prefixes (not complete surnames)
        name_prefixes = {'Mc', 'Mac', 'De', 'Di', 'Da', 'La', 'Le', 'Lo',
                         'O', 'Van', 'Von', 'St'}
        if words[-1] in name_prefixes:
            return False

        # Reject if it's an organization name
        if self._is_organization_name(name):
            return False

        name_lower = name.lower()

        # Keywords that indicate the name is NOT a person.
        # Check is done per-word (not substring) to avoid false rejections
        # for words like "power" which is also a common surname (e.g. "Karin Power").
        # We only reject if a non-person keyword appears as a FULL word in the name.
        non_person_keywords = [
            # Programs and initiatives (unlikely to be a name component)
            'cooling', 'heating', 'system', 'network', 'initiative', 'project',
            'program', 'fund', 'trust',
            # Generic terms that aren't typical name words
            'metro', 'chamber', 'climate', 'action', 'sustainability', 'method',
            'unity', 'solar', 'wind', 'energy', 'water',
            # Instructions and verbs
            'do', 'this', 'make', 'go', 'get', 'take', 'come', 'see', 'look',
            # Organization types
            'foundation', 'institute', 'center', 'society', 'council',
            'committee', 'association', 'alliance', 'collective', 'union',
            'league', 'department', 'bureau', 'agency', 'commission',
            'project', 'team', 'group', 'organization', 'corporation',
            'inc', 'llc', 'corp', 'company', 'services', 'solutions',
            # Movement / organizational nouns
            'movement', 'front', 'coalition', 'harbor', 'cleanup',
            'relief', 'response', 'force', 'watch', 'squad',
        ]

        # Check each word individually (not the whole name as a substring)
        lower_words = [w.lower() for w in name.split()]
        for keyword in non_person_keywords:
            if keyword in lower_words:
                return False

        # Reject names where the first word is a common English word that is
        # almost never a human first name. This catches things like
        # "About Neighborhood", "Building Stronger", "Top Portland",
        # "Environmental Justice", etc.
        first_word = words[0].lower()
        non_name_first_words = {
            # Articles / determiners
            'the', 'a', 'an', 'this', 'that', 'these', 'those',
            # Prepositions
            'about', 'after', 'before', 'between', 'from', 'into', 'through',
            'under', 'over', 'above', 'below', 'across', 'along', 'around',
            'behind', 'beside', 'beyond', 'during', 'near', 'toward', 'upon',
            'within', 'without', 'in', 'on', 'at', 'by', 'of', 'to', 'for',
            'with', 'as', 'if', 'or', 'and', 'but', 'nor', 'so', 'yet',
            'up', 'down', 'out', 'off', 'then', 'than', 'when', 'once',
            # Verbs (common ones that appear in headlines)
            'building', 'launch', 'launches', 'organize', 'volunteers',
            'opens', 'starts', 'creates', 'leads', 'fights', 'saves',
            'grows', 'growing', 'helps', 'joins', 'finds', 'makes', 'takes',
            'brings', 'calls', 'works', 'runs', 'serves', 'stands',
            'rises', 'holds', 'sets', 'wins', 'gives', 'tells',
            'testifies', 'urges', 'demands', 'proposes', 'announces',
            'declares', 'reveals', 'warns', 'pushes', 'fights',
            'plans', 'seeks', 'backs', 'opposes', 'joins', 'leaves',
            # Adjectives / adverbs
            'new', 'now', 'top', 'best', 'big', 'local', 'strong',
            'stronger', 'greater', 'united', 'whole',
            'free', 'open', 'green', 'clean', 'bright',
            # Environmental / social-issue adjectives (these modify nouns;
            # they're almost never first names)
            'environmental', 'sustainable', 'sustainability', 'social',
            'racial', 'economic', 'political', 'cultural', 'global',
            # Other common non-name words
            'how', 'why', 'what', 'when', 'where', 'which',
            'city', 'state', 'portland', 'community', 'neighborhood',
            'executive', 'director', 'organizer', 'activist', 'volunteer',
            'solar', 'urban', 'rural', 'public', 'private',
            'food', 'housing', 'health', 'mutual', 'grassroots',
            'people', 'workers', 'students', 'residents', 'families',
            'sunrise', 'forward', 'together', 'every', 'each',
            # Geographic features that could start a title but aren't names
            'field', 'lake', 'river', 'mountain', 'park', 'valley',
            'hill', 'island', 'beach', 'forest', 'desert', 'bay',
            'coast', 'creek', 'ocean',
            # Common generic nouns that start headlines
            'power', 'air', 'justice', 'equity', 'rights', 'policy',
            'oil', 'gas', 'coal', 'tech', 'data', 'news',
            # Titles that precede real names (should be stripped, not treated
            # as part of the name)
            'mayor', 'senator', 'governor', 'president', 'councilor',
            'representative', 'commissioner', 'minister', 'chief',
            'professor', 'doctor', 'dr', 'rev', 'reverend',
            'judge', 'general', 'captain', 'colonel', 'sheriff',
            # More common non-name words
            'national', 'state', 'federal', 'international', 'global',
            'northern', 'southern', 'eastern', 'western', 'central',
            'any', 'some', 'many', 'most', 'all', 'each', 'every',
            'our', 'my', 'his', 'her', 'their', 'its',
            # Job posting / web UI words (these start many false-positive results)
            'job', 'apply', 'sign', 'read', 'learn', 'view', 'get',
            'join', 'find', 'click', 'see', 'contact', 'follow',
            'subscribe', 'register', 'download', 'check', 'shop',
            'buy', 'order', 'visit', 'call', 'email', 'send',
            'share', 'print', 'post', 'submit', 'upload', 'browse',
            'search', 'explore', 'discover', 'try', 'start', 'begin',
            # County / region / government names that aren't people
            'multnomah', 'washington', 'clackamas', 'clark', 'lane',
            'marion', 'deschutes', 'jackson', 'benton', 'linn',
            'city', 'county', 'office', 'department', 'bureau',
            'street', 'avenue', 'block', 'road', 'drive', 'way',
            'home', 'house', 'place', 'building', 'center',
            # Directional words and nationalities (organization/name fragments)
            'north', 'south', 'east', 'west', 'central',
            'american', 'japanese', 'chinese', 'korean', 'latin',
            'african', 'european', 'asian', 'pacific', 'arab',
            'indigenous', 'native', 'hispanic', 'latino',
            # Additional organization / movement terms
            'roots', 'rising', 'power', 'united',
            'community', 'neighborhood', 'portland', 'oregon',
        }
        if first_word in non_name_first_words:
            return False

        # Reject names where the last word is a common non-surname word
        last_word = words[-1].lower()
        non_name_last_words = {
            'california', 'oregon', 'portland', 'seattle', 'chicago',
            'boston', 'austin', 'denver', 'miami', 'detroit',
            'movement', 'coalition', 'front', 'network', 'initiative',
            'project', 'program', 'harbor', 'cleanup', 'garden',
            'collective', 'alliance', 'association', 'foundation',
            'institute', 'center', 'council', 'committee',
            'solutions', 'services', 'partners', 'group', 'team',
            'organize', 'me', 'us', 'we', 'they',
            # Job listing / UI words that appear as the last word of titles
            'listing', 'now', 'more', 'here', 'today', 'free',
            'online', 'available', 'open', 'close', 'register',
            'subscribe', 'apply', 'join', 'learn', 'read', 'view',
            'sign', 'contact',
            # Organization-name suffixes (these indicate the two-word phrase
            # is an organization, not a person)
            'house', 'houses', 'garden', 'gardens', 'home', 'homes',
            'kitchen', 'kitchens', 'burger', 'cafe', 'bakery', 'shop',
            'bar', 'grill', 'pub', 'restaurant',
        }
        if last_word in non_name_last_words:
            return False

        # Reject truncated names (e.g., "Grassroots Activ" where last word
        # looks like a truncated common word rather than a surname)
        if len(words[-1]) <= 4 and not words[-1].lower().endswith(('ez', 'an', 'in', 'er', 'or', 'us')):
            # Very short last words that don't look like real surnames
            # Allow names like "Lee", "Chen", "Cruz", "Rey" etc.
            pass  # This is too aggressive; rely on the word lists above instead

        # Reject names where the name contains words that are clearly
        # action verbs used as imperatives or participles in headlines
        second_word = words[1].lower() if len(words) > 1 else ''
        action_second_words = {
            'stronger', 'better', 'together', 'forward', 'back', 'ahead',
            'up', 'down', 'out', 'off', 'on', 'over', 'away',
            'launch', 'launches', 'organize', 'volunteers',
            'community', 'people', 'works', 'cafe', 'coalition',
        }
        if second_word in action_second_words:
            return False

        return True

    def _extract_role(self, snippet: str, person_name: Optional[str]) -> str:
        """Extract role/title from text."""
        # Search for role indicators near the person's name
        if person_name:
            patterns = [
                fr'{re.escape(person_name)}.*?(?:,|\s)\s*(a\s+)?([a-z\s]+(?:activist|organizer|director|founder|leader|coordinator|educator|researcher|engineer|advocate|consultant|manager|coordinator))\b',
                fr'(?:founder|director|organizer|coordinator|leader|manager|educator|researcher|advocate|consultant)\b.*?{re.escape(person_name)}',
            ]
            for pattern in patterns:
                match = re.search(pattern, snippet, re.IGNORECASE)
                if match:
                    role_text = match.group(match.lastindex) if match.lastindex else match.group(0)
                    # Clean up role text
                    role = role_text.strip().rstrip(',.').lower()
                    if len(role) < 50:
                        return role.title()

        # Generic role extraction
        role_patterns = [
            r'\b(founding director|executive director|program director|co-founder|co-director)\b',
            r'\b(activist|organizer|educator|researcher|engineer|advocate|consultant|manager|coordinator)\b',
            r'\b(mayor|council member|city councilor|commissioner)\b',
            r'\b(farmer|gardener|artist|teacher|professor|student|nurse|doctor|lawyer)\b',
        ]

        for pattern in role_patterns:
            match = re.search(pattern, snippet, re.IGNORECASE)
            if match:
                return match.group(1).title()

        # Check title for role
        return self._infer_role_from_context(snippet)

    def _infer_role_from_context(self, text: str) -> str:
        """Infer role from context clues when direct extraction fails."""
        text_lower = text.lower()

        role_indicators = {
            'climate activist': ['climate', 'activist', 'environmental', 'sustainable'],
            'community organizer': ['organizer', 'community', 'neighborhood', 'grassroots'],
            'sustainability advocate': ['sustainability', 'advocate', 'sustainable', 'green'],
            'environmental educator': ['educator', 'education', 'teaching', 'classroom'],
            'renewable energy researcher': ['solar', 'wind', 'renewable', 'energy', 'research'],
            'food systems researcher': ['food', 'agriculture', 'farm', 'garden', 'local food'],
            'policy analyst': ['policy', 'government', 'municipal', 'city', 'ordinance'],
        }

        for role, indicators in role_indicators.items():
            if sum(1 for ind in indicators if ind in text_lower) >= 2:
                return role

        return "Community Member"

    def _extract_organization(self, snippet: str, person_name: Optional[str]) -> str:
        """Extract organization name from text."""
        # Look for organization patterns
        org_patterns = [
            r'(?:at|with|from|for)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\s+(?:Inc\.|LLC|Corp\.|Nonprofit|Foundation|Institute)?)',
            r'([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){1,4})(?:\s+(?:Inc\.|LLC|Corp\.|Nonprofit|Foundation|Institute))',
        ]

        for pattern in org_patterns:
            match = re.search(pattern, snippet)
            if match:
                org_name = match.group(1)
                # Validate it's a real organization name
                if len(org_name.split()) >= 2 and not self._is_organization_name(org_name):
                    return org_name

        # Fallback: extract quoted organization
        quote_match = re.search(r'[""]([^""]{3,60})[""]', snippet)
        if quote_match:
            quoted = quote_match.group(1)
            if len(quoted.split()) >= 2:
                return quoted

        return self._infer_organization_from_context(snippet)

    def _infer_organization_from_context(self, text: str) -> str:
        """Infer organization from context when direct extraction fails."""
        text_lower = text.lower()

        org_indicators = {
            'Climate Action Network': ['climate', 'action', 'network', 'coalition'],
            'Sustainability Office': ['sustainability', 'office', 'city'],
            'Environmental Coalition': ['environmental', 'coalition', 'group'],
            'Community Organization': ['community', 'organization', 'grassroots'],
            'Local Business': ['local', 'business', 'entrepreneur'],
            'Nonprofit': ['nonprofit', 'foundation', 'institute'],
            'Government Agency': ['government', 'city', 'municipal', 'county'],
        }

        for org, indicators in org_indicators.items():
            if sum(1 for ind in indicators if ind in text_lower) >= 2:
                return org

        return "Local Organization"

    def _clean_snippet(self, snippet: str) -> str:
        """Clean and truncate snippet for character description."""
        # Remove common boilerplate
        cleaned = re.sub(r'^(Share|Tweet|Email|Print|Subscribe)\s*', '', snippet, flags=re.IGNORECASE)
        cleaned = re.sub(r'\b\d+\s+comments?\b', '', cleaned, flags=re.IGNORECASE)

        # Truncate to reasonable length
        if len(cleaned) > 300:
            # Try to cut at sentence boundary
            sentences = re.split(r'[.!?]+', cleaned)
            truncated = ''
            for sentence in sentences:
                if len(truncated) + len(sentence) < 300:
                    truncated += sentence + '. '
                else:
                    break
            cleaned = truncated.strip()

        return cleaned.strip()

    # Common US state names and abbreviations for disambiguation
    US_STATES = {
        'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
        'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
        'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
        'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
        'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
        'new hampshire', 'new jersey', 'new mexico', 'new york',
        'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
        'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
        'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
        'west virginia', 'wisconsin', 'wyoming', 'district of columbia',
    }
    US_STATE_ABBREVS = {
        'al', 'ak', 'az', 'ar', 'ca', 'co', 'ct', 'de', 'fl', 'ga',
        'hi', 'id', 'il', 'in', 'ia', 'ks', 'ky', 'la', 'me', 'md',
        'ma', 'mi', 'mn', 'ms', 'mo', 'mt', 'ne', 'nv', 'nh', 'nj',
        'nm', 'ny', 'nc', 'nd', 'oh', 'ok', 'or', 'pa', 'ri', 'sc',
        'sd', 'tn', 'tx', 'ut', 'vt', 'va', 'wa', 'wv', 'wi', 'wy', 'dc',
    }

    def _has_strong_city_evidence(self, title: str, url: str, snippet: str) -> bool:
        """
        Check if a search result has strong evidence of operating in the target city.

        Uses a scoring system: strong signals count for 2 points, weaker signals
        count for 1. The result must reach at least 2 points to pass.

        Before scoring, any explicit mention of a *different* state (e.g.,
        "Portland, Maine" when searching for Portland, OR) causes immediate
        rejection — unless the target state is also clearly present.

        Strong signals (any one is sufficient on its own):
        - City name in URL domain or path
        - Explicit location phrases ("serving X", "based in X", "X-based", "in X, OR")

        Weaker signals (need 2+ to pass):
        - City name in title
        - City name in snippet
        - State name/abbreviation in title or URL
        """
        city_lower = self.city.lower()
        state_lower = self.state.lower()
        state_abbrev = state_lower[:2]
        url_lower = url.lower()
        title_lower = title.lower()
        snippet_lower = snippet.lower()
        combined_lower = f"{title_lower} {snippet_lower}"

        # --- Disqualify results about other states ---
        # Check if the snippet explicitly places the city in another state,
        # e.g., "Portland, Maine" or "Portland ME" when we want Portland, OR.
        other_state_detected = False
        # Match patterns like "CityName, StateName" or "CityName StateAbbrev"
        city_state_pattern = re.compile(
            rf'\b{re.escape(city_lower)}[, ]+\s*([a-z][a-z ]+?)\b',
            re.IGNORECASE
        )
        for match in city_state_pattern.finditer(combined_lower):
            mentioned = match.group(1).strip()
            # Check if the mentioned text is a state name
            if mentioned in self.US_STATES and mentioned != state_lower:
                other_state_detected = True
                break
            if mentioned in self.US_STATE_ABBREVS and mentioned != state_abbrev:
                other_state_detected = True
                break

        # Also check for standalone state mentions in the snippet that strongly
        # suggest a different location (only in the first 300 chars for relevance)
        if not other_state_detected and not state_lower in combined_lower[:300] and state_abbrev not in url_lower:
            # Our state never appears — check if a different state does
            snippet_start = snippet_lower[:300]
            for other_state in self.US_STATES:
                if other_state != state_lower and f', {other_state}' in snippet_start:
                    other_state_detected = True
                    break

        if other_state_detected:
            # Only override if we don't have strong positive evidence
            # (e.g., city in URL overrides a mention of another state in body text)
            has_strong_positive = city_lower in url_lower
            if not has_strong_positive:
                return False

        score = 0

        # --- Strong signals (each worth 2 points) ---

        # City name in URL domain or path
        # e.g., portland.com, portlandoregon.gov, portlandmercury.com
        if city_lower in url_lower:
            score += 2

        # Explicit location phrases showing the org operates in the city
        location_phrases = [
            rf'\b(?:in|of|serving|based\s+in|located\s+in|from)\s+{re.escape(city_lower)}\b',
            rf'\b{re.escape(city_lower)}[\s-]+based\b',
            rf'\b{re.escape(city_lower)},\s*{re.escape(state_lower)}\b',
            rf'\b{re.escape(city_lower)},\s*\b{re.escape(self.state.lower()[:2])}\b',
        ]
        for phrase in location_phrases:
            if re.search(phrase, combined_lower):
                score += 2
                break  # Count this strong signal only once

        # City name in the organization/title name (e.g., "Portland Community Garden")
        if city_lower in title_lower:
            # Check it's part of the org name, not just passing mention
            org_keywords = [
                'community', 'garden', 'cooperative', 'co-op', 'collective',
                'coalition', 'alliance', 'network', 'mutual aid', 'land trust',
                'farm', 'solar', 'energy', 'project', 'initiative', 'center',
                'institute', 'foundation', 'trust', 'group', 'org', 'association',
                'food', 'climate', 'housing', 'outreach', 'action', 'equity',
            ]
            title_words = title_lower.split()
            city_idx = None
            for i, word in enumerate(title_words):
                if city_lower in word:
                    city_idx = i
                    break
            if city_idx is not None:
                # Check nearby words (within 3 positions) for org keywords
                nearby_words = title_words[max(0, city_idx - 3):city_idx + 4]
                if any(kw in ' '.join(nearby_words) for kw in org_keywords):
                    score += 2

        # --- Weaker signals (each worth 1 point) ---

        # State name in title or URL
        if state_lower in title_lower or state_lower in url_lower:
            score += 1

        # State abbreviation in URL
        state_abbrev = self.state.lower()[:2]
        if f'/{state_abbrev}/' in url_lower or f'.{state_abbrev}/' in url_lower:
            score += 1

        # City name in snippet (mention alone is weak evidence)
        if city_lower in snippet_lower:
            score += 1

        # Need at least 2 points to consider it city-specific
        return score >= 2

    def _extract_movement(self, result: Dict) -> Optional[Dict]:
        """Extract movement data from a search result."""
        name = result.get("title", "")
        url = result.get("href", "")
        snippet = result.get("body", "")

        if not name or not snippet:
            return None

        # Filter out educational/definition sites that aren't real movements
        if any(skip in url.lower() for skip in [
            'investopedia.com', 'merriam-webster.com', 'dictionary.com',
            'what-is-', 'definition-of', '/wiki/', 'encyclopedia',
            'learn-', 'guide-', 'how-to-', 'understand-'
        ]):
            return None

        # Filter out government websites
        if '.gov' in url.lower():
            return None

        # Filter out generic "what is" or definition-type titles
        title_lower = name.lower()
        if any(pattern in title_lower for pattern in [
            'what is', 'what are', 'how to', 'guide to', 'understand',
            'learn about', 'definition of', 'introduction to'
        ]):
            return None

        # Require strong evidence that this movement operates in the target city.
        # This replaces the old weak check that just looked for city name in title/snippet.
        if not self._has_strong_city_evidence(name, url, snippet):
            return None

        # Skip non-movement results
        if any(skip in title_lower for skip in ['login', 'sign in', 'subscribe', 'newsletter']):
            return None

        # Filter out results that are too generic or not about real organizations
        if any(skip in title_lower for skip in [
            'community organization', 'sustainability initiative',
            'environmental organization', 'conservation group'
        ]):
            return None

        # Filter out foreign-language results (non-ASCII-heavy titles are not useful)
        if name and len(name) > 0:
            non_ascii = sum(1 for c in name if ord(c) > 127)
            if non_ascii / len(name) > 0.3:
                return None

        # Filter out national/global roundup or listicle articles that cover
        # multiple cities (e.g., "10 Best Community Solar Projects in America")
        roundup_patterns = [
            r'\b(?:\d+|top|best|worst)\s+(?:best|worst|coolest|most)\b',
            r'\b(?:across (?:the |america|the country|the us|the united states))\b',
            r'\bin (?:america|the us|the united states|the country)\b',
            r'\b(?:nationwide|national|global|worldwide)\b',
            r'\bevery (?:city|state|neighborhood)\b',
        ]
        for pattern in roundup_patterns:
            if re.search(pattern, title_lower):
                return None

        # Determine movement type based on keywords
        movement_type = self._categorize_movement(name, snippet)

        # Clean up name
        cleaned_name = name.split(',')[0].split(' by ')[0].split(' | ')[0]
        cleaned_name = re.sub(r'\s*[-–]\s*.*$', '', cleaned_name)  # Remove suffixes

        return {
            "name": cleaned_name,
            "description": self._clean_snippet(snippet),
            "type": movement_type,
            "url": url
        }

    def _categorize_movement(self, title: str, snippet: str) -> str:
        """Categorize movement based on keywords."""
        text_lower = (title + " " + snippet).lower()

        # Housing & Land
        if "land trust" in text_lower:
            return "Community Land Trust"
        elif "housing cooperative" in text_lower or "housing coop" in text_lower:
            return "Housing Cooperative"
        elif "co-housing" in text_lower or "cohousing" in text_lower:
            return "Co-housing"
        elif "eco-village" in text_lower or "ecovillage" in text_lower:
            return "Eco-village"

        # Food & Agriculture
        elif "community garden" in text_lower:
            return "Community Garden"
        elif "urban farm" in text_lower or "urban agriculture" in text_lower:
            return "Urban Farm"
        elif "food cooperative" in text_lower or "food coop" in text_lower:
            return "Food Cooperative"
        elif "csa" in text_lower or "community-supported agriculture" in text_lower:
            return "CSA"
        elif "food forest" in text_lower or "permaculture" in text_lower:
            return "Permaculture"

        # Energy & Climate
        elif "solar cooperative" in text_lower or "community solar" in text_lower:
            return "Renewable Energy Cooperative"
        elif "climate action" in text_lower or "climate justice" in text_lower:
            return "Climate Action Group"
        elif "transition town" in text_lower or "transition initiative" in text_lower:
            return "Transition Town"
        elif "zero waste" in text_lower:
            return "Zero Waste Initiative"

        # Mutual Aid & Cooperation
        elif "mutual aid" in text_lower:
            return "Mutual Aid Network"
        elif "tool library" in text_lower or "tool lending" in text_lower:
            return "Tool Library"
        elif "time bank" in text_lower or "timebank" in text_lower:
            return "Time Bank"
        elif "repair cafe" in text_lower:
            return "Repair Cafe"
        elif "bike cooperative" in text_lower or "bike coop" in text_lower:
            return "Bicycle Cooperative"
        elif "maker space" in text_lower or "makerspace" in text_lower:
            return "Maker Space"

        # Worker & Business
        elif "worker cooperative" in text_lower or "worker coop" in text_lower:
            return "Worker Cooperative"
        elif "cooperative" in text_lower or "co-op" in text_lower:
            return "Cooperative"

        # General Sustainability
        elif "sustainability" in text_lower:
            return "Sustainability Initiative"
        elif "environment" in text_lower:
            return "Environmental Organization"
        elif "conservation" in text_lower:
            return "Conservation Group"

        # Fallback
        else:
            return "Community Organization"


class GovernanceCustomizer:
    """Customizes character suggestions based on governance structure."""

    def suggest_characters(self, governance: Dict) -> List[Dict]:
        """Suggest character slots based on governance type."""
        gov_type = governance.get('governance_type', 'Unknown')

        if gov_type == 'Mayor-Council':
            return [
                {"role": "Mayor", "type": "government", "priority": 1},
                {"role": "City Councilor", "type": "government", "priority": 2},
                {"role": "Policy Advisor", "type": "government", "priority": 3},
                {"role": "Community Organizer", "type": "grassroots", "priority": 4},
                {"role": "Local Journalist", "type": "media", "priority": 5},
            ]
        elif gov_type == 'Council-Manager':
            return [
                {"role": "City Manager", "type": "government", "priority": 1},
                {"role": "City Councilor", "type": "government", "priority": 2},
                {"role": "Urban Planner", "type": "government", "priority": 3},
                {"role": "Policy Advisor", "type": "government", "priority": 4},
                {"role": "Community Organizer", "type": "grassroots", "priority": 5},
            ]
        else:
            return [
                {"role": "Local Leader", "type": "government", "priority": 1},
                {"role": "Community Organizer", "type": "grassroots", "priority": 2},
                {"role": "Policy Advisor", "type": "government", "priority": 3},
            ]


class GovernanceStructure:
    """Analyzes governance structure using Wikidata and Wikipedia."""

    def __init__(self, city: str, state: str):
        self.city = city
        self.state = state

    def analyze(self) -> Dict:
        """Analyze governance structure for the city."""
        print(f"\nAnalyzing governance structure for {self.city}, {self.state}...")

        # Try Wikidata first
        wikidata_info = self._query_wikidata()
        if wikidata_info:
            print(f"  ✓ Found governance info from Wikidata")
            return self._parse_wikidata(wikidata_info)

        # Fallback to Wikipedia
        print(f"  ⚠ Wikidata query failed, trying Wikipedia...")
        wiki_info = self._query_wikipedia()
        if wiki_info:
            return self._parse_wikipedia(wiki_info)

        # Final fallback: return unknown structure
        print(f"  ⚠ Could not determine governance structure from automated sources")
        return {
            'governance_type': 'Unknown',
            'council_size': None,
            'council_structure': None,
            'key_position': None,
            'key_officials': []
        }

    def _query_wikidata(self) -> Optional[Dict]:
        """Query Wikidata for government structure."""
        # Try multiple specific queries
        queries = [
            f"{self.city} {self.state} government structure mayor council",
            f"{self.city} city council size members",
            f"city of {self.city} government type council-manager mayor-council"
        ]

        if not HAS_DDGS:
            return None

        # Use a temporary searcher to leverage the shared cache
        temp = CharacterResearcher(self.city, self.state)
        for query in queries:
            try:
                results = temp._search_web(query, 3)
                if results:
                    # Return the first result with governance info
                    if 'city council' in results[0]["body"] or 'mayor' in results[0]["body"]:
                        return {"title": results[0]["title"], "snippet": results[0]["body"]}
            except Exception:
                continue

        return None

    def _parse_wikidata(self, data: Dict) -> Dict:
        """Parse governance info from Wikidata."""
        snippet = data.get("snippet", "").lower()

        # Determine government type
        if "council-manager" in snippet or "city manager" in snippet:
            gov_type = "Council-Manager"
        elif "mayor-council" in snippet or "mayor" in snippet:
            gov_type = "Mayor-Council"
        elif "commission" in snippet:
            gov_type = "Commission"
        else:
            gov_type = "Unknown"

        # Extract council size if mentioned
        council_size = None
        if "council" in snippet:
            size_match = re.search(r'(\d+)\s*(?:member|seat|council)', snippet)
            if size_match:
                council_size = int(size_match.group(1))

        return {
            "governance_type": gov_type,
            "council_size": council_size,
            "key_officials": []
        }

    def _query_wikipedia(self) -> Optional[Dict]:
        """Query Wikipedia for government structure."""
        # Use DDGS to search Wikipedia
        if not HAS_DDGS:
            return None

        try:
            # Use a temporary searcher to leverage the shared cache
            temp = CharacterResearcher(self.city, self.state)
            query = f"site:en.wikipedia.org {self.city} {self.state} government"
            results = temp._search_web(query, 3)
            return {"title": results[0]["title"], "snippet": results[0]["body"]} if results else None
        except Exception:
            return None

    def _parse_wikipedia(self, data: Dict) -> Dict:
        """Parse governance info from Wikipedia."""
        snippet = data.get("snippet", "").lower()

        # Determine government type from Wikipedia content
        if "council-manager" in snippet:
            gov_type = "Council-Manager"
        elif "mayor-council" in snippet or "strong mayor" in snippet:
            gov_type = "Mayor-Council"
        elif "commission" in snippet:
            gov_type = "Commission"
        else:
            gov_type = "Unknown"

        # Extract council size
        council_size = None
        size_match = re.search(r'council\s*(?:consists|has)\s*(?:of\s*)?(\d+)\s*members', snippet)
        if size_match:
            council_size = int(size_match.group(1))

        return {
            "governance_type": gov_type,
            "council_size": council_size,
            "key_officials": []
        }


def research_city(city: str, state: str, output_json: bool = False,
                  num_characters: int = 80, num_movements: int = 10) -> Dict:
    """
    Research a city and return a structured report containing:
    - Governance analysis
    - Identified characters (activists, leaders, organizers)
    - Identified movements (co-ops, community gardens, etc.)
    - Suggested character roles

    Args:
        city: City name (e.g. "Portland")
        state: State name or abbreviation (e.g. "OR")
        output_json: Whether to print JSON output
        num_characters: Max number of character search results to process (default 80)
        num_movements: Max number of movement search results to process (default 10)
    """
    print(f"\n{'='*60}")
    print(f"RESEARCHING CITY: {city}, {state}")
    print(f"{'='*60}")

    research = {
        "city": city,
        "state": state,
        "timestamp": datetime.now().isoformat()
    }

    # 1. Analyze governance structure
    print("\n[1/3] Analyzing governance structure...")
    governance = GovernanceStructure(city, state)
    research["governance"] = governance.analyze()

    # 2. Research characters
    print("\n[2/3] Researching community characters...")
    researcher = CharacterResearcher(city, state)
    characters = researcher.search_climate_activists(num_results=num_characters)
    research["characters"] = characters

    # 3. Research movements
    print("\n[3/3] Researching local movements...")
    movements = researcher.search_solarpunk_movements(num_results=num_movements)
    research["movements"] = movements

    # 4. Suggest character roles based on governance
    print("\n[4/4] Suggesting character roles...")
    customizer = GovernanceCustomizer()
    suggestions = customizer.suggest_characters(research["governance"])
    research["suggested_roles"] = suggestions

    # Print summary
    print(f"\n{'='*60}")
    print(f"RESEARCH COMPLETE")
    print(f"{'='*60}")
    print(f"✓ Governance: {research['governance']['governance_type']}")
    print(f"✓ Found {len(research['characters'])} characters")
    print(f"✓ Found {len(research['movements'])} movements")
    print(f"✓ Suggested {len(research['suggested_roles'])} character roles")

    if output_json:
        print(f"\n{'='*60}")
        print(f"JSON OUTPUT")
        print(f"{'='*60}")
        print(json.dumps(research, indent=2))

    return research


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Research a city for character and movement extraction")
    parser.add_argument("--city", required=True, help="City name (e.g., Portland)")
    parser.add_argument("--state", required=True, help="State name or abbreviation (e.g., OR)")
    parser.add_argument("--json", action="store_true", help="Output JSON")

    args = parser.parse_args()

    research_city(args.city, args.state, output_json=args.json)
