# Byproduct Flow System - Design Document

## Context

Projects are currently independent — a maker space on one tile and a solar grid on another have no material relationship despite the obvious real-world connection (fabrication capacity enables solar panel assembly). The byproduct flow system introduces circular economy mechanics: completed projects generate named material outputs that other projects can consume for bonuses.

## Goals / Non-Goals

**Goals:**
- Completed projects produce named byproducts (compost, clean soil, lumber, fabrication capacity, biomass, etc.)
- Future projects consume byproducts for concrete bonuses: reduced cost, reduced duration, or enhanced effects
- Byproducts flow spatially: tile-local at full strength, adjacent at half strength
- Meaningful material loops emerge from spatial planning
- System is legible: players can see what a tile produces, what a project needs, and whether those needs are met

**Non-Goals:**
- Full logistics simulation (no transport costs, no routing)
- Player-controlled resource trading or manual allocation
- Byproducts as a hard requirement (they grant bonuses, never block projects)
- Complex supply chains (max one hop: producer → consumer)
- Inventory management UI or resource stockpiling decisions

## Key Decisions

### 1. Byproducts are implicit, not inventoried

Byproducts are not tracked as a separate resource pool. The system calculates "what byproducts are available at this tile right now" on-demand by scanning completed projects on the tile and adjacent tiles. No accumulating stockpile.

**Why**: An inventory system would add factory-sim complexity. On-demand calculation is stateless, deterministic, and simple.

**Trade-off**: One-shot byproducts (lumber from demolition) need a `consumedByproducts` array on the tile.

### 2. Byproducts grant bonuses, never block

If inputs aren't available, the project proceeds at normal cost/duration. Players should feel rewarded for good placement, not punished for imperfect placement.

### 3. Spatial flow: local full strength, adjacent half

One-hop adjacency matches the existing `adjacentTileIds` graph. 50% attenuation creates meaningful choices about same-tile vs. adjacent placement.

### 4. Two lifetimes: ongoing and one-shot

- **Ongoing**: Produced every turn as long as project exists. Multiple consumers can benefit. (e.g., food forest compost)
- **One-shot**: Produced once on completion, consumed once. (e.g., demolition lumber)

### 5. Three bonus types with caps

- `costReduction`: percentage off base cost (cap: 30%)
- `durationReduction`: turns removed (cap: -1 turn, minimum 1 total)
- `effectBoost`: percentage increase to a specific effect field (cap: 25%)

## Data Model

### New Types

```typescript
export type ByproductId = 
  | 'compost' | 'clean_soil' | 'lumber' | 'biomass'
  | 'fabrication_capacity' | 'recycled_materials'
  | 'stormwater_capacity' | 'community_knowledge'
  | 'clean_energy' | 'native_seed_stock';

export type ByproductLifetime = 'ongoing' | 'one-shot';
export type ByproductBonusType = 'costReduction' | 'durationReduction' | 'effectBoost';

export interface ByproductOutput {
  byproductId: ByproductId;
  lifetime: ByproductLifetime;
  amount: number;
}

export interface ByproductInput {
  byproductId: ByproductId;
  bonusType: ByproductBonusType;
  bonusValue: number;
  effectField?: keyof ProjectEffects;
}
```

### Extensions to Existing Types

```typescript
// Add to ProjectDefinition:
produces: ByproductOutput[];
consumes: ByproductInput[];

// Add to Tile:
consumedByproducts: string[]; // Format: `${sourceProjectId}:${byproductId}`
```

## Byproduct Catalog

### Production

| Project | Produces | Lifetime |
|---------|----------|----------|
| food_forest | compost (1.0), biomass (0.5) | ongoing |
| soil_remediation | clean_soil (1.0) | one-shot |
| rain_garden | stormwater_capacity (1.0) | ongoing |
| native_planting | native_seed_stock (0.5), biomass (0.5) | ongoing |
| solar_grid | clean_energy (1.0) | ongoing |
| greenway | recycled_materials (0.5) | ongoing |
| maker_space | fabrication_capacity (1.0), recycled_materials (0.5) | ongoing |
| community_kitchen | compost (0.5), community_knowledge (0.5) | ongoing |
| land_trust | community_knowledge (1.0) | ongoing |
| wetland_restoration | stormwater_capacity (1.0), clean_soil (0.5), biomass (1.0) | ongoing |
| wildlife_corridor | native_seed_stock (1.0), biomass (0.5) | ongoing |

### Consumption

| Project | Consumes | Bonus | Value | Narrative |
|---------|----------|-------|-------|-----------|
| food_forest | compost | costReduction | 0.20 | Sheet mulch from existing compost |
| food_forest | clean_soil | durationReduction | 1 | No waiting for phytoremediation |
| food_forest | community_knowledge | effectBoost (foodSov) | 0.25 | Knowledge amplifies food sovereignty |
| soil_remediation | biomass | costReduction | 0.15 | Biomass feeds mycoremediation cultures |
| rain_garden | recycled_materials | costReduction | 0.20 | Salvaged PVC reduces infrastructure cost |
| rain_garden | stormwater_capacity | effectBoost (tileEco) | 0.20 | Connected bioswales amplify each other |
| native_planting | native_seed_stock | costReduction | 0.25 | Local seed eliminates expensive purchases |
| native_planting | compost | durationReduction | 1 | Rich soil accelerates establishment |
| solar_grid | fabrication_capacity | costReduction | 0.20 | Local fabrication for mounts/wiring |
| solar_grid | clean_energy | effectBoost (annualRevenue) | 0.20 | Grid interconnection boosts revenue |
| maker_space | clean_energy | costReduction | 0.15 | Free power for CNC and laser |
| maker_space | recycled_materials | effectBoost (annualRevenue) | 0.20 | Material feedstock increases revenue |
| community_kitchen | compost | effectBoost (foodSov) | 0.20 | Compost-grown produce strengthens sovereignty |
| community_kitchen | clean_energy | costReduction | 0.15 | Free power for commercial equipment |
| land_trust | community_knowledge | durationReduction | 1 | Legal templates speed formation |
| wetland_restoration | stormwater_capacity | effectBoost (tileEco) | 0.25 | Connected water systems amplify restoration |
| wetland_restoration | biomass | costReduction | 0.20 | Existing biomass seeds new plantings |
| wildlife_corridor | native_seed_stock | costReduction | 0.25 | Local seeds reduce establishment cost |
| wildlife_corridor | biomass | durationReduction | 1 | Existing biomass accelerates habitat |

### Example Material Loops

1. **Food Forest → Community Kitchen → Food Forest** (compost loop)
2. **Maker Space → Solar Grid → Maker Space** (energy-fabrication loop)
3. **Soil Remediation → Food Forest → Wetland Restoration** (restoration chain)
4. **Native Planting → Wildlife Corridor → Native Planting** (seed loop)

## Implementation Phases

### Phase 1: Data Model and Calculation Engine
- Add types to `types.ts`
- Add `produces`/`consumes` to project catalog
- Create `src/systems/byproducts.ts` with pure calculation functions
- Add `consumedByproducts: []` to tile defaults

### Phase 2: Integration with Project Lifecycle
- `startProject()` applies cost/duration bonuses
- `advanceProjects()` applies effect boosts on completion, marks one-shot consumption

### Phase 3: UI Display
- TileDetailPanel: "Producing" section
- ProjectSelectPanel: show available bonuses and effective cost/duration
- TurnSummary: mention byproduct flows

### Phase 4 (Future): Visual Flow
- Flow arrows on map
- Seasonal variation
- Policy interactions (e.g., "Circular Economy Incentives" doubles flow range)
