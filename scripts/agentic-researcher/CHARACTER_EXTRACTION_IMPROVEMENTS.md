# Character Name Extraction Improvements

## Problem Statement

The current `_extract_character()` method in `city-expander.py` extracts organizational names and generic descriptions instead of individual names of real local climate leaders.

**Current behavior:**
```python
# Returns organization names like:
{
  "name": "Sustainable Simplicity",
  "role": "community leader",
  "organization": "Sustainablesimplicityorganizing Com"
}
```

**Expected behavior:**
```python
# Should return individual names like:
{
  "name": "Adah Crandall",
  "role": "organizer",
  "organization": "Portland Bureau of Transportation"
}
```

## Root Causes

1. **DDGS returns page metadata, not article content**
   - Search results give titles/descriptions from homepages
   - Homepages feature organizations, not individuals
   - Need to fetch actual news articles to find people

2. **No journalist attribution pattern matching**
   - Articles contain patterns like "said organizer Maria Garcia" or "according to resident John Smith"
   - Current implementation doesn't look for these patterns
   - Result: captures organizational keywords instead

3. **No filtering for organizational vs individual names**
   - "Sustainable Simplicity" contains words like "Sustainability" (organizational)
   - Real names follow human name patterns (First Last, often with middle initial)
   - Need heuristics to distinguish org names from person names

4. **No content scraping from search result URLs**
   - DDGS returns URL but we don't fetch it
   - Need to scrape the actual article to find named individuals
   - Rate limiting concerns with DDGS (need to respect limits)

## Solution Plan

### Phase 1: Implement Article Content Fetching

**Task:** Add `fetch_search_result_content()` method to `city-expander.py`

**Implementation:**
```python
def fetch_search_result_content(self, url: str) -> str:
    """Fetch full article content from search result URL."""
    try:
        response = requests.get(url, headers=self.headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove nav, footer, sidebar
        for element in soup.find_all(['nav', 'footer', 'aside', 'header']):
            element.decompose()
        
        # Extract main content (article, .content, main)
        content = soup.find(['article', 'main', {'class': 'content'}])
        if content:
            return content.get_text()
        
        return soup.get_text()[:5000]  # Fallback: first 5000 chars
    except Exception as e:
        print(f"  Error fetching {url}: {e}")
        return ""
```

**Acceptance criteria:**
- [ ] Successfully fetches article content from 80%+ of search result URLs
- [ ] Handles 404s, timeouts, blocked sites gracefully
- [ ] Respects rate limits (sleep between requests)
- [ ] Returns cleaned text (no HTML tags)

---

### Phase 2: Implement Attribution Pattern Matching

**Task:** Add `extract_names_from_article()` method with journalist attribution patterns

**Patterns to detect:**
```python
PATTERNS = [
    # "said organizer Maria Garcia"
    r'said\s+[\w\s]+?\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
    
    # "according to [Name], [role]"
    r'according\s+to\s+([A-Z][a-z]+\s+[A-Z][a-z]+),\s+[\w\s]+',
    
    # "[Name], [role] and [role]"
    r'([A-Z][a-z]+\s+[A-Z][a-z]+),\s+[\w\s]+and[\w\s]+',
    
    # "[Name] is a [role]"
    r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+is\s+a\s+[\w\s]+',
    
    # "[Name] is the [title] of [org]"
    r'([A-Z][a-z]+\s+[A-Z][a-z]+)\s+is\s+the\s+[\w\s]+of',
    
    # Quote attribution: "[Quote]," says [Name]
    r'"[^"]+",\s+says\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
    
    # Quote attribution: "[Name]" said
    r'""[^"]+",\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+said',
]
```

**Implementation:**
```python
def extract_names_from_article(self, text: str) -> list[str]:
    """Extract individual names from article text using attribution patterns."""
    names = []
    
    for pattern in PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        names.extend(matches)
    
    # Deduplicate and filter
    unique_names = list(set(names))
    
    # Filter out organizational names
    filtered = [n for n in unique_names if not self._is_organizational_name(n)]
    
    return filtered

def _is_organizational_name(self, name: str) -> bool:
    """Heuristic: is this an organization name rather than a person name?"""
    org_keywords = [
        'Institute', 'Coalition', 'Network', 'Organization',
        'Foundation', 'Association', 'Council', 'Committee',
        'Fund', 'Project', 'Initiative', 'Center', 'Collective'
    ]
    
    name_lower = name.lower()
    
    # Check for organizational keywords
    if any(keyword.lower() in name_lower for keyword in org_keywords):
        return True
    
    # Check for wordy patterns (organizations often have 3+ words)
    if len(name.split()) > 3:
        return True
    
    # Check for non-name patterns (all caps, special chars)
    if name.isupper() or name.islower():
        return True
    
    return False
```

**Acceptance criteria:**
- [ ] Detects names in 60%+ of articles tested
- [ ] Filters out organizational names with 90%+ accuracy
- [ ] Handles common attribution patterns (said, according to, is a)
- [ ] Returns unique, deduplicated names

---

### Phase 3: Update main character extraction flow

**Task:** Modify `search_climate_activists()` to use new extraction methods

**Changes:**
```python
def search_climate_activists(self) -> list[dict]:
    """Updated flow: search → fetch articles → extract names → build characters"""
    
    search_results = self.web_scraper.search(f"{self.city} climate activists", max_results=10)
    characters = []
    
    for result in search_results['results']:
        # Fetch full article content
        article_text = self.fetch_search_result_content(result['url'])
        
        if not article_text:
            continue
        
        # Extract names from article
        names = self.extract_names_from_article(article_text)
        
        for name in names:
            # Build character profile
            character = {
                'name': name,
                'role': self._infer_role(article_text, name),
                'organization': self._infer_organization(article_text, name),
                'issues': self._infer_issues(article_text, name),
                'source_url': result['url']
            }
            
            # Validate character (not fictional, not org name)
            if self._validate_character(character):
                characters.append(character)
    
    # Deduplicate by name
    seen = set()
    unique_chars = []
    for char in characters:
        if char['name'] not in seen:
            seen.add(char['name'])
            unique_chars.append(char)
    
    return unique_chars
```

**Acceptance criteria:**
- [ ] Returns individual names (not organizations)
- [ ] Each character has inferred role, organization, issues
- [ ] Deduplication works across multiple articles
- [ ] Handles errors gracefully (broken URLs, blocked sites)

---

### Phase 4: Add validation layer

**Task:** Implement `_validate_character()` to filter false positives

**Validation rules:**
```python
def _validate_character(self, character: dict) -> bool:
    """Validate that this is a real person, not a fictional name or org."""
    
    name = character['name']
    
    # Rule 1: Must be 2-3 words (First Last, First Middle Last)
    words = name.split()
    if len(words) < 2 or len(words) > 3:
        return False
    
    # Rule 2: All words must be title case (no all-caps or all-lower)
    if not all(word.istitle() for word in words):
        return False
    
    # Rule 3: Not a common fictional name (John Doe, Jane Smith)
    fictional_names = {'John Doe', 'Jane Doe', 'John Smith', 'Jane Smith'}
    if name in fictional_names:
        return False
    
    # Rule 4: At least one attribution context (role or organization inferred)
    if not character.get('role') and not character.get('organization'):
        return False
    
    # Rule 5: Name should appear near role/organization keywords
    # (This is checked during extraction, not here)
    
    return True
```

**Acceptance criteria:**
- [ ] Filters out single-word names
- [ ] Filters out all-caps or all-lowercase names
- [ ] Filters out fictional placeholder names
- [ ] Requires at least one contextual clue (role or org)
- [ ] 80%+ precision (few false positives)

---

### Phase 5: Add role/organization inference

**Task:** Implement context-based role and organization inference

**Approach:**
```python
def _infer_role(self, article_text: str, name: str) -> str:
    """Infer role from context around name in article."""
    
    # Find sentences containing the name
    sentences = [s for s in article_text.split('.') if name in s]
    
    if not sentences:
        return 'community leader'  # Default
    
    # Look for role keywords near the name
    for sentence in sentences:
        # "Maria Garcia, a community organizer"
        match = re.search(rf'{name},\s+a\s+([\w\s]+)', sentence)
        if match:
            return match.group(1).strip()
        
        # "organizer Maria Garcia"
        match = re.search(rf'([\w\s]+)\s+{name}', sentence)
        if match:
            role_words = match.group(1).split()
            if len(role_words) <= 2:
                return ' '.join(role_words)
    
    return 'community leader'  # Default fallback

def _infer_organization(self, article_text: str, name: str) -> str:
    """Infer organization from context around name."""
    
    # Find sentences containing the name
    sentences = [s for s in article_text.split('.') if name in s]
    
    for sentence in sentences:
        # "from Portland Bureau of Transportation"
        match = re.search(r'from\s+([\w\s]+(?:Bureau|Office|Department|Organization|Coalition|Network))', sentence)
        if match:
            return match.group(1).strip()
        
        # "at [Organization]"
        match = re.search(r'at\s+([\w\s]+(?:Inc|LLC|Corp|Organization))', sentence)
        if match:
            return match.group(1).strip()
    
    # Fallback: extract from URL domain
    url = self.current_search_result_url  # Set during search loop
    if url:
        domain = url.split('//')[1].split('/')[0].split('.')[0]
        return domain.replace('-', ' ').title()
    
    return 'Unknown Organization'
```

**Acceptance criteria:**
- [ ] Infers role from common patterns (title, role + name)
- [ ] Infers organization from common patterns (at X, from X)
- [ ] Falls back to URL-derived organization name
- [ ] Handles missing context gracefully (returns defaults)

---

## Testing Plan

### Unit Tests (test_researcher.py additions)

```python
def test_extract_names_from_article():
    """Test name extraction from sample article text."""
    sample_text = """
    According to Maria Garcia, a community organizer in downtown Portland,
    the new climate initiative will create 500 green jobs. "This is a
    turning point," said Garcia, who has worked with the Portland Bureau
    of Transportation for 15 years.
    
    James Smith, a resident of the Pearl District, agreed. "We've been
    waiting for this," Smith said. "Our neighborhood needs more green
    spaces."
    """
    
    names = city_expander.extract_names_from_article(sample_text)
    
    assert 'Maria Garcia' in names
    assert 'James Smith' in names
    assert len(names) >= 2

def test_is_organizational_name():
    """Test organizational name filtering."""
    assert city_expander._is_organizational_name('Sustainable Simplicity') == False
    assert city_expander._is_organizational_name('Portland Climate Coalition') == True
    assert city_expander._is_organizational_name('Environmental Justice Network') == True
    assert city_expander._is_organizational_name('Maria Garcia') == False

def test_validate_character():
    """Test character validation rules."""
    valid_char = {
        'name': 'Maria Garcia',
        'role': 'organizer',
        'organization': 'Portland Bureau of Transportation'
    }
    assert city_expander._validate_character(valid_char) == True
    
    invalid_char = {
        'name': 'Portland Climate Coalition',
        'role': None,
        'organization': None
    }
    assert city_expander._validate_character(invalid_char) == False
```

### Integration Tests

```bash
# Test on cities known to have good local news coverage
python3 scripts/agentic-researcher/city-expander.py "Portland" --state "OR"
python3 scripts/agentic-researcher/city-expander.py "Seattle" --state "WA"
python3 scripts/agentic-researcher/city-expander.py "Minneapolis" --state "MN"

# Verify output contains individual names, not organizations
cat research-output/portland-or-research.json | jq '.characters[] | .name'
# Expected: "Maria Garcia", "James Smith", etc. (not "Sustainable Simplicity")
```

---

## Timeline & Deliverables

| Phase | Task | Estimated Effort | Priority |
|---|---|---|---|
| 1 | Article content fetching | 2 hours | High |
| 2 | Attribution pattern matching | 3 hours | High |
| 3 | Update main extraction flow | 2 hours | High |
| 4 | Add validation layer | 1 hour | High |
| 5 | Add role/org inference | 2 hours | Medium |

**Total: ~10 hours**

---

## Risks & Mitigations

**Risk 1:** DDGS rate limiting blocks article fetching
- **Mitigation:** Add sleep(2) between requests, implement exponential backoff

**Risk 2:** Articles are behind paywalls or JavaScript-heavy
- **Mitigation:** Skip sites that block scraping, focus on accessible local news

**Risk 3:** Attribution patterns are too rigid, miss variations
- **Mitigation:** Start with common patterns, expand based on test failures

**Risk 4:** False positives (fictional names, placeholders)
- **Mitigation:** Implement validation layer (Phase 4) to filter obvious false positives

---

## Future Enhancements (After Core Fixes)

- [ ] **Wikidata cross-reference:** Verify discovered names against Wikidata for known activists
- [ ] **Social media verification:** Check if name has LinkedIn/Twitter presence (confirms real person)
- [ ] **Quote extraction:** Pull actual quotes from people to add depth to character bios
- [ ] **Photo extraction:** Find headshots from news articles for character portraits
- [ ] **Multilingual support:** Handle non-English names and articles (Spanish, French, etc.)

---

## Subagent Assignment Plan

This document will be used to spawn subagents for each phase:

1. **Subagent 1 (Phase 1-2):** Implement article fetching and attribution patterns
   - Input: This document + current `city-expander.py`
   - Output: Working `fetch_search_result_content()` and `extract_names_from_article()` methods
   - Verification: Unit tests pass on sample articles

2. **Subagent 2 (Phase 3-5):** Integrate new methods, add validation and inference
   - Input: Phase 1-2 output + validation rules
   - Output: Updated `search_climate_activists()` with full pipeline
   - Verification: End-to-end test on Portland returns individual names

3. **Subagent 3 (Testing):** Expand test coverage
   - Input: Updated `test_researcher.py`
   - Output: Comprehensive test suite with integration tests
   - Verification: All tests pass on 3+ cities
