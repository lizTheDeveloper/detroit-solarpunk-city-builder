#!/usr/bin/env python3
"""
End-to-end test for the agentic city researcher.
Tests the full pipeline: governance analysis, character discovery, movement mapping.

Performance characteristics
---------------------------
Typical breakdown for Portland, OR (single cold run):
  - Governance analysis:        ~10-20 s  (up to 3 DDGS queries, first one wins)
  - Character discovery (80):   ~20-30 s  (12 DDGS queries, 0.1 s inter-query sleep)
  - Movement discovery (10):    ~3-5  s   (4 DDGS queries)
  - Full pipeline (cached):     ~1-2  s   (all queries served from module cache)

Total cold run: ~35-55 s (well within the 60 s target).

All DDGS search results are cached at the module level in ``_search_cache``,
so when ``test_full_pipeline`` calls ``research_city``, every network call
already has a cached response and the pipeline runs almost instantly.
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the module with hyphen
import importlib.util
test_dir = os.path.dirname(os.path.abspath(__file__))
city_expander_path = os.path.join(test_dir, "city-expander.py")
spec = importlib.util.spec_from_file_location("city_expander", city_expander_path)
city_expander = importlib.util.module_from_spec(spec)
spec.loader.exec_module(city_expander)

GovernanceStructure = city_expander.GovernanceStructure
CharacterResearcher = city_expander.CharacterResearcher
GovernanceCustomizer = city_expander.GovernanceCustomizer
research_city = city_expander.research_city

# Tunables
# ----------
# Using 80 results for character discovery is important: with num<40 the
# per-query budget is only 5 DDGS results, which makes it much harder
# for the extraction heuristics to surface named individuals and the
# test becomes unreliable (sometimes 0 chars).  At 80 the extraction
# is robust (~10+ chars for Portland) and still fast (~25 s).
CHARACTER_NUM_RESULTS = 80
MOVEMENT_NUM_RESULTS = 10


def test_governance_analysis():
    """Test that we can analyze a city's governance structure."""
    print("Testing governance analysis...")
    t0 = time.time()

    governance = GovernanceStructure("Portland", "OR")
    structure = governance.analyze()

    elapsed = time.time() - t0
    print(f"  Governance structure: {structure['governance_type']}")
    print(f"  Council size: {structure['council_size']}")
    print(f"  Key officials: {structure['key_officials']}")
    print(f"  [{elapsed:.1f}s]")

    assert 'governance_type' in structure
    assert 'council_size' in structure
    assert 'key_officials' in structure
    print("  ✓ Governance analysis passed\n")


def test_character_discovery():
    """Test that we can discover real climate leaders."""
    print("Testing character discovery...")
    t0 = time.time()

    researcher = CharacterResearcher("Portland", "OR")
    characters = researcher.search_climate_activists(num_results=CHARACTER_NUM_RESULTS)

    elapsed = time.time() - t0
    print(f"  Found {len(characters)} potential characters")

    for char in characters:
        print(f"    - {char['name']}: {char['role']} @ {char['organization']}")
        print(f"      Neighborhood: {char.get('neighborhood', 'N/A')}")
        print(f"      Description: {char.get('description', 'N/A')[:60]}...")

    print(f"  [{elapsed:.1f}s]")

    # Require at least 1 character to ensure extraction is working
    assert isinstance(characters, list), "Characters should be a list"
    assert len(characters) >= 1, f"Expected at least 1 character, found {len(characters)}"

    # Validate structure of each character
    for char in characters:
        assert 'name' in char, "Character missing 'name' field"
        assert 'role' in char, "Character missing 'role' field"
        assert 'organization' in char, "Character missing 'organization' field"
        assert len(char['name'].split()) >= 2, f"Character name '{char['name']}' doesn't look like a full name"

    print("  ✓ Character discovery passed\n")


def test_movement_mapping():
    """Test that we can find existing solarpunk movements."""
    print("Testing movement mapping...")
    t0 = time.time()

    researcher = CharacterResearcher("Portland", "OR")
    movements = researcher.search_solarpunk_movements(num_results=MOVEMENT_NUM_RESULTS)

    elapsed = time.time() - t0
    print(f"  Found {len(movements)} movements")

    for move in movements[:3]:
        print(f"    - {move['name']} ({move['type']})")
        print(f"      {move.get('description', 'N/A')[:80]}...")

    print(f"  [{elapsed:.1f}s]")

    assert isinstance(movements, list)
    if movements:
        assert 'name' in movements[0]
        assert 'description' in movements[0]
        assert 'type' in movements[0]
    print("  ✓ Movement mapping passed\n")


def test_full_pipeline():
    """Test the complete research pipeline.

    Because DDGS results are cached at module level, the network calls here
    should be served from cache and this test should complete almost instantly.
    """
    print("Testing full research pipeline...")
    t0 = time.time()

    result = research_city(
        "Portland", "OR",
        output_json=False,
        num_characters=CHARACTER_NUM_RESULTS,
        num_movements=MOVEMENT_NUM_RESULTS,
    )

    elapsed = time.time() - t0
    print(f"\n  City: {result['city']}, {result['state']}")
    print(f"  Governance: {result['governance']['governance_type']}")
    print(f"  Characters discovered: {len(result['characters'])}")
    print(f"  Movements mapped: {len(result['movements'])}")
    print(f"  Suggested character slots: {len(result['suggested_roles'])}")
    print(f"  [{elapsed:.1f}s]")

    assert 'city' in result
    assert 'state' in result
    assert 'governance' in result
    assert 'characters' in result
    assert 'movements' in result
    assert 'suggested_roles' in result

    print("  ✓ Full pipeline passed\n")


def main():
    print("=" * 60)
    print("Agentic Researcher - End-to-End Tests")
    print("=" * 60 + "\n")

    overall_start = time.time()

    try:
        test_governance_analysis()
        test_character_discovery()
        test_movement_mapping()
        test_full_pipeline()

        total_elapsed = time.time() - overall_start
        print("=" * 60)
        print(f"✓ All tests passed!  (total: {total_elapsed:.1f}s)")
        print("=" * 60)

        if total_elapsed > 60:
            print(f"\n⚠ WARNING: total runtime {total_elapsed:.1f}s exceeds 60s target")
            return 1
        return 0

    except Exception as e:
        total_elapsed = time.time() - overall_start
        print(f"\n✗ Test failed after {total_elapsed:.1f}s: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
