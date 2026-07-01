#!/usr/bin/env python3
"""
End-to-end test for the agentic city researcher.
Tests the full pipeline: governance analysis, character discovery, movement mapping.
"""

import sys
import os
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

def test_governance_analysis():
    """Test that we can analyze a city's governance structure."""
    print("Testing governance analysis...")
    governance = GovernanceStructure("Portland", "OR")

    structure = governance.analyze()
    print(f"  Governance structure: {structure['governance_type']}")
    print(f"  Council size: {structure['council_size']}")
    print(f"  Key officials: {structure['key_officials']}")

    assert 'governance_type' in structure
    assert 'council_size' in structure
    assert 'key_officials' in structure
    print("  ✓ Governance analysis passed\n")

def test_character_discovery():
    """Test that we can discover real climate leaders."""
    print("Testing character discovery...")
    researcher = CharacterResearcher("Portland", "OR")
    
    characters = researcher.search_climate_activists()
    print(f"  Found {len(characters)} potential characters")
    
    for char in characters:
        print(f"    - {char['name']}: {char['role']} @ {char['organization']}")
        print(f"      Neighborhood: {char.get('neighborhood', 'N/A')}")
        print(f"      Description: {char.get('description', 'N/A')[:60]}...")
    
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
    researcher = CharacterResearcher("Portland", "OR")
    
    movements = researcher.search_solarpunk_movements()
    print(f"  Found {len(movements)} movements")
    
    for move in movements[:3]:
        print(f"    - {move['name']} ({move['type']})")
        print(f"      {move.get('description', 'N/A')[:80]}...")
    
    assert isinstance(movements, list)
    if movements:
        assert 'name' in movements[0]
        assert 'description' in movements[0]
        assert 'type' in movements[0]
    print("  ✓ Movement mapping passed\n")

def test_full_pipeline():
    """Test the complete research pipeline."""
    print("Testing full research pipeline...")
    
    result = research_city("Portland", "OR", output_json=False)
    
    print(f"\n  City: {result['city']}, {result['state']}")
    print(f"  Governance: {result['governance']['governance_type']}")
    print(f"  Characters discovered: {len(result['characters'])}")
    print(f"  Movements mapped: {len(result['movements'])}")
    print(f"  Suggested character slots: {len(result['suggested_roles'])}")
    
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
    
    try:
        test_governance_analysis()
        test_character_discovery()
        test_movement_mapping()
        test_full_pipeline()
        
        print("=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        return 0
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
