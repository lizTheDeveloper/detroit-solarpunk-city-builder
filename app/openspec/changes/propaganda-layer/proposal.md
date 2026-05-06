## Why

Real crises aren't neutral — every headline gets framed differently by different factions with different interests. The game needs to show players how the same facts are spun by corporations, community organizations, market analysts, and government agencies. This isn't editorializing; it's holding up a mirror to how information actually flows. The propaganda layer takes classified headlines from the live-news-pipeline and generates multiple interpretation frames using LLM batch processing. The game then selects which frame to surface based on the player's current game state and active antagonist factions.

## What Changes

- LLM batch job generates 2-3 propaganda frames per classified headline (establishment, community, market perspectives)
- Frames are pre-generated server-side (not runtime) and stored alongside headline data
- Game client selects which frame to surface based on active arc antagonists and player state
- Memeorandum cluster data used to ground frames in real outlet coverage patterns
- Frame selection is reactive: antagonist framing adapts to what the player has built (threatens their interests)
- Counter-narrative system enhanced to reference specific propaganda frames when firing

## Capabilities

### New Capabilities
- `frame-generation`: LLM batch job that generates multiple interpretation frames for each classified headline. Each frame represents a faction's spin on the same facts — grounded in real outlet coverage patterns from memeorandum clusters.
- `frame-selection`: Game-state-aware selection of which propaganda frame to surface to the player. Selects based on: active arc antagonists, player's dependency web state, and which framing creates the most tension for the player's current position.
- `antagonist-voice`: Configurable voice profiles for each antagonist faction (DTE, developers, state legislature, etc.) that guide LLM frame generation tone and talking points. Derived from real PR language and public statements.

### Modified Capabilities

## Impact

- Extends headline API response to include propaganda frames per headline
- LLM batch cost increases (~2-3x per headline for frame generation vs classification alone)
- Depends on live-news-pipeline (classified headlines) and crisis-arc-engine (antagonist definitions, active arcs)
- Counter-narrative system (`src/systems/narrative.ts`) gains frame-aware text generation
- Game UI needs to display framed headlines with attribution (who's saying this)
