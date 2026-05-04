## ADDED Requirements

### Requirement: Detroit neighborhood tiles
The tile map SHALL represent Detroit as a grid of neighborhood-scale tiles (~30-50 tiles). Each tile represents a real Detroit neighborhood (Brightmoor, Midtown, Corktown, Downtown, etc.) with accurate relative positions.

#### Scenario: Map contains real neighborhoods
- **WHEN** the game map loads
- **THEN** it displays tiles for Detroit neighborhoods including at minimum: Downtown, Midtown, Corktown, Brightmoor, Mexicantown, Southwest, Eastern Market, Belle Isle, Indian Village, and Delray

### Requirement: Tile properties
Each tile SHALL have properties: name, terrain type (urban-dense, urban-sparse, vacant, industrial, waterfront, park), vacancy rate (0-100%), ecological health (0-100%), current infrastructure, active projects, visual stage, existing_uses (array), gentrification_pressure (0-100%), contamination_level (0-100%), and neighborhood_traits (array).

#### Scenario: Tile reflects neighborhood state
- **WHEN** a tile is inspected
- **THEN** it displays its current name, terrain type, vacancy rate, ecological health, list of active projects, existing uses, gentrification pressure, contamination level, and visual appearance matching its stage

### Requirement: Tile transformation
Tiles SHALL visually transform as projects complete on them. A tile's visual stage progresses through: dystopia (gray/concrete) -> transition (mixed green/gray) -> restoration (green/living) -> beyond (integrated ecological).

#### Scenario: Completing a project transforms tile visuals
- **WHEN** a food forest project completes on a tile with visual stage "dystopia"
- **THEN** the tile's visual stage advances to "transition" and its appearance changes accordingly

### Requirement: Tile transformation thresholds
A tile's visual stage SHALL advance based on its aggregate ecological health score. The thresholds are: dystopia (0-24%), transition (25-59%), restoration (60-84%), beyond (85-100%).

#### Scenario: Tile reaches transition threshold
- **WHEN** a tile's ecological health reaches 25% or higher
- **THEN** the tile's visual stage advances to "transition"

#### Scenario: Tile reaches restoration threshold
- **WHEN** a tile's ecological health reaches 60% or higher
- **THEN** the tile's visual stage advances to "restoration"

#### Scenario: Tile reaches beyond threshold
- **WHEN** a tile's ecological health reaches 85% or higher AND the game is in Beyond the Map stage
- **THEN** the tile's visual stage advances to "beyond"

### Requirement: Tile interaction
The player SHALL be able to click/tap a tile to view its details and available actions (start project, view status, see history).

#### Scenario: Click tile to see details
- **WHEN** the player clicks a neighborhood tile
- **THEN** a detail panel appears showing the tile's properties, active projects, existing uses, gentrification pressure, contamination warnings, and list of available projects that can be started there

### Requirement: Water tiles
The Detroit River and connection to Lake Erie SHALL be represented as non-playable water tiles that border the southern edge of the map. Water tiles serve as context and enable water transit projects on adjacent waterfront tiles.

#### Scenario: Water tiles are visible but not directly playable
- **WHEN** the map renders
- **THEN** the Detroit River appears as water tiles along the south edge that cannot have projects placed directly on them but provide adjacency bonuses to waterfront neighborhoods

### Requirement: Existing uses on tiles
Each tile SHALL have an existing_uses array describing what currently occupies the land: vacant_lot, abandoned_factory, occupied_housing, small_businesses, community_garden, church, school, active_industrial, parking_lot, brownfield, or historic_site. A single tile may have multiple existing uses reflecting the mixed character of a real neighborhood.

#### Scenario: Tile with small businesses
- **WHEN** a tile has existing_uses including "small_businesses"
- **THEN** the tile detail panel displays the businesses and any project placed there shows a displacement warning

#### Scenario: Tile with occupied housing
- **WHEN** a tile has existing_uses including "occupied_housing"
- **THEN** the tile detail panel displays current resident population and any transformation project shows a gentrification risk indicator

#### Scenario: Tile with abandoned factory
- **WHEN** a tile has existing_uses including "abandoned_factory"
- **THEN** the tile's contamination_level starts at 40% or higher and environmental remediation is required before ecology projects can begin

### Requirement: Displacement consequences for existing uses
Transforming a tile with active existing uses SHALL trigger displacement consequences unless the player takes mitigating action. Displacement reduces Community Trust in the affected tile and adjacent tiles.

#### Scenario: Displacing small businesses
- **WHEN** the player starts a project on a tile with existing_uses "small_businesses" WITHOUT selecting the "include existing businesses" option
- **THEN** the businesses are displaced, Community Trust drops by 8% in that neighborhood, Community Trust drops by 3% in each adjacent neighborhood, and a "Business Displacement" event triggers next turn

#### Scenario: Including existing businesses in project
- **WHEN** the player starts a project on a tile with existing_uses "small_businesses" AND selects the "include existing businesses" option
- **THEN** the project cost increases by 40%, the project duration increases by 1 turn, but Community Trust increases by 5% in that neighborhood and no displacement occurs

#### Scenario: Displacing occupied housing
- **WHEN** the player starts a project on a tile with existing_uses "occupied_housing" WITHOUT an active anti-displacement policy (Land Trust or Rent Stabilization)
- **THEN** gentrification_pressure on the tile increases by 25%, Community Trust drops by 12% in that neighborhood, a "Resident Displacement" narrative event triggers, and Political Will drops by 5% city-wide

#### Scenario: Converting industrial tiles without job replacement
- **WHEN** the player starts a non-industrial project on a tile with existing_uses "active_industrial" WITHOUT an active "Green Jobs Transition" project or policy in the same or adjacent neighborhood
- **THEN** Community Trust drops by 10% in that neighborhood, Budget revenue decreases by $200K/year (lost tax base), and a "Job Loss" event triggers that persists for 4 turns unless addressed

#### Scenario: Converting industrial tiles with job replacement
- **WHEN** the player starts a non-industrial project on a tile with existing_uses "active_industrial" AND a "Green Jobs Transition" project or policy is active in the same or adjacent neighborhood
- **THEN** Community Trust drops by only 3% (transition friction), no budget revenue loss occurs, and the project gains a +2% Community Trust bonus on completion

### Requirement: Contamination and remediation
Tiles with contamination_level > 0% SHALL require environmental remediation before ecology, food, or community projects can be started. Remediation is itself a project (Soil Remediation) that reduces contamination. Vacant lots have a 30% chance of hidden contamination discovered when the first project is attempted.

#### Scenario: Contaminated tile blocks food projects
- **WHEN** the player attempts to start a Food Forest on a tile with contamination_level > 20%
- **THEN** the system blocks the project and displays: "Soil contamination too high (current: X%). Remediation required before food projects. Start Soil Remediation project first."

#### Scenario: Soil remediation project
- **WHEN** a Soil Remediation project completes on a tile
- **THEN** the tile's contamination_level decreases by 50% (of current level), ecological health increases by 10%, and the tile becomes eligible for ecology/food projects if contamination is now at or below 20%

#### Scenario: Hidden contamination on vacant lot
- **WHEN** the player starts any project on a tile with existing_uses "vacant_lot" for the first time
- **THEN** there is a 30% chance contamination is discovered, setting contamination_level to a random value between 25-60%, pausing the project, and requiring remediation before the original project can continue. Budget spent on the paused project is not refunded.

#### Scenario: Delray severe contamination
- **WHEN** the game starts
- **THEN** Delray tiles have contamination_level set to 75% (oil refinery legacy), and the tile detail panel displays an "Environmental Justice Priority" tag

### Requirement: Gentrification pressure system
Each tile SHALL track gentrification_pressure (0-100%). Successful project completions increase gentrification pressure on the tile and adjacent tiles. High gentrification pressure displaces residents and erodes Community Trust.

#### Scenario: Project completion raises gentrification pressure
- **WHEN** any project completes on a tile
- **THEN** gentrification_pressure increases by 10% on that tile and by 5% on each adjacent tile

#### Scenario: High-value projects raise more pressure
- **WHEN** a project with budget cost > $500K completes on a tile
- **THEN** gentrification_pressure increases by 15% on that tile and by 8% on each adjacent tile (instead of the base 8%/4%)

#### Scenario: Gentrification pressure threshold - warning
- **WHEN** a tile's gentrification_pressure reaches 50%
- **THEN** a "Gentrification Warning" indicator appears on the tile, a narrative event fires about rising property values, and Community Trust in that neighborhood decreases by 2% per turn until pressure drops below 50%

#### Scenario: Gentrification pressure threshold - displacement
- **WHEN** a tile's gentrification_pressure reaches 75%
- **THEN** a "Displacement Crisis" event triggers, Community Trust drops by 15% in that neighborhood, Community Trust drops by 5% in each adjacent neighborhood, the tile loses "occupied_housing" from existing_uses (residents have left), and Political Will drops by 8% city-wide

#### Scenario: Gentrification pressure natural decay
- **WHEN** a turn resolves
- **THEN** gentrification_pressure on each tile decreases by 1% (natural decay from market stabilization), to a minimum of 0%

### Requirement: Anti-gentrification measures
Specific projects and policies SHALL counter gentrification pressure. These measures reduce gentrification_pressure per turn and protect against displacement events.

#### Scenario: Community Land Trust counters gentrification
- **WHEN** a Community Land Trust project is active or completed on a tile
- **THEN** gentrification_pressure on that tile decreases by an additional 5% per turn (total 6% with natural decay) and displacement events cannot trigger on that tile

#### Scenario: Rent Stabilization policy effect
- **WHEN** a Rent Stabilization policy is enacted city-wide
- **THEN** gentrification_pressure increase from project completions is reduced by 40% on all tiles (e.g., base 8% becomes 4.8%) and the displacement threshold increases from 75% to 85%

#### Scenario: Community ownership project effect
- **WHEN** a Community Ownership project (cooperative housing, community land trust, or mutual aid hub) completes on a tile
- **THEN** gentrification_pressure on that tile drops by 20% immediately and the tile gains "community_owned" tag which halves all future gentrification pressure increases on that tile

### Requirement: Neighborhood-specific traits
Each neighborhood tile SHALL have unique traits that modify gameplay, reflecting the real character, history, and conditions of that Detroit neighborhood.

#### Scenario: Brightmoor traits
- **WHEN** the game starts
- **THEN** Brightmoor tiles have traits: high_vacancy (vacancy rate 70%, project placement costs reduced by 25%), no_infrastructure (water/power projects cost 50% more and take +1 turn), strong_community_networks (community projects gain +5% Community Trust bonus), contamination_level 20% (legacy industrial)

#### Scenario: Downtown traits
- **WHEN** the game starts
- **THEN** Downtown tiles have traits: low_vacancy (vacancy rate 5%, very few open tiles for new projects), corporate_interest (gentrification_pressure starts at 35% and increases 50% faster from project completions), good_infrastructure (infrastructure projects cost 25% less), high_property_values (all project costs +30% due to land acquisition)

#### Scenario: Delray traits
- **WHEN** the game starts
- **THEN** Delray tiles have traits: severe_contamination (contamination_level 75%), environmental_justice_priority (remediation projects receive +$200K federal matching funds), industrial_legacy (existing_uses includes "active_industrial" and "abandoned_factory"), low_trust (Community Trust starts 15% lower than city average due to decades of environmental neglect)

#### Scenario: Midtown traits
- **WHEN** the game starts
- **THEN** Midtown tiles have traits: institutional_anchor (Wayne State University provides +3% Political Will for education-related projects), mixed_income (gentrification_pressure starts at 25%), cultural_hub (narrative actions targeting Midtown are 25% more effective), moderate_vacancy (vacancy rate 30%)

#### Scenario: Eastern Market traits
- **WHEN** the game starts
- **THEN** Eastern Market tiles have traits: food_heritage (food sovereignty projects cost 20% less and complete 1 turn faster), existing_food_network (Food Sovereignty meter gains +3% bonus from any food project here), small_business_dense (existing_uses includes "small_businesses", displacement risk is high), historic_site (demolition-based projects are blocked, renovation-only)

#### Scenario: Belle Isle traits
- **WHEN** the game starts
- **THEN** Belle Isle tiles have traits: park_land (terrain type "park", no housing projects allowed), ecological_anchor (provides +2% ecological health per turn to all adjacent waterfront tiles), public_access (any project here gives +3% Community Trust city-wide), state_jurisdiction (projects require 10% more Political Will due to state park status)

#### Scenario: Southwest Detroit / Mexicantown traits
- **WHEN** the game starts
- **THEN** Southwest/Mexicantown tiles have traits: cultural_identity (community projects gain +5% Community Trust, but gentrification pressure from non-community projects increases by 25%), active_commercial (existing_uses includes "small_businesses", high displacement risk), environmental_burden (proximity to industrial corridor, contamination_level 35%), strong_organizing (community-led projects cost 15% less here)

#### Scenario: Indian Village traits
- **WHEN** the game starts
- **THEN** Indian Village tiles have traits: historic_housing (existing_uses includes "occupied_housing" with high property values, gentrification_pressure starts at 40%), architectural_heritage (restoration projects cost 20% less), low_vacancy (vacancy rate 10%), affluent_enclave (Community Trust gains from projects here are 30% lower because residents are already comfortable)

#### Scenario: Corktown traits
- **WHEN** the game starts
- **THEN** Corktown tiles have traits: ford_development (gentrification_pressure starts at 45% due to Ford's Michigan Central project), rapid_change (gentrification pressure increases 75% faster), mixed_use (supports both commercial and community projects), transit_adjacent (infrastructure projects gain +10% effectiveness)

### Requirement: Adjacency bonus system
Adjacent transformed tiles SHALL provide specific bonuses to each other. The system calculates adjacency bonuses during the Resolve phase of each turn based on the types of projects completed on neighboring tiles.

#### Scenario: Food project adjacency bonus
- **WHEN** two adjacent tiles both have completed food projects (Food Forest, Community Kitchen, Urban Farm)
- **THEN** each tile gains +5% Food Sovereignty bonus per turn and a "Food Corridor" tag appears on both tiles

#### Scenario: Ecology project near water
- **WHEN** a tile with a completed ecology project (Rain Garden, Wetland Restoration, Native Planting) is adjacent to a water tile (Detroit River, lake)
- **THEN** the ecology project tile gains +10% Ecological Health bonus on completion and +2% Ecological Health per turn ongoing

#### Scenario: Greenway connection bonus
- **WHEN** a Greenway project on one tile connects to a Greenway project on an adjacent tile
- **THEN** both tiles gain a "Connected Greenway" tag, transit effectiveness increases by 15% for both neighborhoods, and Community Trust gains +2% in both neighborhoods per turn

#### Scenario: Solar grid adjacency
- **WHEN** two adjacent tiles both have completed Solar Grid projects
- **THEN** energy production increases by 20% for both tiles (shared grid efficiency), Budget gains +$100K/year from energy surplus sales, and a "Microgrid" tag appears

#### Scenario: Community project cluster bonus
- **WHEN** 3 or more adjacent tiles all have completed community projects (Maker Space, Community Kitchen, Mutual Aid Hub, Land Trust)
- **THEN** all tiles in the cluster gain a "Community Hub" tag, Community Trust increases by +3% per turn in those neighborhoods, narrative actions targeting any tile in the cluster affect all tiles in the cluster, and gentrification pressure increase from future projects in the cluster is reduced by 25%

#### Scenario: Wildlife corridor chain
- **WHEN** 4 or more adjacent tiles form a connected chain of completed ecology or restoration projects
- **THEN** all tiles in the chain gain a "Wildlife Corridor" tag, Ecological Health increases by +3% per turn on all corridor tiles, and the corridor contributes progress toward the regional Wildlife Corridor continental goal (Beyond the Map stage)

#### Scenario: Mixed-use adjacency penalty
- **WHEN** an active industrial tile is adjacent to a tile with a completed food or community project
- **THEN** the food/community project tile's ecological health gain is reduced by 10% (pollution spillover) and Community Trust gain from that project is reduced by 5% (environmental concern)

#### Scenario: Adjacency bonus stacking limit
- **WHEN** a tile would receive more than 3 adjacency bonuses simultaneously
- **THEN** only the 3 highest-value bonuses apply and the system displays "Adjacency cap reached" on the tile detail panel

### Requirement: Spatial strategy trade-off
The adjacency system SHALL create a meaningful trade-off between clustering projects for bonuses versus spreading projects for coverage. Clustering provides adjacency bonuses but concentrates gentrification pressure. Spreading provides wider coverage and distributes gentrification pressure but sacrifices adjacency bonuses.

#### Scenario: Cluster strategy consequences
- **WHEN** the player completes 4 projects on adjacent tiles in the same neighborhood
- **THEN** those tiles receive strong adjacency bonuses (+5% to +15% various meters) BUT gentrification_pressure on all 4 tiles and their neighbors is elevated (each project completion raised pressure on the others), creating a gentrification hotspot

#### Scenario: Spread strategy consequences
- **WHEN** the player completes 4 projects on non-adjacent tiles in different neighborhoods
- **THEN** those tiles receive no adjacency bonuses but gentrification_pressure is distributed across the city (no single neighborhood bears concentrated pressure), and each transformed tile provides a "neighborhood anchor" that slightly boosts meters city-wide (+1% Community Trust per transformed neighborhood with at least 1 project)
