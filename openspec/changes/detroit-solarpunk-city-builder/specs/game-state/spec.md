## ADDED Requirements

### Requirement: Game state is a single immutable object with version field
The game state SHALL be represented as a single TypeScript object that contains all game data. The state SHALL be immutable -- updates produce new state objects. The state SHALL include a schema version field for save compatibility.

```typescript
interface GameState {
  version: number;           // Schema version, currently 2 (increment on breaking changes)
  tiles: Tile[];             // Array of neighborhood tile objects
  meters: {
    communityTrust: number;  // 0-100, starts at 50
    ecologicalHealth: number; // 0-100, starts at 15
    foodSovereignty: number; // 0-100, starts at 10
    politicalWill: number;   // 0-100, starts at 60
    budget: number;          // Dollar amount in millions, starts at 4.2
    climatePressure: number; // 0-100, starts at 30
  };
  turn: {
    number: number;          // 1-64
    season: 'spring' | 'summer' | 'fall' | 'winter';
    year: number;            // 1-16
    term: number;            // 1-4
  };
  activeProjects: ActiveProject[];
  completedProjects: CompletedProject[];
  enactedPolicies: Policy[];
  publicOpinion: {
    foodSovereignty: number;     // 0-100, starts at 15
    waterCommons: number;        // 0-100, starts at 10
    landReform: number;          // 0-100, starts at 8
    ecologicalRestoration: number; // 0-100, starts at 20
    cooperativeEconomics: number;  // 0-100, starts at 12
  };
  narrativeState: {
    consecutiveTurns: Record<string, number>; // topic -> consecutive turns count
    counterNarrativeCooldowns: Record<string, number>; // type -> turns until eligible
  };
  progressionStage: 'awakening' | 'transition' | 'restoration' | 'beyond';
  eventQueue: GameEvent[];
  eventCooldowns: Record<string, number>; // event type -> turns until eligible
  tippingPointsTriggered: {
    point1: boolean;  // 60% climate
    point2: boolean;  // 85% climate
  };
  councilMembers: CouncilMember[]; // 9 members with positions
  continentalGoals?: {   // Only present in Beyond the Map stage
    watershedRestoration: number;  // 0-100
    migratorySpecies: number;      // 0-100
    regionalFoodNetwork: number;   // 0-100
  };
  annualRevenueBonuses: number; // Sum of ongoing revenue from Solar Grids, Maker Spaces, Coop Tax policy (in $M/year)
}
```

#### Scenario: State contains all game data
- **WHEN** the game is initialized
- **THEN** the state object contains version (2), tiles, meters (all 6 at starting values), turn info (Spring, Year 1, Term 1, Turn 1), empty active projects, empty enacted policies, starting public opinion values, progression stage "awakening", empty event queue, empty cooldowns, tipping points both false, 9 council members, and annualRevenueBonuses at 0

### Requirement: State transitions via reducer
The game state SHALL only change through a reducer function with signature `(state: GameState, action: GameAction) => GameState`. No direct mutation of state is permitted.

#### Scenario: Turn advance produces new state
- **WHEN** the player ends their turn and actions are dispatched
- **THEN** the reducer produces a new GameState reflecting all changes from that turn's phases, with the previous state preserved for undo/history

#### Scenario: State is never mutated
- **WHEN** a new state is produced
- **THEN** the previous state object remains unchanged and can be referenced for undo/history

### Requirement: Save and load game with version migration
The system SHALL serialize the complete game state to JSON for saving and deserialize JSON back into a valid game state for loading. The version field SHALL be used to detect and handle incompatible saves.

Migration rules:
- If saved version < current version: attempt migration. Log what changed.
- If saved version > current version: reject load with message "This save was created with a newer version of the game."
- If saved version == current version: load directly.
- Version 1 -> 2 migration: add publicOpinion with default starting values, add narrativeState with empty records, add tippingPointsTriggered as both false, add councilMembers with default positions, add annualRevenueBonuses as 0, add eventCooldowns as empty.

#### Scenario: Save game
- **WHEN** the player saves the game
- **THEN** the system serializes the current GameState (including version: 2) to a JSON string and persists it to browser localStorage under key "detroit_solarpunk_save"

#### Scenario: Load game with matching version
- **WHEN** the player loads a saved game with version: 2
- **THEN** the system deserializes the JSON string into a GameState object and restores the game to that exact state

#### Scenario: Load game with older version
- **WHEN** the player loads a saved game with version: 1
- **THEN** the system migrates the state to version 2 by adding missing fields with default values, logs "Migrated save from v1 to v2", and loads the migrated state

#### Scenario: Load game with newer version
- **WHEN** the player loads a saved game with version: 3 but the game expects version: 2
- **THEN** the system rejects the load with message: "This save was created with a newer version of the game (v3). Please update to load this save."

### Requirement: New game initialization with specific starting values
The system SHALL initialize a new game with these exact starting values:

**Meters:**
- Community Trust: 50%
- Ecological Health: 15%
- Food Sovereignty: 10%
- Political Will: 60%
- Budget: $4.2M
- Climate Pressure: 30%

**Public Opinion:**
- Food Sovereignty: 15%
- Water Commons: 10%
- Land Reform: 8%
- Ecological Restoration: 20%
- Cooperative Economics: 12%

**Turn:**
- Turn 1, Spring, Year 1, Term 1

**Progression:**
- Stage: Awakening

**Tiles:**
All Detroit neighborhoods initialized with tile-type-specific properties:
- Industrial tiles (e.g., Delray, River Rouge): 80% contamination, 5% eco, 0% vacancy override (occupied by industry)
- Urban-dense tiles (e.g., Midtown, Corktown): 40% contamination, 12% eco, 15% vacancy
- Urban-sparse tiles (e.g., Brightmoor, Warrendale): 25% contamination, 10% eco, 55% vacancy
- Waterfront tiles (e.g., Belle Isle, Rivertown): 50% contamination, 18% eco, 10% vacancy
- Vacant tiles (e.g., parts of East Side): 20% contamination, 8% eco, 80% vacancy
- Park tiles (e.g., Rouge Park, Palmer Park): 10% contamination, 35% eco, 0% vacancy

**Council:**
- 3 Supportive, 3 Neutral, 3 Opposed (fixed starting positions)

**Other:**
- annualRevenueBonuses: $0M
- tippingPointsTriggered: both false
- eventCooldowns: empty
- narrativeState: all consecutive counters at 0
- version: 2

#### Scenario: Start new game
- **WHEN** the player starts a new game
- **THEN** the state is initialized with all values above. The player sees: 6 meters at starting values, the tile map with Detroit neighborhoods showing dystopia visuals (all tiles below 40% eco), season Spring, and the Awakening stage active with basic projects available.

#### Scenario: Industrial tiles start heavily contaminated
- **WHEN** a new game initializes the Delray tile (industrial type)
- **THEN** Delray has contamination: 80%, ecological health: 5%, vacancy: 0%. Food Forest and Community Kitchen are blocked until Soil Remediation reduces contamination below 50%. Ecology projects on this tile operate at 50% effectiveness due to contamination > 30%.
