## ADDED Requirements

### Requirement: Relationship scores with all named characters

The system SHALL track a relationship score between the player and every named character: 9 council members (disposition, -100 to +100) and 8 community leaders (trust, -100 to +100). These are separate from city-wide meters. A council member may have high disposition toward the player while the city-wide Community Trust is low (the player has personally cultivated that relationship) or low disposition while Community Trust is high (the player has neglected that individual's concerns). The same applies to community leader trust.

#### Scenario: Relationship diverges from city meter
- **WHEN** city-wide Community Trust is 75% but the player has repeatedly rejected Kez Monroe's housing proposals
- **THEN** Kez Monroe's trust is -25 (she opposes the player despite general citywide satisfaction) and she is actively organizing anti-gentrification demonstrations that create localized Community Trust penalties in Corktown

#### Scenario: Relationship is high despite low citywide trust
- **WHEN** city-wide Community Trust is 35% (low) but the player has consistently supported Grace Okafor-Williams' food projects
- **THEN** Grace's trust is +55 and she is an active advocate in Brightmoor, creating a pocket of high community engagement even as the rest of the city is dissatisfied

### Requirement: Six channels for relationship change

Relationships SHALL change through exactly six channels, each with defined point ranges:

1. **Proposal responses** (community leaders only): Accept +10, Modify +3, Defer -5, Reject -15. These are the primary driver of leader trust.

2. **Policy effects on priorities**: When the player enacts or revokes a policy that directly affects a character's priority issues, their relationship changes by +5 to +15 (positive alignment) or -5 to -15 (negative alignment). Example: passing environmental justice policy gives Tomoko Reyes +10 disposition; cutting arts funding gives JT Thibodeaux -10.

3. **District/neighborhood conditions**: At each turn's Resolve phase, characters evaluate conditions in their district or neighborhood. If conditions have improved since last turn (meters up, projects completed, events resolved), relationship increases by +2 to +5. If conditions have degraded (crisis unresolved, meter drops, project cancelled), relationship decreases by -2 to -8. This creates a slow, persistent pull based on outcomes rather than promises.

4. **Narrative actions targeting their concerns**: When the player runs a narrative action aligned with a character's priorities in their area, relationship increases by +3 to +8. Running a community meeting in Brightmoor about food sovereignty when Grace is watching gives +8 (high alignment). Running a media campaign about budget reform in Brightmoor gives +1 (low alignment -- not her issue). This rewards the player for understanding what each character actually cares about.

5. **Direct interaction actions**: The player may spend 1 narrative action per turn on a "direct engagement" with a specific character: visiting their neighborhood, attending their event, or meeting one-on-one. This gives +5 to +10 relationship regardless of policy alignment (showing up matters) and reveals the character's current concerns and upcoming proposals. Limited to 1 direct engagement per turn to prevent relationship farming.

6. **Events and crises**: Major events in a character's area create relationship tests. If the player responds well to a crisis in their district, +8 to +15. If the player ignores it or responds poorly, -10 to -20. Events are the highest-variance channel -- they can make or break relationships.

#### Scenario: Policy enactment affects multiple relationships
- **WHEN** the player enacts "Urban Agriculture Zoning" ordinance
- **THEN** Marlena Calloway gains +12 disposition (directly supports her food sovereignty priority), Grace Okafor-Williams gains +10 trust (enables her proposals), Pat Lundgren loses -8 disposition (she sees it as government overreach on zoning), and Victor Marek gains +3 disposition (he is neutral but appreciates the economic activity it enables)

#### Scenario: Direct engagement reveals information
- **WHEN** the player spends 1 narrative action on "Visit Elder Whitehorse in Indian Village"
- **THEN** Whitehorse's trust increases by +7, the player learns that Whitehorse's next proposal will be an "Intergenerational Mentorship Center," and the player receives a hint about an upcoming flooding risk along the waterfront that Whitehorse noticed from decades of living there

#### Scenario: Crisis response creates relationship swing
- **WHEN** a water contamination event hits Southwest Detroit and the player immediately accepts Lucia Espinoza's emergency remediation proposal
- **THEN** Lucia's trust increases by +15 (crisis response), Community Trust in Southwest Detroit is preserved, and Tomoko Reyes' disposition increases by +8 (she sees the player prioritizing environmental justice). If the player had deferred the proposal, Lucia would lose -20 trust and organize a public water rights protest.

### Requirement: Relationship thresholds unlock and trigger behaviors

Specific relationship thresholds SHALL trigger character behaviors:

**Community Leaders:**
- **Trust >= 40 (Advocate)**: Leader actively promotes the player in their neighborhood. Narrative actions in that area gain +5% effectiveness. Leader's portrait shows a green indicator.
- **Trust >= 60 (Champion)**: Leader joins coalition-building activities (see below). Their proposals come with a pre-committed council vote from the aligned council member. Leader campaigns during re-election for the player.
- **Trust >= 80 (Partner)**: Leader co-designs projects with the player. The player can propose projects in that neighborhood at community-proposal prices (85% cost, 150% trust). Leader automatically counters antagonist narratives in their area.
- **Trust 0 to -20 (Disillusioned)**: Leader stops proposing projects. Their neighborhood generates no community proposals. Community Trust in that area stagnates.
- **Trust -20 to -50 (Opposition)**: Leader organizes against the player. Generates negative narrative events (-3% Political Will per turn). Contacts allied council members to vote NO on the player's priorities.
- **Trust <= -50 (Hostile)**: Leader launches organized resistance. Generates -5% Political Will per turn, organizes demonstrations that reduce Community Trust citywide by -1% per turn, and actively campaigns against the player during re-election. Recovering from Hostile requires 3+ consecutive positive actions AND a direct engagement, and even then, trust recovers only to -20 (the relationship is permanently scarred).

**Council Members:**
- **Disposition >= 30 (Lean Yes)**: Member votes YES on most policies aligned with their priorities, even if the raw vote score is marginal. They give the player the benefit of the doubt.
- **Disposition >= 60 (Ally)**: Member actively lobbies other council members toward YES on the player's proposals (+5 to other members' vote scores). They publicly support the player.
- **Disposition >= 80 (Coalition Partner)**: Member co-sponsors policies, reducing their political will cost by 15%. They propose their own policies that align with the player's agenda.
- **Disposition 0 to -20 (Skeptic)**: Member votes based purely on vote score calculation with no goodwill bonus. They ask tough questions in public sessions.
- **Disposition -20 to -50 (Opponent)**: Member votes NO on most player proposals unless the policy directly benefits their district. They organize opposition voting blocs.
- **Disposition <= -50 (Adversary)**: Member actively campaigns against the player. They attempt to form a blocking coalition (lobby 2+ other members to vote NO), increase the political will cost of all policies by 10% (representing political friction), and may initiate recall proceedings if at least 2 other council members are also below -30.

#### Scenario: Community leader becomes a champion
- **WHEN** Grace Okafor-Williams' trust reaches 60 after the player accepts 4 of her food sovereignty proposals over 8 turns
- **THEN** Grace becomes a Champion: her next proposal comes with a guaranteed YES vote from Marlena Calloway (District 1, food sovereignty ally), her portrait shows a gold indicator, and during re-election she campaigns for the player in west side neighborhoods (+5% Community Trust in those tiles during the re-election turn)

#### Scenario: Council member becomes an adversary
- **WHEN** Frank Bukowski's disposition drops to -55 after the player enacts 3 policies he opposed without addressing any of his district's concerns
- **THEN** Bukowski becomes an Adversary: he lobbies Pat Lundgren and Bobby Slade to form a blocking coalition, all player policies cost 10% more political will, and if Lundgren and Slade both drop below -30, Bukowski initiates recall proceedings (a 4-turn crisis event requiring Community Trust > 60% to survive)

#### Scenario: Hostile leader recovery is possible but slow
- **WHEN** Kez Monroe's trust is -55 (Hostile) and the player accepts her emergency housing proposal, visits Corktown directly, and passes an anti-displacement ordinance over 3 consecutive turns
- **THEN** Kez's trust recovers from -55 to -20 (Disillusioned, not Opposition) -- the relationship is permanently damaged but the active hostility stops. She will not become an advocate again for at least 8 more turns of consistent positive action.

### Requirement: Relationship is distinct from agreement

The system SHALL track a character's relationship with the player (trust/disposition) separately from their agreement with the player's current agenda. A character can have high trust but disagree with a specific policy (they trust the player's intentions but think this particular approach is wrong). A character can have low trust but agree with a policy (they support the idea but do not believe the player will follow through).

This distinction SHALL affect behavior: a high-trust, low-agreement character votes NO but does not organize opposition and may suggest modifications. A low-trust, high-agreement character votes YES on this specific policy but does not become an advocate and watches for betrayal.

#### Scenario: High trust, low agreement
- **WHEN** Elder Whitehorse has trust +55 but the player proposes demolishing a historic building in Indian Village for a solar installation
- **THEN** Whitehorse votes/signals NO on this specific proposal and says: "I trust you, Mayor. But this building is part of us. Find another way." He does not organize opposition or lose trust -- he simply disagrees. His trust remains +55 and he proposes an alternative: "Rooftop Solar on Historic Buildings" that preserves the structure.

#### Scenario: Low trust, high agreement
- **WHEN** Pat Lundgren has disposition -25 but the player proposes a fiscal accountability ordinance that aligns with her budget discipline priority
- **THEN** Lundgren votes YES on this specific policy but her disposition does not increase (she thinks the player is pandering, not genuine). She says: "Finally, something sensible. I will believe it when I see the numbers." If the policy succeeds and budget improves, she gains +5 disposition. If it fails, she loses -10 ("I knew it was a stunt").

### Requirement: Coalition building between community leaders

When 3 or more community leaders all have trust >= 40 toward the player, the system SHALL enable coalition mechanics. The player can propose a "Community Coalition" targeting a shared concern. Coalitions provide:

- **Joint narrative actions**: Coalition members pool advocacy, giving the player a special narrative action worth 200% of a normal action on the coalition's shared topic.
- **Joint project proposals**: The coalition proposes a large-scale joint project spanning 3+ neighborhoods that would be impossible for any single leader to propose.
- **Council pressure**: The coalition generates +5 disposition toward all council members on policies related to the coalition's topic (representing organized community voice).
- **Antagonist resistance**: The coalition automatically generates counter-narratives against the relevant antagonist at no cost to the player (community self-defense).

Coalitions require maintenance: if any member's trust drops below 30, the coalition weakens. If 2+ members drop below 30, the coalition dissolves. The player cannot be in more than 2 active coalitions simultaneously.

#### Scenario: Food sovereignty coalition forms
- **WHEN** Grace Okafor-Williams (trust 50), Tamika Jefferson (trust 45), and Elder Whitehorse (trust 42) all have trust >= 40 and the player proposes a "Food Sovereignty Coalition"
- **THEN** the coalition activates: the player gains a special "Food Sovereignty Summit" narrative action (200% normal effectiveness), the three leaders jointly propose "Detroit Food Network" (a 3-neighborhood food infrastructure project costing $2M with +15% Food Sovereignty), all council members gain +5 disposition on food-related votes, and the coalition automatically counters Sterling Cross's narratives about vacant land with "community gardens feed families" counter-narratives

#### Scenario: Coalition dissolves due to neglect
- **WHEN** the Food Sovereignty Coalition is active but Tamika Jefferson's trust drops to 28 (below 30) and Elder Whitehorse's trust drops to 25 after the player repeatedly defers their non-food proposals
- **THEN** the coalition dissolves: the special narrative action is lost, the joint project is cancelled if not yet completed, the council disposition bonus ends, and each member loses an additional -5 trust from the dissolution ("You brought us together and then abandoned us")

### Requirement: Re-election mechanics integrate relationships

The re-election event (turn 16 and every 16 turns) SHALL integrate character relationships into the outcome. The re-election score is computed as:

- Base: Community Trust percentage (0-100 points)
- Council support: +3 points per council member with disposition >= 30, -3 points per member with disposition <= -30
- Community advocate bonus: +5 points per community leader with trust >= 40
- Community opposition penalty: -5 points per community leader with trust <= -20
- Active coalition bonus: +8 points per active coalition
- Antagonist penalty: -3 points per active antagonist at escalation level 3+

The player wins re-election if total score >= 50. This means a player with moderate citywide trust (50%) but strong character relationships can win, while a player with high citywide trust but broken character relationships might lose.

#### Scenario: Strong relationships save a tough re-election
- **WHEN** re-election triggers with Community Trust at 45% (weak), but the player has 5 council allies (disposition >= 30, +15 points), 4 community advocates (trust >= 40, +20 points), and 1 active coalition (+8 points)
- **THEN** the re-election score is 45 + 15 + 20 + 8 = 88, a comfortable win despite middling citywide trust, because the player built real relationships with real people

#### Scenario: Broken relationships lose an easy re-election
- **WHEN** re-election triggers with Community Trust at 65% (strong), but the player has alienated 4 council members (disposition <= -30, -12 points), 3 hostile community leaders (trust <= -20, -15 points), and 2 antagonists at level 4+ (-6 points)
- **THEN** the re-election score is 65 - 12 - 15 - 6 = 32, a devastating loss despite high citywide approval, because the player treated people as meters to manage instead of partners to support

### Requirement: Relationship decay and maintenance

Relationships SHALL decay slowly toward a neutral baseline if not actively maintained. Each turn with no positive or negative interaction, a relationship drifts 1 point toward zero (positive relationships decrease by 1, negative relationships increase by 1). This means the player cannot simply do one good thing for a leader and ride that goodwill forever -- relationships require ongoing attention.

Exceptions to decay:
- Relationships at Champion level (trust >= 60) or Ally level (disposition >= 60) decay at 0.5 per turn instead of 1 (strong relationships are more resilient).
- Relationships at Hostile (trust <= -50) or Adversary (disposition <= -50) do NOT decay -- active hostility does not fade on its own. The player must take positive action to recover.
- Active coalitions halt decay for all coalition members while the coalition is maintained.

#### Scenario: Neglected relationship erodes over time
- **WHEN** Darius Kemp's trust is +35 and the player does not interact with him, respond to his proposals, or run narrative actions in Eastern Market for 6 turns
- **THEN** Darius's trust drops from +35 to +29 (6 points of decay), he drops below the Advocate threshold (40), and his portrait shifts from green (advocate) to neutral. He begins his next proposal with: "Been a while, Mayor. Thought you forgot about us over here."

#### Scenario: Strong relationships are resilient
- **WHEN** Grace Okafor-Williams' trust is +65 (Champion) and the player does not directly interact with her for 4 turns (but has not done anything negative)
- **THEN** Grace's trust drops from +65 to +63 (0.5 per turn decay for Champions), remaining well above the Champion threshold. Her long relationship with the player provides stability.

#### Scenario: Hostile relationships require active repair
- **WHEN** Kez Monroe's trust is -55 (Hostile) and 10 turns pass with no player interaction
- **THEN** Kez's trust remains -55. Hostility does not heal with time. She continues organizing opposition until the player actively addresses her concerns through accepted proposals, direct engagement, and aligned policy actions.

### Requirement: Relationship visibility and transparency

The player SHALL be able to view each character's current relationship score, recent changes (with sources), priority issues, current stance on pending policies, and a brief text indicating the character's current attitude. The UI does not hide relationship math -- the player should understand exactly why a character feels the way they do and what they could do about it.

#### Scenario: Player views community leader relationship detail
- **WHEN** the player opens Lucia Espinoza's character panel
- **THEN** the panel shows: Trust: +32, Recent changes: [+10 accepted water monitoring proposal (turn 7), -5 deferred clinic proposal (turn 9), +3 narrative action on water rights (turn 10)], Priorities: water rights, pollution cleanup, immigrant rights, Pending: "Delray Health Screening" proposal (waiting for response), Attitude: "Cautiously hopeful. She is watching to see if you follow through."

#### Scenario: Player views council member vote prediction
- **WHEN** the player is about to propose a policy and opens Victor Marek's character panel
- **THEN** the panel shows: Disposition: +18, Vote prediction for pending policy: UNDECIDED (base +18, policy alignment +8 for manufacturing, district condition +2, total +28, threshold for YES is > 0 so likely YES but marginal), Lobbying estimate: spending 1 narrative action would add +12 (high priority alignment), making it a confident YES

### Requirement: Cross-system integration with existing meters

Relationship scores SHALL integrate with existing game meters through defined formulas:

- **Community Trust meter** = base citywide value + average of all community leader trust scores divided by 10 (so if all 8 leaders average +40 trust, Community Trust gets +4% bonus; if they average -30, it gets -3% penalty).
- **Political Will meter** = base value + sum of council disposition bonuses/penalties (each council ally at disposition >= 30 gives +1% Political Will; each adversary at disposition <= -30 gives -1% Political Will).
- **Narrative action effectiveness** in a neighborhood is multiplied by (1 + local leader trust / 200), so a leader at +60 trust gives a 1.3x multiplier, a leader at -40 trust gives a 0.8x multiplier.
- **Project cost** in a neighborhood is modified by leader trust: at trust >= 40, community labor reduces cost by 10% (on top of the 15% community-proposal discount). At trust <= -20, community resistance increases cost by 15%.

#### Scenario: High leader trust reduces project costs
- **WHEN** the player starts a project in Brightmoor and Grace Okafor-Williams' trust is +50 (Advocate)
- **THEN** the project cost is reduced by 10% due to community labor mobilized by Grace, on top of any community-proposal discount. A $500K project costs $450K ($425K if also community-proposed).

#### Scenario: Low leader trust increases project costs
- **WHEN** the player starts a project in Corktown and Kez Monroe's trust is -30 (Opposition)
- **THEN** the project cost increases by 15% due to community resistance (protests, permitting delays, supply chain friction). A $500K project costs $575K.

#### Scenario: Leader trust affects citywide Community Trust
- **WHEN** the turn resolves and community leader trust scores average +35 across all 8 leaders
- **THEN** the citywide Community Trust meter receives a +3.5% bonus (35/10), reflecting that the player has genuine community support beyond abstract approval numbers
