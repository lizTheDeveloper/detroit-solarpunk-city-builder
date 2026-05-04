## ADDED Requirements

### Requirement: Policy enactment requires political will with specific thresholds
The player SHALL only enact policies when their Political Will meter meets or exceeds the policy's effective threshold (base threshold modified by public opinion). Enacting a policy immediately reduces Political Will by the policy's enactment cost.

Effective threshold formula (from narrative-system public opinion):
```
effective_threshold = base_threshold * (1 - topic_opinion * 0.003)
```

#### Scenario: Enact policy with sufficient political will
- **WHEN** the player attempts to enact "Community Land Trust Ordinance" (base threshold 45%, topic opinion on Land Reform is 30%) and current Political Will is 42%
- **THEN** effective threshold = 45% * (1 - 30 * 0.003) = 45% * 0.91 = 40.95%. Political Will 42% >= 40.95%, so the policy is enacted. Political Will decreases by the 10% enactment cost (42% -> 32%).

#### Scenario: Block policy with insufficient political will
- **WHEN** the player attempts to enact "Water Commons" (base threshold 60%, topic opinion 15%) and current Political Will is 50%
- **THEN** effective threshold = 60% * (1 - 15 * 0.003) = 60% * 0.955 = 57.3%. Political Will 50% < 57.3%, so the policy is blocked. Player sees: "Need 57.3% Political Will (have 50%). Shift public opinion on Water Commons to lower threshold."

### Requirement: Policy catalog with specific costs and effects
The system SHALL provide the following policies:

**Zoning Policies:**

| Policy | Base Threshold | Enactment Cost | Ongoing Drain | Effect |
|--------|---------------|----------------|---------------|--------|
| Urban Agriculture Zoning | 30% Will | 8% Will | 0.3%/turn | Enables Food Forest and Community Kitchen on commercial/industrial tiles (ignoring tile type restriction, contamination still applies) |

**Incentive Policies:**

| Policy | Base Threshold | Enactment Cost | Ongoing Drain | Effect |
|--------|---------------|----------------|---------------|--------|
| Green Infrastructure Grants | 40% Will | 10% Will | 0.4%/turn | All ecology-type project costs reduced by 20% |
| Cooperative Tax Incentives | 50% Will | 12% Will | 0.5%/turn | +$0.15M/year added to annual budget replenishment permanently |

**Governance Policies:**

| Policy | Base Threshold | Enactment Cost | Ongoing Drain | Effect |
|--------|---------------|----------------|---------------|--------|
| Participatory Budgeting | 55% Will | 15% Will | 0.5%/turn | +1 concurrent project slot (added to Trust-based formula), +3% Community Trust on enactment |
| Community Land Trust Ordinance | 45% Will | 10% Will | 0.3%/turn | Blocks gentrification events city-wide on all tiles that have a completed Land Trust project |

**Resource Policies:**

| Policy | Base Threshold | Enactment Cost | Ongoing Drain | Effect |
|--------|---------------|----------------|---------------|--------|
| Water Commons | 60% Will | 15% Will | 0.5%/turn | +5% Food Sovereignty on enactment, +3% Trust on enactment, all water-related project costs reduced by 30% (Water Transit Route, Wetland Restoration) |

#### Scenario: Zoning policy enables new projects
- **WHEN** the player enacts "Urban Agriculture Zoning" (costs 8% Will)
- **THEN** Food Forest and Community Kitchen become available on commercial and industrial tiles (still requires contamination <= 50%). The player's Political Will drops by 8%.

#### Scenario: Green Infrastructure Grants reduces costs
- **WHEN** "Green Infrastructure Grants" policy is active
- **THEN** all ecology-type projects cost 20% less: Food Forest $0.60M (was $0.75M), Soil Remediation $0.80M (was $1.0M), Rain Garden $0.32M (was $0.40M), Native Planting $0.64M (was $0.80M), Wetland Restoration $1.60M (was $2.0M)

### Requirement: Ongoing policy drain capped at specific rates
Enacted policies SHALL have ongoing per-turn Political Will drain that persists while the policy is active. Each policy's ongoing drain is capped at 0.5%/turn maximum, and the total ongoing drain from all policies combined is capped at 4.0%/turn.

```
per_policy_drain = min(0.5, policy.ongoing_drain)
total_policy_drain = min(4.0, sum of all active policy drains)
```

With all 6 policies enacted: 0.3 + 0.4 + 0.5 + 0.5 + 0.3 + 0.5 = 2.5%/turn total drain (well under the 4.0% cap).

#### Scenario: Policy ongoing drain applies
- **WHEN** the player has enacted Urban Agriculture Zoning (0.3%/turn) and Green Infrastructure Grants (0.4%/turn)
- **THEN** total ongoing policy drain is 0.3% + 0.4% = 0.7%/turn, deducted from Political Will each resolve phase

#### Scenario: Policy drain is capped
- **WHEN** the total ongoing drain from all enacted policies would exceed 4.0%/turn
- **THEN** the total is capped at 4.0%/turn. The turn summary shows: "Policy maintenance: -4.0%/turn (capped from X%)"

### Requirement: Policy political cost
Enacting policies SHALL reduce Political Will by the policy's enactment cost immediately upon enactment. This is a one-time cost separate from the ongoing drain.

#### Scenario: Policy reduces political will
- **WHEN** the player enacts Participatory Budgeting (15% enactment cost) with Political Will at 58%
- **THEN** Political Will decreases immediately to 58% - 15% = 43%. Additionally, ongoing drain of 0.5%/turn begins next resolve phase.

### Requirement: City council dynamics with vote mechanic
Major policies (base threshold > 40% Will) SHALL require a city council vote. The council has 9 members with positions:
- 3 start as Supportive (vote yes by default)
- 3 start as Neutral (50% chance to vote yes, modified by narrative actions)
- 3 start as Opposed (vote no by default)

Narrative actions shift council positions:
- Each Community Meeting on a topic related to the policy: +10% chance for 1 random Neutral to become Supportive
- Each Media Campaign on the topic: +5% chance for 1 random Opposed to become Neutral
- Cultural Events: +5% chance for 1 random Neutral to become Supportive

A majority (5+ yes votes) is needed. If the vote fails, the player can retry after 2 turns (cooldown) and the enactment Will cost is still spent.

#### Scenario: Council votes on major policy
- **WHEN** the player proposes Water Commons (base threshold 60%) with current Will at 62%
- **THEN** the system simulates a council vote: 3 Supportive vote yes, 3 Neutral each have a 50%+ modifier chance to vote yes, 3 Opposed vote no. Result displayed as "Passed 6-3" or "Failed 4-5" with individual positions shown. If failed, Political Will still decreases by the 15% enactment cost.

#### Scenario: Failed vote allows retry
- **WHEN** a council vote fails for Water Commons
- **THEN** the player cannot re-propose Water Commons for 2 turns. During the cooldown, narrative actions can shift council member positions to improve chances on retry.
