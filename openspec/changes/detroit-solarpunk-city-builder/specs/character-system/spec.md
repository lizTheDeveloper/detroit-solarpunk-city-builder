## ADDED Requirements

### Requirement: City Council of 9 members with distinct identities

The game SHALL include a Detroit City Council of 9 named members, each representing a district. Each council member has: a name, district, personality description, political leaning (progressive/moderate/conservative), 2-3 priority issues, and a starting disposition toward the player (-100 to +100). The council votes on all major policies (political will threshold > 50%). The player needs 5 of 9 votes for a majority.

The 9 council members are:

1. **Marlena Calloway** (District 1 -- Bagley/Grandmont/Brightmoor, West Side). Progressive. Priority issues: food sovereignty, vacant land reclamation, community land trusts. Starting disposition: +60. A former urban farmer and longtime community organizer who helped get the player elected. She is the player's strongest early ally but will turn sharply if the player ignores west side food access or allows corporate development on vacant lots her community has been stewarding for years.

2. **James "JT" Thibodeaux** (District 2 -- Midtown/New Center/North End). Moderate. Priority issues: small business support, arts and culture funding, neighborhood safety. Starting disposition: +20. A jazz club owner who cares about Black cultural institutions surviving the city's transformation. He is sympathetic to the player's vision but votes with his wallet -- he needs to see that transformation does not kill the small businesses that held the city together during the hard years.

3. **Denise Okonkwo** (District 3 -- East Side/Osborn/Gratiot). Progressive. Priority issues: youth programs, education, anti-blight. Starting disposition: +40. A retired school principal who ran for council to fight for east side kids. She supports the player on community investment but will block any policy that feels like it forgets the east side in favor of trendier neighborhoods. She watches where the money goes.

4. **Victor Marek** (District 4 -- Hamtramck/Banglatown/Conant Gardens). Moderate. Priority issues: immigrant community support, small-scale manufacturing, infrastructure repair. Starting disposition: +25. A second-generation Polish-American who runs a machine shop. He is cautious about radical change but pragmatic -- show him the numbers and he will vote yes. He represents the most ethnically diverse district and takes that responsibility seriously.

5. **Patricia "Pat" Lundgren** (District 5 -- Downtown/Corktown/Woodbridge). Conservative. Priority issues: budget discipline, business climate, property values. Starting disposition: -30. A former corporate accountant who believes the city needs fiscal responsibility above all. She opposes most of the player's agenda but can be convinced on climate adaptation (she lost her basement to flooding) and infrastructure investment that protects property values. She is not malicious -- she genuinely believes austerity saved Detroit once and can again.

6. **Tomoko Reyes** (District 6 -- Southwest Detroit/Delray/Springwells). Progressive. Priority issues: environmental justice, water rights, pollution cleanup, immigrant rights. Starting disposition: +50. A environmental justice attorney who has been fighting Marathon Petroleum's Delray refinery for a decade. She is a fierce ally on ecological issues but will oppose any "green" project that does not center the frontline communities who have been breathing bad air for generations. She demands environmental justice, not green gentrification.

7. **Robert "Bobby" Slade** (District 7 -- Palmer Park/Sherwood Forest/University District). Moderate-conservative. Priority issues: historic preservation, property tax stability, public safety. Starting disposition: -10. A retired auto industry engineer who lives in a 1920s Tudor he restored himself. He is skeptical of the player's "utopian thinking" but deeply loves Detroit. He can be moved by concrete results in his district and by framing transformation as preservation -- saving what is good about Detroit, not replacing it.

8. **Aaliyah Foster** (District 8 -- Indian Village/West Village/Jefferson-Chalmers). Moderate. Priority issues: waterfront access, flood resilience, intergenerational wealth building, historic neighborhood character. Starting disposition: +15. A young real estate developer (the community-minded kind) who flipped abandoned houses into affordable housing. She straddles the line between development and community -- she understands both languages. Her vote depends on whether the player's projects actually build community wealth or just build community vibes.

9. **Frank Bukowski** (District 9 -- Grosse Pointe border/Eastpointe/Near East Side). Conservative. Priority issues: tax burden, public safety, "common sense governance," infrastructure basics. Starting disposition: -50. A retired DPD officer who thinks the player is a dangerous radical. He is the hardest council member to win over, but he has a soft spot for veterans' issues and neighborhood safety programs. He will never love the player, but he can occasionally be persuaded to abstain rather than vote no. His opposition keeps the player honest -- he asks the questions residents are afraid to ask.

#### Scenario: Council vote on major policy with mixed support
- **WHEN** the player proposes "Community Land Trust Ordinance" (major policy) and Calloway (+60), Okonkwo (+40), Reyes (+50) are supportive, Thibodeaux (+20) and Marek (+10) are undecided, and Lundgren (-30), Slade (-15), Foster (+5), Bukowski (-50) are opposed or lukewarm
- **THEN** the system computes votes based on each member's disposition, their priority alignment with the policy, current conditions in their district, and any active advocacy from community leaders, requiring 5/9 for passage

#### Scenario: Council member shifts position after district event
- **WHEN** a flooding event hits District 5 (Downtown/Corktown) and Pat Lundgren witnesses property damage in her district
- **THEN** Lundgren's disposition toward climate adaptation policies increases by 10-15 points and she becomes a potential swing vote on green infrastructure spending

#### Scenario: Council member opposes player after broken promise
- **WHEN** the player promises Denise Okonkwo to fund east side youth programs then redirects that budget to a west side project
- **THEN** Okonkwo's disposition drops by 20 points and she actively lobbies other council members to block the player's next policy proposal

### Requirement: Council voting mechanics

Each council member SHALL vote on major policies based on a calculated vote score: (base disposition toward player) + (alignment between policy and member's priority issues, -20 to +20) + (district conditions modifier, -10 to +10) + (community leader advocacy bonus, 0 to +15) + (narrative action targeting, 0 to +10). A member votes YES if their score is > 0, NO if < -10, and ABSTAINS if between -10 and 0. The player sees estimated vote counts before committing to a proposal and can spend a turn phase lobbying specific members (costs 1 narrative action per member lobbied, gives +5 to +15 bonus depending on the argument's alignment with the member's priorities).

#### Scenario: Player lobbies swing vote
- **WHEN** the player spends a narrative action to lobby Victor Marek on "Green Manufacturing Incentives" and Marek's priority includes small-scale manufacturing
- **THEN** Marek receives a +15 lobbying bonus (high alignment) to his vote score for that policy, likely flipping him to YES

#### Scenario: Failed vote with option to retry
- **WHEN** a major policy fails with a 4-5 vote (one vote short)
- **THEN** the player is informed of the vote breakdown, can see which members voted no and why, and can attempt to re-propose the same policy after at least 2 turns have passed (cooling off period) with new conditions or lobbying

#### Scenario: Landslide rejection signals misalignment
- **WHEN** a major policy fails with 2-7 or worse
- **THEN** the player's political will decreases by an additional 5% beyond the normal cost (the public sees the player as out of touch with their own council) and a 4-turn cooldown applies before re-proposal

### Requirement: Community Leaders with proposals and trust

The game SHALL include 8 named Community Leaders, each tied to a neighborhood cluster. Each leader has: a name, neighborhood, backstory, 2-3 priority projects they propose, a personal trust score toward the player (-100 to +100, separate from city-wide Community Trust), and an advocacy power level (1-5, representing their community influence). Community leaders propose 1-2 projects per turn during the Events phase. These proposals appear before the player's Project phase, reframing the player's role from top-down planner to community facilitator.

The 8 community leaders are:

1. **Grace Okafor-Williams** (Brightmoor). An urban farmer in her 60s who has been growing food on vacant lots since 2008. She proposes food forests, community gardens, seed libraries, and composting programs. She is patient and wise but has zero tolerance for people who treat her neighborhood as a blank canvas for their ideas. Trust starts at +30. Advocacy power: 4.

2. **Darius Kemp** (Eastern Market / Banglatown). A 30-something maker, muralist, and fabrication teacher who runs a youth art and robotics program out of a converted warehouse. He proposes maker spaces, public art installations, cultural venues, and skill-sharing workshops. He is energetic and collaborative but burns hot -- if the player sidelines culture in favor of "practical" projects, he takes it personally. Trust starts at +20. Advocacy power: 3.

3. **Lucia Espinoza** (Southwest Detroit / Delray). A water rights activist and mother of three who has been fighting for clean water since the Flint crisis radicalized her. She proposes water infrastructure, pollution monitoring, community health clinics, and environmental remediation. She is fierce, specific, and tracks every promise. Trust starts at +15. Advocacy power: 4.

4. **Elder Raymond Whitehorse** (Indian Village / West Village). A 75-year-old retired autoworker and neighborhood historian who has lived in Indian Village since 1968. He proposes historic preservation projects, intergenerational knowledge programs, elder housing, and oral history archives. He speaks slowly and means every word. If the player respects his counsel, he becomes a bridge to the older generation. Trust starts at +25. Advocacy power: 3.

5. **Kezia "Kez" Monroe** (Corktown / North Corktown). A 26-year-old housing justice organizer who grew up watching her neighborhood get gentrified after the train station restoration. She proposes community land trusts, affordable housing cooperatives, anti-displacement ordinances, and tenant organizing support. She is sharp, impatient with incrementalism, and will publicly criticize the player if they move too slowly. Trust starts at +10. Advocacy power: 3.

6. **Hassan Farah** (Hamtramck / Banglatown area). A Somali-American community elder and small business owner who runs a neighborhood mutual aid network. He proposes multilingual services, small business incubators, community kitchens, and cultural exchange programs. He is quiet in public, influential in private, and his trust is hard to earn but nearly unbreakable once established. Trust starts at +5. Advocacy power: 4.

7. **Tamika Jefferson** (North End / Highland Park border). A nurse and community health advocate who runs free health screenings out of a church basement. She proposes community health centers, lead abatement programs, mental health resources, and wellness gardens. She does not care about politics -- she cares about whether people are sick or well. She judges the player entirely by health outcomes. Trust starts at +20. Advocacy power: 3.

8. **Michael "Big Mike" Novak** (Warrendale / Rouge Park). A union electrician and climate adaptation pragmatist who saw his neighborhood flood three times in five years. He proposes green infrastructure, permeable surfaces, home weatherization, and community solar installations. He speaks the language of tradecraft and distrusts anything that sounds like academic theory. Show him a working solar panel and he is sold; show him a vision document and he walks. Trust starts at +15. Advocacy power: 3.

#### Scenario: Community leader proposes project at turn start
- **WHEN** a new turn begins and Grace Okafor-Williams has trust >= 0 toward the player
- **THEN** she proposes 1-2 projects (e.g., "Brightmoor Community Food Forest" and "Seed Library Network") during the Events phase, with project details, costs (15% cheaper than player-initiated equivalent), and expected outcomes visible to the player

#### Scenario: Player accepts community proposal
- **WHEN** the player accepts Grace's "Brightmoor Community Food Forest" proposal
- **THEN** the project enters the active queue at 85% of normal cost, Grace's trust increases by 10, Grace begins advocating for the player in Brightmoor (+5 to narrative actions in that area), and Community Trust in Brightmoor increases by 3%

#### Scenario: Player modifies community proposal
- **WHEN** the player selects "Modify" on Kez Monroe's "Corktown Anti-Displacement Ordinance" proposal, scaling it down from neighborhood-wide to a pilot program
- **THEN** the project enters the queue at reduced scope and cost, Kez's trust increases by only 3 (she sees it as a half-measure), and the project's community trust impact is halved

#### Scenario: Player defers community proposal
- **WHEN** the player selects "Defer" on Elder Whitehorse's "Indian Village Oral History Archive" proposal
- **THEN** the proposal moves to a queue for next turn, Whitehorse's trust decreases by 5, and he will re-propose it next turn with slightly increased urgency

#### Scenario: Player rejects community proposal
- **WHEN** the player selects "Reject" on Lucia Espinoza's "Southwest Water Quality Monitoring Network"
- **THEN** Lucia's trust decreases by 15, she may organize a public demonstration in southwest Detroit (narrative event next turn), and Community Trust in southwest Detroit decreases by 5%

#### Scenario: Ignored leader organizes opposition
- **WHEN** Kez Monroe's trust drops below -20 after repeated rejections
- **THEN** Kez organizes an "Anti-Gentrification Coalition" that generates negative narrative events each turn, reduces Political Will by 3% per turn, and requires the player to either address her concerns or spend narrative actions countering the opposition

### Requirement: Community proposal response options

When a community leader proposes a project, the player SHALL have exactly four response options:

- **Accept**: Project enters the queue at 85% cost. Leader trust +10. Community Trust in that neighborhood +3%. The leader actively advocates for the player for 4 turns.
- **Modify**: Player adjusts scope/approach. Project enters at reduced cost and impact. Leader trust +3. Community Trust +1%. Limited advocacy (2 turns).
- **Defer**: Project saved for next turn. Leader trust -5. No Community Trust change. Leader re-proposes with +1 urgency next turn. After 3 consecutive deferrals, treated as Reject.
- **Reject**: Project removed. Leader trust -15. Community Trust in neighborhood -5%. Leader may organize opposition if trust drops below -20.

#### Scenario: Three consecutive deferrals become a rejection
- **WHEN** the player defers Hassan Farah's "Hamtramck Mutual Aid Hub" proposal for the third consecutive turn
- **THEN** the deferral is treated as a rejection: Hassan's trust decreases by 15, the proposal is removed, and Hassan generates a "community disappointment" narrative event

### Requirement: Player-initiated vs community-proposed project costs

Player-initiated projects (chosen from the project catalog without a community leader proposing them) SHALL cost 100% of listed price and provide standard Community Trust gains. Community-proposed projects cost 85% (the community contributes labor and resources) and provide 150% of standard Community Trust gains. This creates a mechanical incentive for the player to work WITH communities rather than imposing projects top-down.

#### Scenario: Same project, different origins
- **WHEN** the player initiates a "Community Solar Installation" in Warrendale without Big Mike Novak's proposal, costing $800K
- **THEN** the project costs $800K and provides standard Community Trust gain of +5%

#### Scenario: Community-proposed version is cheaper and builds more trust
- **WHEN** Big Mike Novak proposes the same "Community Solar Installation" in Warrendale and the player accepts
- **THEN** the project costs $680K (85%) and provides +7.5% Community Trust (150% of standard), because the community is invested in the project as their own

### Requirement: Antagonists generate escalating opposition

The game SHALL include 4 named antagonists who generate opposition events on a schedule that escalates as the player succeeds. Antagonists are not random -- they have specific triggers, patterns, and can be partially neutralized through gameplay.

The 4 antagonists are:

1. **Sterling Cross** (Corporate Developer). CEO of Great Lakes Development Corp, which has been buying vacant Detroit land for years, waiting to build luxury condos and mixed-use "innovation districts." He activates when the player begins reclaiming vacant land (turn 3-4 typically). He generates events: land acquisition attempts (tries to buy tiles the player is targeting), astroturf opposition campaigns (fake community groups opposing the player's projects), and lawsuit threats against community land trusts. He escalates every 4 turns. He can be partially neutralized by passing community land trust policies early (removes his purchase targets) or by Aaliyah Foster's advocacy (she knows the real estate game). He never fully goes away -- he represents the structural force of capital.

2. **State Senator Diane Voss** (State-Level Politician). A Lansing politician who thinks Detroit needs "adult supervision." She activates when the player's Community Trust exceeds 55% (the player is gaining real power). She generates events: emergency manager threats (if budget drops below $2M while she is active), state legislative interference (bills that override local ordinances), and hostile media appearances that reduce political will. She escalates every 3 turns once active. She can be partially neutralized by maintaining budget above $3M (she loses her fiscal irresponsibility argument), by high Community Trust (her voters see Detroit succeeding), and by Robert Slade's grudging advocacy (he has connections in Lansing).

3. **Marcus Webb** (Media Figure). A popular local radio host and social media personality who brands himself as "the voice of real Detroit." He activates from turn 1 with low intensity. He generates counter-narratives that erode political will (2-4% per turn depending on intensity), amplifies any player failure (doubles the negative political will impact of failed projects or crises), and runs "concerned citizen" segments that reduce public opinion on the player's key topics. He escalates when the player's narrative actions succeed (he is the backlash). He can be partially neutralized by JT Thibodeaux's cultural influence (JT knows the media landscape) and by Darius Kemp's counter-narratives (art vs. talk radio). He cannot be silenced -- only matched.

4. **Amanda Chen** (Green Capitalist). CEO of EcoVenture Partners, who wants to "partner" with the city on green development that would privatize community resources. She activates in Stage 2 (Transition) when the city's ecological transformation becomes visible and profitable. She generates events: public-private partnership proposals that sound good but extract community wealth, greenwashing campaigns that co-opt the player's narrative, and tech-solutionist projects that undermine community-led approaches. She is the most insidious antagonist because she agrees with the player's goals but not their values. She can be partially neutralized by strong community ownership structures (co-ops, land trusts) and by Lucia Espinoza's activism (Lucia can see through greenwashing). The player may be tempted to accept her resources, which provides short-term budget gains but long-term trust erosion.

#### Scenario: Sterling Cross attempts land acquisition
- **WHEN** the player has been reclaiming vacant land for 3+ turns and Sterling Cross is active
- **THEN** Cross makes a bid on a specific vacant tile, triggering an event: the player must either spend $500K+ to outbid him (budget cost), pass a policy to block the sale (political will cost), or lose the tile for 8 turns (it becomes a luxury development that harms Community Trust by -5% and blocks food/ecology projects on that tile)

#### Scenario: Senator Voss threatens emergency management
- **WHEN** the city budget drops below $2M while Senator Voss is active
- **THEN** Voss introduces an emergency manager bill in Lansing, triggering a 3-turn crisis: if the player does not raise budget above $3M or achieve Community Trust above 70% within 3 turns, the game enters Emergency Management mode (player loses control of budget allocation for 4 turns, all community leader trust drops by 20, and 2 active projects are cancelled by the emergency manager)

#### Scenario: Marcus Webb amplifies player failure
- **WHEN** a player's project fails or a crisis event occurs and Marcus Webb is active
- **THEN** Webb's broadcast doubles the political will loss from the failure and generates a counter-narrative event that persists for 2 turns, requiring the player to spend narrative actions to counter it

#### Scenario: Amanda Chen offers tempting partnership
- **WHEN** the player reaches Stage 2 (Transition) and Amanda Chen activates
- **THEN** Chen proposes a "Green Innovation District" on 2-3 tiles: the player gains $2M budget immediately and the tiles transform to Restoration visuals, BUT Community Trust decreases by 3% per turn for 4 turns as the community realizes the project is extractive, and community leaders in affected neighborhoods lose 10 trust

### Requirement: Antagonist escalation schedule

Each antagonist SHALL have an escalation level (1-5) that increases on a defined schedule once active. At each level, their events become more frequent and more impactful. At level 5, they generate a crisis event that requires the player's full attention for 2-3 turns. Escalation pauses (but does not reset) when the antagonist's specific neutralization conditions are met.

#### Scenario: Sterling Cross escalates to level 3
- **WHEN** Sterling Cross has been active for 12 turns without being neutralized
- **THEN** his escalation reaches level 3: he now targets 2 tiles per event instead of 1, his astroturf campaigns reduce Community Trust by 3% instead of 1%, and he begins attempting to influence council members Lundgren and Slade with campaign contributions (+10 to their opposition scores on land use policies)

#### Scenario: Antagonist reaches crisis level
- **WHEN** any antagonist reaches escalation level 5
- **THEN** they trigger a major crisis event (e.g., Cross launches a hostile legal challenge to all community land trusts, Voss fast-tracks the emergency manager bill, Webb organizes a recall petition drive, Chen announces a hostile takeover bid on a community co-op) that dominates 2-3 turns and requires coalition responses from the player, council allies, and community leaders

### Requirement: Community leaders propose projects based on neighborhood conditions

Community leader proposals SHALL be responsive to current conditions in their neighborhood. If a neighborhood has high contamination, the local leader proposes remediation. If it has food insecurity, they propose food projects. If it just experienced a climate event, they propose adaptation. Leaders do not propose randomly -- they respond to what their community needs.

#### Scenario: Climate event triggers adaptation proposal
- **WHEN** Warrendale floods during a summer storm event
- **THEN** Big Mike Novak's next proposal is "Warrendale Permeable Streets and Rain Gardens" (a green infrastructure project), replacing whatever he would have otherwise proposed

#### Scenario: Contamination triggers remediation proposal
- **WHEN** soil contamination data is revealed in Southwest Detroit
- **THEN** Lucia Espinoza proposes "Delray Soil Remediation and Health Screening" as her top priority, and her trust decreases by 5 if the player does not accept it within 2 turns ("You knew and did nothing")

### Requirement: Community leaders can collaborate on joint proposals

When 2 or more community leaders both have trust >= 30 toward the player AND their priorities overlap, they SHALL occasionally propose joint projects that span multiple neighborhoods. Joint projects cost more but have amplified effects and build trust with all participating leaders.

#### Scenario: Joint food sovereignty proposal
- **WHEN** Grace Okafor-Williams (Brightmoor, trust 45) and Tamika Jefferson (North End, trust 35) both have trust >= 30 and both have food-related priorities
- **THEN** they jointly propose "West Side Food Corridor" spanning Brightmoor and North End: costs $1.2M (vs $800K per neighborhood separately), provides +10% Food Sovereignty (vs +5% each), transforms 2 tiles, and builds 8 trust with both leaders

#### Scenario: Joint anti-displacement proposal
- **WHEN** Kez Monroe (Corktown, trust 40) and Aaliyah Foster (council member, District 8, disposition +25) align on housing justice
- **THEN** a cross-system joint proposal emerges: Kez proposes the project, Aaliyah pre-commits her council vote, and the project includes both physical housing construction and a policy component (anti-displacement ordinance) that passes with a built-in +15 to the council vote

### Requirement: Leader advocacy amplifies narrative actions

When a community leader has trust >= 40 toward the player, they become an active advocate. Advocates provide: +5% effectiveness to narrative actions in their neighborhood, +1 to the player's narrative action budget per 3 advocates (representing expanded community voice), and a +10 bonus to the aligned council member's disposition when the advocate's priority matches the policy being voted on.

#### Scenario: Advocate boosts narrative action
- **WHEN** the player runs a "Community Meeting" narrative action in Brightmoor and Grace Okafor-Williams is an advocate (trust 45)
- **THEN** the narrative action's Community Trust impact is increased by 5% (Grace's endorsement amplifies the message) and any food sovereignty opinion shift is 10% more effective

#### Scenario: Three advocates expand narrative budget
- **WHEN** Grace (trust 45), Lucia (trust 42), and Elder Whitehorse (trust 38, rounds up to advocate threshold) all have trust >= 40
- **THEN** the player gains +1 narrative action per turn (the community is amplifying the player's voice, representing genuine grassroots support)

### Requirement: Character portrait and dialogue

Each council member, community leader, and antagonist SHALL have a character portrait (placeholder art initially) and at least 3 dialogue lines per response type: one for positive interactions (trust/disposition gain), one for negative interactions (trust/disposition loss), and one for their signature issue. Dialogue lines SHALL reflect the character's personality, speech patterns, and values -- not generic placeholder text.

#### Scenario: Grace responds to accepted proposal
- **WHEN** the player accepts Grace Okafor-Williams' food forest proposal
- **THEN** Grace's portrait appears with dialogue such as: "Good. The soil has been waiting. We will show this city what vacant land can become when you trust the people who never left."

#### Scenario: Bukowski responds to policy he opposes
- **WHEN** Frank Bukowski votes NO on a progressive policy
- **THEN** Bukowski's portrait appears with dialogue such as: "I have been in this city for 40 years. You do not fix Detroit with wish lists. You fix it with working streetlights and plowed roads. Come back when you have a real plan."

#### Scenario: Sterling Cross threatens the player
- **WHEN** Sterling Cross triggers a land acquisition event
- **THEN** Cross's portrait appears with dialogue such as: "I am not the villain here, Mayor. I am offering investment. Real money, real jobs. What are you offering? Community gardens? Ask your residents if they would rather eat kale or pay rent."
