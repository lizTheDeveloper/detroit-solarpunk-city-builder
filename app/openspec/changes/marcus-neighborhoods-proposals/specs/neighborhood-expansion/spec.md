## ADDED Requirements

### Requirement: Detroit has 16-18 neighborhood tiles
The game SHALL initialize with 16-18 neighborhood tiles covering recognizable areas of Detroit. Each tile SHALL use the existing `Tile` type with realistic starting metrics based on real Detroit data (vacancy rates from census, contamination from EPA/DEQ records, gentrification pressure from real estate trends).

#### Scenario: New game has full neighborhood coverage
- **WHEN** a new game is created via `initGame()`
- **THEN** the `tiles` object SHALL contain 16-18 entries covering: the existing 8 neighborhoods plus Midtown, Mexicantown, Delray, Grandmont-Rosedale, West Village, Palmer Park, Bagley/University District, Livernois-McNichols, Fitzgerald, and Rouge Park

#### Scenario: Each tile has complete data
- **WHEN** any tile is accessed from game state
- **THEN** it SHALL have non-default values for: `terrain`, `ecologicalHealth`, `contamination`, `gentrificationPressure`, `vacancyRate`, `existingUses`, `neighborhoodTraits`, and `adjacentTiles`

### Requirement: Neighborhoods form a connected adjacency graph
All neighborhood tiles SHALL be connected via `adjacentTiles` references forming a graph where every tile is reachable from every other tile through adjacency links. Adjacency SHALL reflect real Detroit geography.

#### Scenario: Graph connectivity
- **WHEN** a graph traversal is performed starting from any tile following `adjacentTiles` links
- **THEN** every other tile SHALL be reachable

#### Scenario: Adjacency reflects geography
- **WHEN** two tiles are listed as adjacent
- **THEN** the corresponding real Detroit neighborhoods SHALL share a border or be within reasonable proximity

### Requirement: New neighborhoods have appropriate terrain types
Each new neighborhood tile SHALL have a terrain type that reflects its real-world character: `urban-dense` for high-density areas, `urban-sparse` for residential neighborhoods, `industrial` for areas with heavy industrial use, `park` for significant greenspace, `vacant` for high-vacancy areas.

#### Scenario: Midtown terrain
- **WHEN** the Midtown tile is created
- **THEN** its terrain SHALL be `urban-dense` reflecting its university-adjacent density

#### Scenario: Delray terrain
- **WHEN** the Delray tile is created
- **THEN** its terrain SHALL be `industrial` reflecting the Marathon refinery and industrial corridor

#### Scenario: Rouge Park terrain
- **WHEN** the Rouge Park tile is created
- **THEN** its terrain SHALL be `park` reflecting the major greenspace

#### Scenario: Fitzgerald terrain
- **WHEN** the Fitzgerald tile is created
- **THEN** its terrain SHALL be `vacant` reflecting the high vacancy rate and rewilding patterns

### Requirement: New community leaders for new neighborhoods
The game SHALL add 5-7 new community leaders to cover new neighborhoods. Each leader SHALL have: a name, backstory, trust level, advocacy power, priorities (project preferences), and personality traits. New leaders SHALL draw on real Detroit organizing traditions.

#### Scenario: Leaders cover all new neighborhoods
- **WHEN** a new game is created
- **THEN** every new neighborhood tile SHALL have at least one associated leader (either a new leader or an existing leader whose territory expands)

#### Scenario: Existing leaders expand territory
- **WHEN** a new game is created
- **THEN** Lucia Espinoza SHALL span Mexicantown, Elder Whitehorse SHALL span West Village, Tamika Jefferson SHALL span Fitzgerald, and Big Mike Novak SHALL span Rouge Park via secondary tile assignments

#### Scenario: New leader archetypes
- **WHEN** new leaders are created
- **THEN** they SHALL include at minimum: an academic/activist type (Midtown), an environmental justice organizer (Delray), a neighborhood association leader (Grandmont-Rosedale), and a small business coalition leader (Livernois-McNichols)

### Requirement: Map displays all neighborhoods with GeoJSON polygons
The map panel SHALL render all 16-18 neighborhoods using simplified GeoJSON polygon boundaries instead of bounding boxes. Polygons SHALL be derived from Detroit Open Data neighborhood boundary data, simplified to reduce point count while preserving recognizable shapes.

#### Scenario: Map renders new neighborhoods
- **WHEN** the map panel is displayed
- **THEN** all 16-18 neighborhoods SHALL appear as filled polygon regions on the map

#### Scenario: Polygons replace bounding boxes
- **WHEN** the map source data is loaded
- **THEN** neighborhood boundaries SHALL be defined as GeoJSON Polygon features, not bounding rectangles

#### Scenario: Neighborhoods are visually distinguishable
- **WHEN** the map is rendered
- **THEN** adjacent neighborhoods SHALL be visually distinguishable through boundary lines and/or distinct fill colors based on tile state

### Requirement: Sidebar groups neighborhoods by geographic cluster
With 16-18 neighborhoods, the sidebar neighborhood list SHALL group tiles by geographic cluster (e.g., Northwest, Northeast, Central, Southwest, Southeast) with expand/collapse functionality to prevent overwhelming the UI.

#### Scenario: Neighborhoods are grouped
- **WHEN** the sidebar neighborhood list is displayed
- **THEN** neighborhoods SHALL be organized under collapsible geographic cluster headers

#### Scenario: Groups are collapsible
- **WHEN** a user clicks a geographic cluster header
- **THEN** the neighborhoods within that cluster SHALL toggle between expanded and collapsed states

#### Scenario: Default expansion state
- **WHEN** the sidebar first loads
- **THEN** all geographic clusters SHALL be expanded by default so new players see the full map
