You are playtesting a Detroit solarpunk city builder game. Your job is to play the game in the browser using Playwright, make strategic decisions, and write a playtest report when you're done.

## Setup

1. Start the dev server: run `cd /Users/annhoward/src/city_builder/app && npm run dev` in the background
2. Wait a few seconds for Vite to start, then navigate to http://localhost:5173
3. Take a screenshot to see the initial game state

## How the Game Works

You are playing a Detroit community organizer managing neighborhood transformation over 64+ turns (16 turns = 1 mayoral term). The game has:

- **Meters** shown at the top: Trust, Eco, Food, Political Will, Budget, Climate Pressure
- **Tiles** (neighborhoods): Brightmoor, Warrendale, Corktown, Eastern Market, Indian Village, North End, Southwest Detroit, Hamtramck
- **Projects**: You can start ecological, infrastructure, and community projects on tiles
- **Proposals**: Community leaders propose projects — you accept, modify, or defer
- **Narrative Actions**: Media campaigns, community meetings, education programs
- **Policies**: Enact city-wide policies when you have enough Political Will
- **Elections**: Every 16 turns you face re-election. You LOSE if your score is below 45.

## Win Conditions

Progress through stages: Awakening → Transition → Restoration → Beyond
- Transition: eco ≥ 35 OR food ≥ 25 OR trust ≥ 65
- Restoration: eco ≥ 55 AND food ≥ 40 AND trust ≥ 50 AND 2+ policies
- Beyond: eco ≥ 75 AND food ≥ 60 AND trust ≥ 70 AND 4+ policies AND 1+ coalition
- Win: In "beyond" stage, get 2 continental goals to 75% OR survive to turn 80 with all meters > 50

## Strategy Tips

- **Eco decays every turn** — always build eco projects (food forests, native plantings, rain gardens, wetlands)
- **Synergies**: Projects on same/adjacent tiles give bonuses. Cluster related projects.
- **Land trusts fight gentrification**: Build them early. Without them, development displaces people and you lose elections.
- **Three project modes**:
  - Player-initiated: normal cost/speed, causes gentrification
  - Community-led (trust ≥ 30): 30% more expensive, 50% slower, but way less gentrification + more trust
  - Direct action (trust ≥ 50): nearly FREE, HALF duration, ZERO gentrification — but costs 8 trust upfront, angers council (-5 disposition each), and risks antagonist escalation. The punk option.
- **Accept proposals**: They build trust with community leaders.
- **Budget**: Spend it! Hoarding = eco decaying = losing. But watch maintenance costs — completed projects drain budget each turn.
- **Policies**: Enact them when Will is high enough — you need 2+ for restoration stage.
- **Coalitions**: Form them when 2+ leaders have trust ≥ 40. Look for a "Form Coalition" option in the Leaders or Council area.
- **Seasons matter**: Spring = eco projects faster. Summer = infrastructure faster. Fall = community projects faster + food harvest bonus. Winter = political will regens faster.
- **Reclaim vacant lots**: Click a tile and look for "Reclaim Lot" (requires trust ≥ 30). Each reclaimed lot adds +1 project capacity. Free but adds slight gentrification without a land trust. Reclaimed lots also generate passive eco (rewilding). If trust drops below 20, you lose unprotected reclaimed lots.
- **Trust is harder to maintain now**: Trust decays faster above 70%. Food alone won't sustain it — you need projects completing. Proposal funding gives less trust than before.
- **Budget has diminishing returns**: Revenue from completed projects caps out. Don't rely on snowballing income.

## How to Play

Each turn:
1. Take a snapshot of the page to see current state
2. Check for any pending proposals or events (they may appear as panels/modals)
3. Click on tiles to see what projects are available
4. Start projects strategically (prefer eco projects, use community-led mode, cluster on adjacent tiles)
5. Use narrative actions if available
6. Click "End Turn" when done
7. Repeat

Use `browser_snapshot` frequently to read the current game state. Use `browser_click` to interact with buttons and panels. Use `browser_take_screenshot` when you need to see visual layout.

## Your Mission

Play for at least 32 turns (2 terms). Try to reach the Restoration stage. Document interesting decisions and tensions you encounter. When you're done (win, lose, or 32+ turns), write a detailed playtest report to `/Users/annhoward/src/city_builder/app/playtest-gemini-browser-report.md` covering:

1. Final result (win/loss/stage reached)
2. Turn-by-turn meter progression
3. Key strategic decisions and why you made them
4. What felt good/bad about the game
5. Balance issues you noticed
6. UI/UX issues (confusing buttons, missing info, etc.)
7. Suggestions for improvement

Be honest about what's broken or confusing — that's the whole point of playtesting.
