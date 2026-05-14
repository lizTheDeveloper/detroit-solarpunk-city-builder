## ADDED Requirements

### Requirement: Delegation tier progression
The system SHALL provide 4 delegation tiers unlocked by game state thresholds. Each tier reduces fixed obligation slots but adds management overhead. Net effect is increased discretionary time.

#### Scenario: Tier 1 unlock (First Hire)
- **WHEN** the player reaches turn 8+ AND has $50K+ budget remaining AND political will > 40
- **THEN** Tier 1 delegation SHALL become available: costs $50K/year, management cost 2 slots/month, fixed obligation reduction 6 slots/month (net gain: +4 discretionary)

#### Scenario: Tier 2 unlock (Deputy Mayor)
- **WHEN** the player reaches turn 16+ AND has a champion-trust NPC available AND political will > 55
- **THEN** Tier 2 delegation SHALL become available: costs $80K/year, management cost 3 slots/month, fixed obligation reduction 12 slots/month (net gain: +9 discretionary)

#### Scenario: Tier 3 unlock (Community Self-Governance)
- **WHEN** 3+ neighborhoods have community-owned tiles AND community trust > 70
- **THEN** Tier 3 delegation SHALL activate automatically: no budget cost, no management cost, fixed obligations reduced by 8 additional slots (community handles its own governance)

#### Scenario: Tier 4 unlock (Movement)
- **WHEN** the player reaches the "beyond" stage of the narrative arc
- **THEN** Tier 4 SHALL activate: the player becomes a facilitator, fixed obligations drop to 15 (from 38), discretionary rises to 45

### Requirement: Deputy autonomous decisions
At Tier 2+, the deputy SHALL make autonomous decisions on some fixed-obligation matters. These decisions MAY not align with player strategy, creating a delegation trust dynamic.

#### Scenario: Deputy makes a suboptimal choice
- **WHEN** the deputy handles a fixed-obligation task autonomously
- **THEN** there SHALL be a 20% chance the decision conflicts with player priorities AND a narrative event fires describing what the deputy did

#### Scenario: Deputy trust builds over time
- **WHEN** the player has maintained Tier 2 for 6+ months without overriding the deputy
- **THEN** the deputy's autonomous decision quality SHALL improve (conflict chance drops to 10%)

### Requirement: Delegation hire as action
Hiring at Tier 1 and Tier 2 SHALL be actions that cost slots and trigger narrative events. The player must actively choose to delegate.

#### Scenario: Hiring costs calendar slots
- **WHEN** the player initiates a Tier 1 hire
- **THEN** 3 slots SHALL be consumed (interviews + onboarding) AND the hire takes effect next month

#### Scenario: Firing removes delegation benefits
- **WHEN** the player fires their delegate (voluntarily or budget crisis)
- **THEN** the fixed obligation reduction SHALL immediately revert AND a narrative event fires about political fallout
