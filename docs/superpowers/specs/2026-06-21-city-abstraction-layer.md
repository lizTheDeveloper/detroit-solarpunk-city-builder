# City Abstraction Layer — Implementation Spec

**Date:** 2026-06-21  
**Status:** Ready to implement  
**Parent plan:** [Multi-City Expansion Plan](./2026-06-21-multi-city-expansion.md)  
**Scope:** Phase 1 only — refactor Detroit into a registry-based city system

---

## Summary

Refactor the hardcoded Detroit city package into a registry-based system that can load multiple cities. This is foundational work for multi-city support.

**Current state:**
- `app/src/city/detroit.ts` exports `detroitPackage: CityPackage`
- `app/src/state/game-state.ts` imports Detroit directly: `import { detroitPackage } from './city/detroit'`
- `app/src/ui/panels/MapPanel.tsx` imports Detroit for map initialization
- Game initialization assumes Detroit values

**Target state:**
- `app/src/city/detroit/package.ts` exports `detroitPackage: CityPackage` (moved)
- `app/src/city/registry.ts` loads city packages dynamically
- `app/src/state/game-state.ts` loads city from registry based on `selectedCity`
- Players can choose which city to play

**Success criteria:**
- Detroit plays identically (no regression in gameplay)
- Registry can load multiple cities (even if only Detroit exists)
- City selection UI works (shows Detroit + "Coming Soon" placeholders)
- No hardcoded references to `detroit.ts` remain

---

## Implementation Tasks

### Task 1: Move Detroit into Registry Structure

**Goal:** Reorganize file structure to support multiple cities.

**Files:**
- Move: `app/src/city/detroit.ts` → `app/src/city/detroit/package.ts`
- Create: `app/src/city/detroit/index.ts` (barrel export for backward compat)
- Create: `app/src/city/registry.ts`

**Steps:**

1. **Move Detroit package into subdirectory**
```bash
mkdir -p app/src/city/detroit
git mv app/src/city/detroit.ts app/src/city/detroit/package.ts
```

2. **Create barrel export for backward compatibility**
```typescript
// app/src/city/detroit/index.ts
export { detroitPackage } from './package';
```

3. **Update imports — phase 1 (backward compat)**
```bash
# Find all files importing from './city/detroit' or '../city/detroit'
grep -r "from.*['\"].*city/detroit['\"]" app/src/
# No changes needed yet — barrel export maintains compatibility
```

4. **Test: verify build still works**
```bash
cd app && npm run build
# Expected: SUCCESS, no errors
```

5. **Commit**
```bash
git add app/src/city/
git commit -m "refactor: move detroit.ts into city/detroit/package.ts for registry structure"
```

---

### Task 2: Build City Registry

**Goal:** Create registry that loads city packages dynamically.

**Files:**
- Create: `app/src/city/registry.ts`
- Create: `app/src/city/registry.test.ts`

**Implementation:**

```typescript
// app/src/city/registry.ts
import type { CityPackage } from './types';
import { detroitPackage } from './detroit/package';

// Registry of all available cities
const cityRegistry: Record<string, CityPackage> = {
  detroit: detroitPackage,
  // Future cities will be added here:
  // minneapolis: minneapolisPackage,
};

/**
 * Get a city package by slug.
 * Returns undefined if city not found.
 */
export function getCity(slug: string): CityPackage | undefined {
  return cityRegistry[slug];
}

/**
 * List all available cities.
 * Returns array of { slug, meta } for UI display.
 */
export function listCities(): Array<{ slug: string; meta: CityPackage['meta'] }> {
  return Object.entries(cityRegistry).map(([slug, pkg]) => ({
    slug,
    meta: pkg.meta,
  }));
}

/**
 * Check if a city exists in the registry.
 */
export function hasCity(slug: string): boolean {
  return slug in cityRegistry;
}

/**
 * Get the default city slug.
 * Currently 'detroit', may change based on user preferences or game state.
 */
export function getDefaultCitySlug(): string {
  return 'detroit';
}
```

**Tests:**

```typescript
// app/src/city/registry.test.ts
import { describe, it, expect } from 'vitest';
import { getCity, listCities, hasCity, getDefaultCitySlug } from './registry';

describe('city registry', () => {
  it('loads Detroit package', () => {
    const detroit = getCity('detroit');
    expect(detroit).toBeDefined();
    expect(detroit?.meta.cityName).toBe('Detroit');
    expect(detroit?.meta.state).toBe('MI');
  });

  it('returns undefined for unknown city', () => {
    expect(getCity('minneapolis')).toBeUndefined();
  });

  it('lists all cities', () => {
    const cities = listCities();
    expect(cities.length).toBeGreaterThanOrEqual(1);
    expect(cities[0]).toHaveProperty('slug');
    expect(cities[0]).toHaveProperty('meta');
  });

  it('checks if city exists', () => {
    expect(hasCity('detroit')).toBe(true);
    expect(hasCity('minneapolis')).toBe(false);
  });

  it('returns default city slug', () => {
    expect(getDefaultCitySlug()).toBe('detroit');
  });
});
```

**Run tests:**
```bash
cd app && npx vitest run src/city/registry.test.ts
# Expected: PASS (5 tests)
```

**Commit:**
```bash
git add app/src/city/registry.ts app/src/city/registry.test.ts
git commit -m "feat: city registry for dynamic city package loading"
```

---

### Task 3: Update Game State to Use Registry

**Goal:** Load city package from registry instead of hardcoded import.

**Files:**
- Modify: `app/src/state/game-state.ts`
- Modify: `app/src/state/types.ts` (add `selectedCity` to state)
- Modify: `app/src/state/create-game.ts` (accept city slug parameter)
- Modify: `app/src/state/create-game.test.ts` (update tests)

**Implementation:**

1. **Add `selectedCity` to game state**
```typescript
// app/src/state/types.ts
export interface GameState {
  turn: number;
  season: Season;
  budget: number;
  // ... existing fields ...
  selectedCity: string;  // NEW: city slug
  cityPackage: CityPackage;  // NEW: loaded city package
}
```

2. **Update `createGame` to accept city slug**
```typescript
// app/src/state/create-game.ts
import { getCity, getDefaultCitySlug } from '../city/registry';

export function createGame(citySlug: string = getDefaultCitySlug()): GameState {
  const cityPackage = getCity(citySlug);
  if (!cityPackage) {
    throw new Error(`City not found: ${citySlug}`);
  }

  return {
    turn: 1,
    season: 'spring',
    budget: cityPackage.calibration.cityBudget.game,
    selectedCity: citySlug,
    cityPackage: cityPackage,
    // ... rest of initial state ...
  };
}
```

3. **Update game initialization**
```typescript
// app/src/state/game-state.ts
import { createGame } from './create-game';

// Initial game state
export const initialGameState = createGame();  // Uses default city (detroit)
```

4. **Update tests**
```typescript
// app/src/state/create-game.test.ts
import { describe, it, expect } from 'vitest';
import { createGame } from './create-game';

describe('createGame', () => {
  it('creates game with default city', () => {
    const state = createGame();
    expect(state.selectedCity).toBe('detroit');
    expect(state.cityPackage.meta.cityName).toBe('Detroit');
  });

  it('creates game with specified city', () => {
    const state = createGame('detroit');
    expect(state.selectedCity).toBe('detroit');
  });

  it('throws error for unknown city', () => {
    expect(() => createGame('minneapolis')).toThrow('City not found');
  });
});
```

**Run tests:**
```bash
cd app && npx vitest run src/state/
# Expected: PASS (all state tests)
```

**Commit:**
```bash
git add app/src/state/
git commit -m "feat: game state loads city from registry"
```

---

### Task 4: Update Map Panel to Use Registry

**Goal:** Map panel loads city geography from registry instead of hardcoded import.

**Files:**
- Modify: `app/src/ui/panels/MapPanel.tsx`
- Modify: `app/src/ui/panels/MapPanel.test.tsx` (if exists)

**Implementation:**

1. **Update MapPanel to use game state**
```typescript
// app/src/ui/panels/MapPanel.tsx
import { useGameState } from '../../state/game-state';

export function MapPanel() {
  const { cityPackage } = useGameState();
  
  // Use cityPackage.geography instead of detroitPackage.geography
  const { neighborhoodBoundaries, blockPolygons } = cityPackage.geography;
  const { center, zoomBounds } = cityPackage.meta;

  // ... rest of map initialization uses cityPackage values ...
}
```

2. **Update tests (if they exist)**
```typescript
// app/src/ui/panels/MapPanel.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MapPanel } from './MapPanel';
import { GameStateProvider } from '../../state/game-state';

describe('MapPanel', () => {
  it('renders with default city', () => {
    const { container } = render(
      <GameStateProvider>
        <MapPanel />
      </GameStateProvider>
    );
    expect(container).toBeDefined();
  });
});
```

**Run tests:**
```bash
cd app && npx vitest run src/ui/panels/MapPanel.test.tsx
# Expected: PASS
```

**Commit:**
```bash
git add app/src/ui/panels/MapPanel.tsx
git commit -m "refactor: MapPanel loads city from game state registry"
```

---

### Task 5: Update Civic Data Updater Output

**Goal:** Civic data updater writes to new city package location.

**Files:**
- Modify: `scripts/update-civic-data.py` (update output paths)
- Modify: `.github/workflows/update-civic-data.yml` (update paths)

**Implementation:**

1. **Update output paths in updater**
```python
# scripts/update-civic-data.py
COUNCIL_MEMBERS_PATH = REPO_ROOT / "app/src/city/detroit/council-members.ts"  # NEW PATH
DETROIT_TS_PATH = REPO_ROOT / "app/src/city/detroit/package.ts"  # NEW PATH
```

2. **Update GitHub Action**
```yaml
# .github/workflows/update-civic-data.yml
- name: Apply updates
  run: |
    python scripts/update-civic-data.py --apply
    git add app/src/city/detroit/  # NEW PATH
```

3. **Test: verify updater still works**
```bash
cd /Users/annhoward/src/city_builder
./scripts/venv/bin/python scripts/update-civic-data.py --check
# Expected: Up to date ✓
```

**Commit:**
```bash
git add scripts/ .github/
git commit -m "refactor: update civic-data-updater paths for new city structure"
```

---

### Task 6: Build City Selection UI

**Goal:** Add city selection screen to main menu.

**Files:**
- Create: `app/src/ui/screens/CitySelectionScreen.tsx`
- Create: `app/src/ui/components/CityCard.tsx`
- Modify: `app/src/ui/screens/MainMenu.tsx` (add navigation to city selection)

**Implementation:**

1. **Create CityCard component**
```typescript
// app/src/ui/components/CityCard.tsx
import type { CityMeta } from '../../city/types';

interface CityCardProps {
  slug: string;
  meta: CityMeta;
  available: boolean;
  onSelect: (slug: string) => void;
}

export function CityCard({ slug, meta, available, onSelect }: CityCardProps) {
  return (
    <div className={`city-card ${available ? '' : 'disabled'}`}>
      <h3>{meta.cityName}, {meta.state}</h3>
      <p>Population: {meta.population?.toLocaleString() || 'Unknown'}</p>
      {available ? (
        <button onClick={() => onSelect(slug)}>Play</button>
      ) : (
        <button disabled>Coming Soon</button>
      )}
    </div>
  );
}
```

2. **Create CitySelectionScreen**
```typescript
// app/src/ui/screens/CitySelectionScreen.tsx
import { listCities } from '../../city/registry';
import { CityCard } from '../components/CityCard';
import { useNavigate } from 'react-router-dom';

export function CitySelectionScreen() {
  const navigate = useNavigate();
  const cities = listCities();

  const handleSelectCity = (slug: string) => {
    // Store selected city in localStorage or game state
    localStorage.setItem('selectedCity', slug);
    navigate('/game');
  };

  return (
    <div className="city-selection-screen">
      <h1>Select Your City</h1>
      <div className="city-grid">
        {cities.map(({ slug, meta }) => (
          <CityCard
            key={slug}
            slug={slug}
            meta={meta}
            available={true}  // All cities in registry are available
            onSelect={handleSelectCity}
          />
        ))}
        {/* Placeholder for future cities */}
        <CityCard
          slug="minneapolis"
          meta={{
            cityName: 'Minneapolis',
            state: 'MN',
            population: 429954,
            center: [-93.265, 44.9778],
            zoomBounds: { min: 10, max: 18 },
            generatedAt: '',
            version: 0,
          }}
          available={false}
          onSelect={() => {}}
        />
      </div>
      <button onClick={() => navigate('/main-menu')}>Back</button>
    </div>
  );
}
```

3. **Update MainMenu to link to city selection**
```typescript
// app/src/ui/screens/Mainmenu.tsx
export function MainMenu() {
  const navigate = useNavigate();

  return (
    <div className="main-menu">
      <h1>Solarpunk City Builder</h1>
      <button onClick={() => navigate('/city-selection')}>Play Campaign</button>
      <button onClick={() => navigate('/about')}>About</button>
    </div>
  );
}
```

4. **Add styling**
```css
/* app/src/ui/screens/CitySelectionScreen.css */
.city-selection-screen {
  padding: 2rem;
}

.city-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  margin: 2rem 0;
}

.city-card {
  border: 2px solid #4a5;
  border-radius: 8px;
  padding: 1.5rem;
  background: #f0f8f0;
}

.city-card.disabled {
  opacity: 0.6;
  border-color: #888;
  background: #f0f0f0;
}

.city-card h3 {
  margin-top: 0;
}

.city-card button {
  margin-top: 1rem;
  width: 100%;
}
```

**Run app:**
```bash
cd app && npm run dev
# Navigate to: http://localhost:5173/city-selection
# Expected: See Detroit (playable) + Minneapolis placeholder
```

**Commit:**
```bash
git add app/src/ui/
git commit -m "feat: city selection screen with Detroit + Coming Soon placeholders"
```

---

### Task 7: Integration Testing

**Goal:** Verify full game loop works with registry-based city loading.

**Tests:**

1. **End-to-end: Play Detroit from city selection**
```bash
cd app && npm run dev
# Navigate to main menu
# Click "Play Campaign"
# Select Detroit
# Verify game loads with Detroit's starting budget ($1.5B)
# Play 1 turn
# Verify Detroit-specific content appears (news sources, characters)
```

2. **Verify no regression**
```bash
cd app && npm run test
# Expected: All existing tests pass
```

3. **Verify build**
```bash
cd app && npm run build
# Expected: No TypeScript errors, build succeeds
```

---

## Acceptance Criteria

**Phase 1 is complete when:**

1. ✅ Detroit plays identically to current version
2. ✅ City registry can load Detroit package
3. ✅ City selection UI shows Detroit as playable
4. ✅ City selection UI shows placeholder for Minneapolis
5. ✅ No hardcoded references to `detroit.ts` in game logic
6. ✅ All existing tests pass
7. ✅ Build succeeds without errors
8. ✅ Civic data updater writes to new paths

**Phase 1 is NOT complete when:**
- Minneapolis is playable (that's Phase 2+)
- Multi-city cooperation mechanics work (that's Phase 5)
- Community contribution framework exists (that's Phase 6)

---

## Out of Scope

**Not in this spec:**
- Minneapolis city package (next phase)
- Generic civic data updater (next phase)
- City package generator (later phase)
- Regional cooperation mechanics (Phase 5)
- Community contribution framework (Phase 6)

**Why stop here?**
- Phase 1 is foundational — must be solid before building on it
- Adding Minneapolis now would be premature optimization
- Need to validate city abstraction works before scaling

**Decision point:**
After Phase 1 is complete and tested, decide:
- If city abstraction is clean → continue to Phase 2 (Minneapolis research)
- If city abstraction is messy → refactor before adding more cities
- If scope creep detected → ship Phase 1 only, revisit later

---

## Technical Debt & Future Work

**Known issues to address in future phases:**

1. **City package validation** — `validateCityPackage()` exists but isn't enforced
2. **City package versioning** — No mechanism for breaking changes yet
3. **Geography data** — Some cities may not have block-level polygons
4. **Civic data updater** — Still Detroit-specific, needs refactoring
5. **City-specific mechanics** — Some arcs may not apply to all cities
6. **Performance** — Loading 10+ city packages may be slow
7. **Testing** — Need integration tests for city selection flow

**Future phases will address these systematically.**

---

## Appendix: File Structure After Phase 1

```
app/src/city/
├── types.ts              (unchanged)
├── registry.ts           (NEW)
├── registry.test.ts      (NEW)
└── detroit/
    ├── package.ts        (moved from ../detroit.ts)
    ├── index.ts          (NEW: barrel export)
    ├── council-members.ts (moved, auto-generated)
    └── ... other detroit files
```

**Import paths after Phase 1:**
```typescript
// Old (still works via barrel export):
import { detroitPackage } from './city/detroit';

// New (recommended):
import { getCity } from './city/registry';
const detroit = getCity('detroit');

// For city-specific data:
import { detroitPackage } from './city/detroit/package';
```
