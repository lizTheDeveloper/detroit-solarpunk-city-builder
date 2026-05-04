## ADDED Requirements

### Requirement: PixiJS tile rendering
The map renderer SHALL use PixiJS to render the Detroit tile map as a 2D grid of neighborhood tiles with distinct visual styles per terrain type and progression stage.

#### Scenario: Tiles render with correct visuals
- **WHEN** the map renders a tile with terrain type "vacant" at visual stage "dystopia"
- **THEN** the tile appears with gray/brown coloring, sparse/dead vegetation indicators, and concrete textures

#### Scenario: Tiles reflect transformation
- **WHEN** a tile's visual stage changes from "dystopia" to "transition"
- **THEN** the tile re-renders with mixed green/gray coloring, scattered vegetation, and visible project infrastructure

### Requirement: Zoom and pan
The map renderer SHALL support smooth zoom (scroll wheel) and pan (click-drag) to navigate the Detroit map. Zoom has minimum (see whole city) and maximum (see individual tile detail) bounds.

#### Scenario: Zoom in to tile detail
- **WHEN** the player scrolls to zoom in
- **THEN** the map smoothly zooms toward the cursor position, revealing more detail on tiles, up to the maximum zoom level

#### Scenario: Pan across map
- **WHEN** the player click-drags on the map
- **THEN** the map viewport moves smoothly following the drag direction

### Requirement: Seasonal visual changes
The map renderer SHALL adjust visual presentation based on current season: Spring (bright greens, blooming), Summer (full canopy, heat shimmer on developed tiles), Fall (warm colors, harvest indicators), Winter (bare trees, snow coverage, muted palette).

#### Scenario: Winter rendering
- **WHEN** the current season is Winter
- **THEN** all tiles render with winter palette: snow coverage on transformed tiles, muted grays on dystopia tiles, bare tree sprites

### Requirement: Layer compositing
The map renderer SHALL composite multiple layers: base terrain, infrastructure overlay, project indicators (in-progress markers), selection highlight, and effects layer (weather, season).

#### Scenario: Project indicator layer
- **WHEN** a tile has an active project
- **THEN** a project indicator sprite renders above the base terrain showing project type and progress

#### Scenario: Selection highlight
- **WHEN** the player hovers or clicks a tile
- **THEN** a highlight layer renders a border/glow around the selected tile

### Requirement: Tile click interaction
The map renderer SHALL detect tile clicks and communicate the clicked tile identity to the React UI layer for panel updates.

#### Scenario: Click detected and communicated
- **WHEN** the player clicks on the Brightmoor tile in the PixiJS canvas
- **THEN** the renderer identifies the clicked tile as "brightmoor" and dispatches an event that the React UI layer receives to update the side panel

### Requirement: Performance target
The map renderer SHALL maintain 60fps during zoom/pan operations with up to 50 tiles rendered simultaneously with all layers active.

#### Scenario: Smooth interaction
- **WHEN** the player rapidly zooms and pans across the full map
- **THEN** the frame rate remains at or above 60fps with no visible stuttering
