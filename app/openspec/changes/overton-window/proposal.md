## Why

Some solutions to real problems are politically impossible — not because they don't work, but because people aren't ready to hear them. Humanure composting, nuclear salt reactors, land expropriation, decriminalization — these are taboo solutions that require prior groundwork before they can even be proposed. The Overton window mechanic gates these solutions behind public opinion thresholds. Players must first shift opinion through narrative actions and education programs before taboo solutions unlock. This creates a natural arc: discover the science → shift public discourse → unlock the radical option. Normalized solutions (rain gardens, community meetings) are always available. The tension between "what works" and "what's politically possible" is the core of the game.

## What Changes

- Crisis fork choices gain a third category: taboo solutions (alongside normalized choices)
- Taboo solutions are visible but locked until public opinion on their topic reaches a threshold
- Public opinion system (already exists) becomes the gating mechanism for solution availability
- Narrative actions (education_program, media_campaign) become the lever for shifting opinion toward taboo topics
- Each taboo solution has a "social cost" that decreases as opinion rises (early adopters pay trust penalty, late adopters don't)
- Research papers surface as the "why this works" justification when taboo solutions are close to unlocking

## Capabilities

### New Capabilities
- `taboo-solutions`: Solution category that is visible but locked behind public opinion thresholds. Each taboo solution specifies: which opinion topic gates it, the unlock threshold, the social cost curve, and the research papers that justify it.
- `opinion-gating`: Mechanism that checks public opinion state against solution requirements. Determines lock/unlock status and current social cost for each taboo solution. Integrates with existing PublicOpinion system.
- `solution-social-cost`: Dynamic trust/will penalty for choosing taboo solutions. Cost decreases as opinion rises above the unlock threshold. At high opinion levels, formerly taboo solutions become normalized (zero social cost).

### Modified Capabilities

## Impact

- `src/systems/narrative.ts`: education_program actions gain targeted opinion-shifting toward specific taboo topics
- `src/state/types.ts`: PublicOpinion extended with additional topic dimensions matching taboo solution gates
- Crisis fork events gain taboo choice slots that reference opinion gating
- Research paper surfacing triggered when opinion is within 10 points of unlock threshold (teasing the possibility)
- UI shows locked taboo solutions with progress indicator toward unlock
- Existing public opinion drift mechanics create tension (opinion decays if not maintained)
