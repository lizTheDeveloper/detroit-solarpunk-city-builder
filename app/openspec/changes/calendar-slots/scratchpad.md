# Calendar Slots System — Design Scratchpad

## The Core Insight

Your Dunbar's Number spreadsheet models: **time is the only non-renewable resource, and how you allocate it across relationship tiers determines your resource flows.**

The mayor game currently has a flat "3 actions per turn" system where every action is equivalent. The Dunbar model says something profoundly different: each calendar slot spent on a specific relationship type generates different political resources at logarithmic scales of impact.

---

## Monthly Calendar Structure

~20 working days × 3 slots/day = **60 CALENDAR SLOTS per month**

But NOT all slots are discretionary:

**FIXED OBLIGATIONS (auto-consumed, ~35-40 slots):**
- Council sessions (4/mo)
- Staff meetings (8/mo)
- Constituent hours (8/mo)
- Media/press (4/mo)
- Ceremonial (3-5/mo)
- Crisis response (variable — THIS IS THE KEY)
- Admin (10/mo)

**DISCRETIONARY SLOTS (player choice, ~15-25 slots):**
- Visit neighborhoods
- Meet with leaders
- Lobby council members
- Review/discuss proposals
- Attend community events
- Campaign activities
- Coalition building
- Meet strategic contacts (funders, mentors)

**DISCRETIONARY POOL GROWS WITH:**
- Higher trust → fewer fire-drills consuming slots
- Better staff → delegate fixed obligations
- Lower crisis pressure → fewer emergency slots consumed
- Mature coalitions → self-maintaining relationships

---

## The Calendar as Actual UI

The calendar shows days of the month with time blocks. Player reaction: "why do I only have so much time? how do I get more? oh this is *actual time*? holy jeez"

```
┌──────────────────────────────────────────────────────────────────────────┐
│  MARCH 2026                                          Mayor's Calendar    │
├────────┬────────┬────────┬────────┬────────┬────────┬────────┬──────────┤
│  SUN   │  MON   │  TUE   │  WED   │  THU   │  FRI   │  SAT   │         │
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤         │
│        │   3    │   4    │   5    │   6    │   7    │        │         │
│        │▓▓▓░░░ │▓▓░░░░ │▓▓▓░░░ │▓▓░░░░ │▓▓▓░░░ │        │  LEGEND │
│        │Council │Staff   │Constit.│Staff   │Press   │        │         │
│        │Meeting │        │Hours   │        │Conf.   │        │  ▓ Fixed│
├────────┼────────┼────────┼────────┼────────┼────────┼────────┤  ░ Open │
│        │  10    │  11    │  12    │  13    │  14    │        │  █ You  │
│        │▓▓█░░░ │▓█░░░░ │▓▓██░░ │▓█░░░░ │▓▓█░░░ │        │  ▒ Over │
│        │Staff   │+Mike   │Constit.│+Rally │Press   │        │         │
│        │+Lobby  │ Davis  │+Propose│Bright.│+Media  │        │         │
└────────┴────────┴────────┴────────┴────────┴────────┴────────┴──────────┘
```

As you schedule actions, the █ blocks fill in. When you overschedule, ▒ blocks appear in red.

---

## Overschedule Mechanic

You CAN schedule more than your discretionary slots. The game doesn't stop you. It shows you the consequences.

**SUSTAINABLE ZONE (slots 1 through discretionary max):**
- Full effectiveness on all actions
- Normal trust/will/resource yields

**OVEREXTENDED (+1 to +8 past limit):**
- -20% effectiveness on ALL actions (you're tired, conversations feel rote)
- LLM conversations: character notices you seem distracted
- Next month: -2 discretionary slots (recovery time)
- You're less charming. Trust yields reduced.

**BURNOUT (+9 to +18 past limit):**
- -50% effectiveness on ALL actions
- You forget commitments (random missed obligation events)
- LLM conversations: character comments on your exhaustion/irritability
- Next month: -5 slots + trust penalty with all leaders
- Risk: random negative event ("Mayor snaps at reporter", "Mayor misses community meeting")
- "You snapped at a reporter. People notice."

**COLLAPSE (+19 or more past limit): HARD CAP**
- "The mayor has been hospitalized for exhaustion."
- Next month: 0 discretionary slots. Turn is auto-resolved.
- Trust penalty across the board.
- [This has happened to real mayors.]

### Burnout Effects on LLM Conversations

When burned out, the system prompt for NPC responses includes context about the mayor seeming tired/distracted/irritable:
- Characters give you LESS trust per interaction
- Characters may refuse to negotiate ("You seem overwhelmed. Come back when you can focus.")
- Strategic contacts may cancel ("I heard you've been... scattered lately. Let's reschedule.")
- The LLM literally plays your exhaustion against you

### Forgetting Commitments

When in BURNOUT zone, each remaining slot has a chance of triggering a "forgotten commitment":
- "You double-booked yourself. You missed the meeting with Adrienne."
- "The coalition vote was today. You forgot. They voted without you."
- "Mike Davis waited 45 minutes at the community center. You never showed."

Each forgotten commitment = trust penalty with that character WITHOUT the interaction benefit. You paid the slot cost but got nothing — AND pissed someone off.

---

## Fixed Obligations Eating Time (Crisis Mode)

Every crisis doesn't just damage meters — it damages your ability to RESPOND.

**NORMAL MONTH:**
```
Fixed: 38 slots | Open: 22 slots
▓▓▓▓▓▓▓▓░░░░░░░░
```

**CRISIS MONTH (flooding + antagonist active):**
```
Fixed: 52 slots | Open: 8 slots
▓▓▓▓▓▓▓▓▓▓▓▓▓░░░

Added fixed obligations:
- Emergency council sessions (+2)
- Crisis staff meetings (+4)
- Angry constituent overflow (+2)
- Press damage control (+6)
- FEMA/state coordination (+8 — NEW category)
- Cancelled: ceremonial (-2, auto-dropped)
- Delegated: some admin (-4, if you have staff)
```

The crisis didn't just cost you $150K in budget. It cost you 14 CALENDAR SLOTS. That's 14 meetings you can't take. 14 proposals you can't review. 14 relationships you can't maintain.

A player in crisis mode has to make brutal triage decisions: "I only have 8 slots. Do I talk to the angry community leader, or lobby the council member before the vote?"

---

## Thread 1: Calendar as Narrative Device

When you end the turn, the calendar tells your story as a mayor.

"March 2026: You spent 8 slots in Brightmoor, 4 with council, 3 on media, 2 with the funder, 5 on crisis response."

That's not just a stat screen — it's a portrait of who you are as a mayor. The game can show you patterns over time:

**Month-over-month calendar heatmap:**
```
Jan: ████████░░░░░░ Brightmoor (neighborhood mayor)
Feb: ██░░████████░░ Council heavy (policy push)
Mar: ░░░░░░████████ Crisis response (reactive)
Apr: ██████████░░░░ Campaign mode (election approaching)
```

Are you the neighborhood mayor? The backroom dealer? The media darling? The crisis responder? The game tells you through your calendar — and so does the electorate. At election time, the voters have SEEN your calendar. "You spent 40% of your time in Brightmoor and 0% in Corktown. Corktown remembers."

**End-of-turn summary as day planner:**
```
┌─────────────────────────────────────────────────┐
│  YOUR MONTH IN REVIEW                           │
│                                                 │
│  Who got your time:                             │
│  • Mike Davis (Brightmoor): 3 slots ████       │
│  • Council Member Hayes: 2 slots ███           │
│  • Coalition meeting: 2 slots ███              │
│  • Funder (strategic): 1 slot ██               │
│  • Community meetings: 4 slots █████           │
│  • Crisis response: 6 slots ███████            │
│                                                 │
│  Who DIDN'T get your time:                      │
│  • Adrienne (Corktown): 0 slots ⚠️ decaying    │
│  • Youth coalition: 0 slots ⚠️ decaying         │
│  • Regional contacts: 0 slots                   │
│                                                 │
│  Your style this month: CRISIS RESPONDER        │
│  (50% reactive, 30% community, 20% strategic)   │
└─────────────────────────────────────────────────┘
```

---

## Thread 2: Relationship Decay

From the spreadsheet's frequency requirements: relationships need maintenance. If you don't spend slots, trust decays.

**Decay rates by relationship tier:**

| Tier | Maintenance Need | Decay if Missed |
|------|-----------------|-----------------|
| Key leaders (regulars) | 1 slot/month minimum | -3 trust/month missed |
| Council allies | 1 slot/month | -2 disposition/month |
| Coalition partners | 1 slot/2 months | -5 cohesion if missed 2x |
| Monthly friends | 1 slot/month | relationship drops a tier |
| Strategic contacts | 1 slot/quarter | door closes (3-month recovery) |
| Mentors | 1 slot/quarter | no decay (they're patient) |
| Seedlings | 1 slot/2 months | they move on (permanent) |

**The maintenance tax:** If you have 8 key relationships that each need 1 slot/month, that's 8 of your 22 discretionary slots just to MAINTAIN what you have. Only 14 left for NEW things. This is the leadership trap — the more relationships you build, the more maintenance they require, the less time you have to build new ones.

**The spreadsheet's insight:** This is why Dunbar's Number exists. You literally cannot maintain more than ~150 relationships. In the game: you cannot maintain more than ~20 active relationships because you don't have the calendar slots. If you try to maintain 30, some will decay, you'll overschedule, burn out, and LOSE relationships.

**Decay notifications:**
- "You haven't visited Adrienne in 2 months. Trust is slipping." (gentle)
- "The youth coalition hasn't heard from you in 3 months. They're questioning your commitment." (warning)
- "Marcus Washington no longer considers you an ally. You missed 3 meetings." (consequence)

---

## Making Friends with Movers and Shakers

Strategic Connections aren't fixed — you can CULTIVATE new high-value relationships. But they're gated:

**Unlocking new Strategic Contacts:**

1. **Funders** — Unlock when you have a track record (5+ completed projects, OR a coalition with 3+ members, OR Political Will > 60). They don't meet with randos.

2. **State/Federal contacts** — Unlock when you pass a major policy OR handle a crisis well. They notice competence.

3. **Media power brokers** — Unlock when you hit a Public Opinion threshold on any topic. They want to interview whoever's moving the needle.

4. **Corporate antagonists** (developers, etc.) — You can FLIP them. Repeated meetings (3+ slots over 3+ months) can shift them from adversary to reluctant ally. They respect persistence.

5. **Academic/Visionary mentors** — Unlock through education programs or when you push the Overton window on a taboo topic. They find you when you start thinking big.

**The cultivation arc:**
```
Stranger → Introduction (1 slot, need prerequisite)
         → Acquaintance (cooldown: wait 1 month)
         → Second meeting (1 slot, they're evaluating you)
         → Relationship established (now in your network)
         → Deepening (repeated meetings increase their yield)
```

Each new relationship you cultivate also COSTS a maintenance slot going forward. So adding a funder to your network gives you access to budget (4.0 yield!) but costs 1 slot/quarter to maintain. Is it worth it? Depends on your calendar.

---

## Resource Flow Model (Logarithmic)

From the spreadsheet. The multipliers (100, 150, 1000, 10000) represent impact per interaction. In log₁₀ scale:

```
Multiplier → log₁₀ → Game Meaning
100        → 2.0   → Standard exchange
150        → 2.2   → Slightly better than standard
1000       → 3.0   → Significant — a whole tier above
10000      → 4.0   → Transformative — one meeting changes everything
```

**Resource yield formula:**
```
yield = log₁₀(base_multiplier / meetingCount²) × relationship_depth_factor
```

Where:
- base_multiplier comes from the relationship type × resource matrix
- meetingCount² creates diminishing returns per person per month
- relationship_depth_factor scales with trust level (0.5 at neutral, 1.0 at champion, 1.5 at partner)

**Diminishing returns per person:**
```
1st meeting this month: log₁₀(1000/1)  = 3.0 (full value)
2nd meeting:            log₁₀(1000/4)  = 2.4 (80%)
3rd meeting:            log₁₀(1000/9)  = 2.0 (67%)
4th meeting:            log₁₀(1000/16) = 1.8 (60%)
5th meeting:            log₁₀(1000/25) = 1.6 (53%) ← waste
```

The game shows this BEFORE you commit the slot: "Diminishing returns: 4th meeting with Mike this month (60% effectiveness)"

**But meetings with DIFFERENT people each get full value!** Breadth doesn't diminish. This elegantly models Dunbar's insight: you can't just spam one relationship. You need to spread across the network.

---

## Relationship Type × Resource Yield Matrix

| | Community Leader | Council Member | Strategic Funder | Mentor | Seedling/Youth |
|---|---|---|---|---|---|
| Trust | log(1000) = 3.0 | log(100) = 2.0 | log(50) = 1.7 | log(150) = 2.2 | log(500) = 2.7 |
| Political Will | log(150) = 2.2 | log(1000) = 3.0 | log(500) = 2.7 | log(100) = 2.0 | log(50) = 1.7 |
| Budget | log(10) = 1.0 | log(50) = 1.7 | log(10000) = 4.0 | log(100) = 2.0 | log(10) = 1.0 |
| Credibility | log(100) = 2.0 | log(500) = 2.7 | log(10000) = 4.0 | log(1000) = 3.0 | log(50) = 1.7 |
| Vision/Overton | log(50) = 1.7 | log(30) = 1.5 | log(100) = 2.0 | log(10000) = 4.0 | log(1000) = 3.0 |
| Execution Speed | log(500) = 2.7 | log(100) = 2.0 | log(150) = 2.2 | log(50) = 1.7 | log(100) = 2.0 |
| Emotional/Burnout Buffer | log(500) = 2.7 | log(30) = 1.5 | log(10) = 1.0 | log(1000) = 3.0 | log(300) = 2.5 |

Key insight from this matrix:
- Leaders give trust and emotional support (they ground you)
- Council gives political will (they have the votes)
- Funders give budget and credibility ($$$ talks)
- Mentors give vision and burnout buffer (they've seen it all)
- Seedlings/Youth give vision and trust (they push you to think bigger + the community sees you investing in the future)

---

## Actions Inline Per Neighborhood

No more "Actions" tab. Actions appear contextually within each tile/neighborhood view:

```
┌────────────────────────────────────────────────────────┐
│  BRIGHTMOOR                            [14/22 slots]   │
├────────────────────────────────────────────────────────┤
│                                                        │
│  👤 Mike Davis (Trust: 32, Champion)                   │
│     [Talk 1🕐] [Review Proposal 1🕐]                  │
│     └─ Proposed: Food Forest ($85K, 9mo)               │
│     └─ 3rd meeting this month (67% effectiveness)      │
│                                                        │
│  👤 Adrienne Cole (Trust: 18, Neutral) ⚠️ decaying     │
│     [Talk 1🕐] [Community Meeting 1🕐]                 │
│     └─ Haven't met in 2 months. Trust slipping.        │
│                                                        │
│  📋 Neighborhood Actions:                              │
│     [Cultural Event 2🕐] [Education Program 2🕐]       │
│     [Demonstration 3🕐] [Start Project 1🕐]            │
│                                                        │
│  🌐 Available Strategic Contacts:                      │
│     [Meet Kresge Foundation rep 2🕐] (NEW - unlocked)  │
│     └─ Cooldown: available now                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## The Teaching Progression

Turn 1-3: "I have 22 actions? That's so many!"
Turn 4-6: "Wait, I want to do 30 things. I'll just overschedule a little."
Turn 7: "I'm in burnout recovery. Only 17 slots. Shit."
Turn 8-12: "OK I need to be strategic. Who do I actually NEED to see?"
Turn 15+: "A crisis ate 14 slots. I have to choose: maintain coalition OR respond to flooding."
Turn 20+: "I figured out delegation. Fixed costs dropped. 28 discretionary slots now."
Turn 30+: "I have a network that partially maintains itself. I can be strategic."

---

---

## Thread 1 (Expanded): Calendar as Narrative Portrait & Election Weapon

The calendar doesn't just show your choices — it reveals who you are to yourself and to the electorate.

**At election time (Turn 48), the city remembers:**

Each neighborhood tracked how much time you gave them over 4 years:

```
Brightmoor:    ████████████████████ 142 slots (28%)
Corktown:      █████░░░░░░░░░░░░░░  38 slots  (8%)
Southwest:     ███████████░░░░░░░░  72 slots (14%)
Downtown:      ██████████████░░░░░  96 slots (19%)
Eastside:      ██████░░░░░░░░░░░░░  44 slots  (9%)
```

Brightmoor LOVES you. Corktown feels abandoned. The data-driven voters on the eastside calculated exactly how many times you showed up: 11 times in 4 years. That's less than once a quarter.

**Your opponent's attack ad:** "Mayor spent 142 days in Brightmoor and 11 in our neighborhood. Do they even know your name?"

This is the REAL tension: you literally cannot give everyone enough time. The neighborhoods you DON'T visit remember. Every slot spent somewhere is a slot NOT spent somewhere else. There is no "give everyone equal time" solution — there aren't enough slots.

**Monthly narrative summary:**
```
YOUR MONTH IN REVIEW

Who got your time:
• Mike Davis (Brightmoor): 3 slots
• Council Member Hayes: 2 slots
• Coalition meeting: 2 slots
• Community meetings: 4 slots
• Crisis response: 6 slots

Who DIDN'T get your time:
• Adrienne (Corktown): 0 slots ⚠️ decaying
• Youth coalition: 0 slots ⚠️ decaying

Your style this month: CRISIS RESPONDER
(50% reactive, 30% community, 20% strategic)
```

---

## Thread 2 (Expanded): Relationship Decay + The Maintenance Trap

**The spiral that teaches Dunbar's Number:**

- Month 1: 5 key relationships. 5 maintenance slots. 17 left for new things. Life is good.
- Month 6: 9 relationships. 9 maintenance. 13 left. Still manageable.
- Month 12: 16 relationships. 16 maintenance. 6 left for new things. Starting to overschedule "just a little."
- Month 18: 20 relationships. 20 maintenance = already at limit. ZERO new things. Just maintaining. Any crisis pushes into burnout.
- Month 20: Haven't done anything NEW in 2 months. Game shows: "100% of time spent maintaining existing relationships."

**THE LESSON:** You must PRUNE. Let some relationships decay intentionally. Choose who matters. That's leadership.

**OR:** Invest in self-sustaining systems:
- Coalitions that maintain themselves (once cohesion > threshold)
- Staff that handles routine check-ins
- Community leaders strong enough they don't NEED you monthly
- Trust so high that maintenance frequency drops (champion-level leaders only need 1 slot/quarter)

---

## Making Friends with Movers and Shakers

Strategic contacts aren't a fixed menu. They're a SOCIAL GAME:

**STAGE 1: DISCOVERY**
You hear about them through your network.
"Mike mentions a program officer at Kresge interested in community land trusts."
Prerequisite: Mike's trust > 25 AND you have a land trust project.

**STAGE 2: INTRODUCTION (1 slot)**
Mike introduces you. Brief meeting. They're evaluating you.
If burned out: "You seemed distracted. They weren't impressed."

**STAGE 3: COOLDOWN (1-2 months)**
Can't just call them next week. That's desperate.
During cooldown: they're watching your public actions.
If you do something aligned with their priorities: bonus.
If you screw up publicly: penalty or door closes.

**STAGE 4: FOLLOW-UP (1-2 slots)**
Meet again with something concrete: a project proposal, a success story, a coalition.
LLM conversation: they probe your understanding, test you.
If burned out: "You forgot their name. Embarrassing."

**STAGE 5: RELATIONSHIP ESTABLISHED**
In your network. Yielding resources.
1 slot/quarter maintenance. Miss it = door closes for 6 months (they're busy people with their own Dunbar limit).

**STAGE 6: DEEPENING (optional)**
Extra slots beyond maintenance = relationship depth grows. log(yield) increases.
At max depth: they proactively bring YOU opportunities.
"The Kresge rep calls YOU: 'We have $500K for land trusts. Are you ready?'"

**The brutal part:** If burned out when meeting a strategic contact, you blow it. The LLM plays this. "You seem overwhelmed. Maybe this isn't the right time." Some doors only open once.

---

## Burnout Effects on Charisma (LLM Integration)

When burned out, the system prompt for NPC responses includes context:

**SUSTAINABLE:** (none) — normal trust yields, normal negotiation.

**OVEREXTENDED (-20%):**
- System prompt: "The mayor seems tired today. Less engaged than usual. They checked their phone twice."
- Trust yields: ×0.8
- Negotiation: harder to get concessions
- Forgotten commitment risk: 5% per slot

**BURNOUT (-50%):**
- System prompt: "The mayor looks exhausted. Mixed up your name with someone else. Seems irritable and rushed. You've heard rumors they're overwhelmed."
- Trust yields: ×0.5
- Negotiation: character may refuse ("Come back when you can actually focus.")
- Forgotten commitment risk: 20% per slot
- Strategic contacts: may cancel meeting entirely
- Random negative events: "Mayor snaps at reporter", "Mayor misses community meeting"

**The NPC literally plays your burnout against you. You are LESS CHARMING when burned out.**

This connects to "Emotional Support" as a resource: leaders and mentors who give emotional support ARE your burnout buffer. Neglect those relationships → lose buffer → burn out faster → less effective with everyone → the spiral.

---

## Forgetting Commitments (Burnout Consequence)

When in BURNOUT zone, each slot has a % chance of triggering:

- "You double-booked yourself. Missed the meeting with Adrienne." (-8 trust, no benefit)
- "The coalition vote was today. You forgot. They voted without you." (coalition cohesion -10)
- "Mike waited 45 minutes at the community center. You never showed." (-12 trust)
- "You promised the press conference would address flooding. You talked about budgets instead." (credibility -5)

Each forgotten commitment = trust penalty WITHOUT the interaction benefit. You paid the slot cost, got nothing, AND pissed someone off.

The game can even reference these in future LLM conversations:
Character: "Last time you said you'd come to the meeting. You didn't."
[TRUST: -3] automatically applied before you even speak.

---

---

## Delegation: Buying Back Time (Progression Arc)

Delegation isn't just "hire someone." It's a progression that mirrors the game's narrative arc.

**TIER 0: SOLO MAYOR (Turns 1-8)**
You do everything yourself. 38 fixed, 22 discretionary.
Teaching moment: "This is what burnout feels like."

**TIER 1: FIRST HIRE (unlocks ~Turn 6-10)**
Cost: $50K/year + 2 slots/month managing them
Options:
- Community Liaison → constituent hours: 8→4 (net +4 slots)
- Press Secretary → media: 4→2 (net +2 slots)
- Scheduler → admin: 10→7 (net +3 slots)
The hire costs management time. Net gain is modest.

**TIER 2: DEPUTY (unlocks ~Turn 15-20, requires Political Will >50)**
Cost: $80K/year + 4 slots/month coordinating
Effect: Can delegate entire categories:
- Deputy attends 2/4 council sessions (save 2)
- Deputy handles ceremonial (save 3)
- Total: net +5/month
Risk: Deputy might make decisions you disagree with.
(Event: "Your deputy promised X to the council. You didn't know.")

**TIER 3: COMMUNITY SELF-GOVERNANCE (unlocks ~Turn 25+)**
Prerequisite: Trust > 60, 3+ coalitions, 2+ community-owned tiles
Effect:
- Leaders trust > 50 drop to 1 slot/quarter maintenance
- Coalitions cohesion > 70 self-maintain (0 slots)
- Community-owned tiles generate proposals without you
The REAL payoff of trust-building: community STOPS NEEDING YOU.
That's not failure — that's success.

**TIER 4: MOVEMENT (endgame, Turn 35+)**
Prerequisite: Path chosen, 5+ self-governing tiles
Effect:
- Fixed drops to 25/month. 35 discretionary.
- But: can't micromanage. Community makes choices you might disagree with. That's democracy.
Teaching: "You built something bigger than yourself. Now let it go."

**The delegation arc IS the narrative arc:**
- Awakening: Drowning. Solo.
- Transition: Hiring, trusting, building systems.
- Restoration: Community self-governs. Freed for strategic work.
- Beyond: Movement doesn't need you. That's the win.

Grace Lee Boggs: "The most radical thing I ever did was learn to let go."

---

## Visual Calendar vs Abstract Tokens (The Answer: Both, Layered)

**LAYER 1: THE ABSTRACT TOKEN (always visible)**
```
[████████████████░░░░░░░░░░░░] 14/22 slots remaining
```
Simple bar, like a stamina meter. What you see while playing.

**LAYER 2: THE VISUAL CALENDAR (expandable panel)**
Click the bar → actual month grid with days. Fixed obligations pre-filled grey. Your choices fill in colored.
THIS is the teaching moment. First time you open it:
"Oh. These grey blocks are things I HAVE to do. These are my actual free hours. That's... not many."

First-open tooltip: "This is your month. The grey blocks are obligations you can't skip — council, staff, press, constituent hours. The empty slots are yours. Everything you do costs time. Choose wisely."

**LAYER 3: THE YEAR VIEW (election / end-of-term)**
48 mini-months showing time allocation as heatmaps.
Where did your time GO over 4 years?
Narrative portrait. What voters see.

Key UX insight: You don't NEED to look at the calendar to play. The bar works for action economy. The calendar is there when you want to UNDERSTAND. And at election time, whether you want it or not.

---

## Crisis Arcs → Calendar Slot Tax

Each crisis stage specifies a `slotTax`: how many discretionary slots it consumes per month while active.

**Per arc, per stage:**
| Arc | Latent | Escalation | Crisis | Resolution |
|-----|--------|------------|--------|------------|
| Infrastructure Debt | 0 | 4 | 10 | 2 |
| Flooding | 0 | 2 | 8 | 3 |
| Housing Speculation | 0 | 3 | 6 | 2 |
| Energy Grid | 0 | 3 | 8 | 2 |
| Phosphorus/Food | 0 | 2 | 5 | 1 |

**Cascading crises (the death spiral):**
```
Infrastructure (escalation): 4 slots
+ Flooding (crisis):         8 slots
+ Housing (crisis):          6 slots
────────────────────────────────────
Total crisis tax:           18 slots
Discretionary: 22 - 18 =    4 SLOTS

You have FOUR meetings this month. Period.
```

**The death spiral:**
Crisis → slots consumed → can't maintain relationships → decay → trust drops → more crises trigger → more slots consumed → burnout → collapse.

**The virtuous cycle:**
Prevention → slots preserved → relationships maintained → trust up → fewer crises → more slots → strategic opportunities → more prevention.

**Rain garden's REAL ROI:**
- Cost: $140K
- Without: flood → 14 crisis slots consumed. 4 floods/term = 56 LOST SLOTS
- With: -50% damage → 7 crisis slots per flood. Saves 28 slots over term.
- 28 meetings. 28 relationships maintained. 28 opportunities not missed.
- The $140K rain garden saves your NETWORK from decaying.
- Proposal card should show: "Prevents ~7 crisis slots/flood"

---

## Burnout Buffer (The Hidden Meter)

From the spreadsheet: Emotional Support = highest resource flow (136,000 total). In game:

**Sources of buffer:**
- Community leaders (trust > 40): +0.5/interaction
- Mentors: +1.0/interaction (they've seen this before)
- Seedlings/youth: +0.8/interaction (their energy is contagious)
- Cultural events: +0.5 (you remember why you do this)
- Choosing NOT to overschedule: +2.0/month (rest compounds)

**Buffer depletion:**
- Each overscheduled slot: -1.0
- Each crisis slot consumed: -0.3
- Each forgotten commitment: -2.0
- Antagonist attacks: -0.5
- Month without community leader meetings: -3.0

**Visibility progression:**
- Buffer invisible when healthy (you don't think about burnout when rested)
- At 20%: "You're running on fumes. Consider resting."
- At 10%: "You snapped at your scheduler this morning."
- At 0%: OVEREXTENDED state activates automatically
- Below 0: BURNOUT

**Recovery:**
- Using fewer than max slots: +3.0/unused slot
- Meeting mentor while depleted: +2.0 (they talk you down)
- Cultural event while depleted: +1.5 (you remember joy)
- Scheduling "rest day" (burn a slot for nothing): +5.0

**THE PUNK INSIGHT: Scheduling a rest day is a POLITICAL ACT.**
Opponents: "The mayor took a vacation while our streets flooded."
Press: "Sources say the mayor has been disengaged."
But if you DON'T rest, you burn out and lose everything.
The game makes you choose: perform busyness for the public, or take care of yourself at political cost.
Subversive. Real. What leaders never talk about but all experience.

---

## Open Questions

1. Should the calendar be the PRIMARY game view (replacing the tab system), or a prominent panel alongside tiles?
2. Should fixed obligations be interactive at all? (e.g., "Council session: push a policy? Costs 1 extra slot if contentious")
3. How does the election specifically use calendar data? Attack ads? Debate questions? Precinct-level voting based on time-per-neighborhood?
4. Should seasons affect available slots? (Summer = outdoor events possible, Winter = fewer but more focused)
5. Can you LOSE a strategic contact permanently? (Door closes after 2 missed maintenance windows)
6. Does the burnout buffer replace the current "community trust" meter, or is it a separate resource?
7. Should the player be able to see the diminishing returns curve BEFORE committing? (Transparency vs discovery)
8. How does this interact with the LLM conversation system? Is every "Talk" action a full conversation, or are some just a trust increment with flavor text?
