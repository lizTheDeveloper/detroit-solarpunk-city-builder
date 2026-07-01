# Discretionary Budget, Proposal Review & Revenue Rebalance

## Design Philosophy

The game models a real structural problem: mayors aren't usually corrupt — they're overwhelmed. The system is designed to exceed the player's bandwidth. You physically cannot review every proposal, attend every meeting, and manage every crisis. Something has to go unread. That's not greed. That's Tuesday.

The budget mechanic reinforces this: the city has $1.5 billion, but the player controls $29 million. The rest is locked in operations — police, fire, transit, debt service. The constraint isn't money, it's the attention required to spend it wisely.

---

## 1. Discretionary Budget

### Structure

The game tracks two budget pools:

- **City Operating Budget** (`meters.budget`): $1,576M general fund. Visible, informational. Drives the monthly revenue/expense cycle via trust and eco modifiers. The player cannot spend from this directly.
- **Discretionary Capital Fund** (`meters.discretionary`): Starts at $29M. This is Detroit's real Housing & Revitalization capital budget. All project costs draw from this pool.

### Replenishment

The discretionary fund receives income from three sources:

1. **Monthly allocation from general fund**: $29M / 12 = ~$2.4M/month base rate, modified by trust:
   - Trust < 20: 25% allocation ($0.6M/mo) — council actively blocking you
   - Trust 20-39: 50% allocation ($1.2M/mo) — council skeptical
   - Trust 40-59: 100% allocation ($2.4M/mo) — baseline cooperation
   - Trust 60-79: 100% allocation ($2.4M/mo)
   - Trust 80+: 120% allocation ($2.9M/mo) — council approves supplemental
2. **Profit-center project revenue**: Completed solar grids, maker spaces, water transit, community kitchens deposit their `annualRevenue / 12` into discretionary each month.
3. **Regional collab cost savings**: Completed regional collaborations reduce project costs by a percentage rather than generating revenue (implemented as a cost modifier on new projects, not income).

### Drains

- **Project upfront costs**: Deducted from discretionary when a project starts.
- **Project maintenance**: Completed projects drain `maintenanceCost / 12` from discretionary each month.
- **Developer proposal hidden costs**: Accepted proposals with hidden financial terms (tax abatements, TIF diversions) reduce future revenue or increase ongoing costs against discretionary.

### Relationship to General Fund

The general fund still matters because it determines the monthly allocation. If trust tanks (low allocation) or eco collapses (emergency costs eat the general fund), the discretionary pool starves. The player feels general fund health indirectly through their shrinking allocation.

### Freeing Up Budget (Future Mechanic)

Cutting department budgets (e.g., reducing police by 10%) could move money from operational to discretionary. This is a political action with trust and council consequences. Not implemented in this spec — flagged for future design.

---

## 2. Project Revenue Rebalance

### Profit Centers (generate discretionary revenue)

| Project | Cost | Annual Revenue | Rationale |
|---------|------|---------------|-----------|
| solar_grid | $0.40M | $0.08M/yr | Co-op dividends, net metering — Soulardarity model |
| maker_space | $0.15M | $0.04M/yr | Memberships, equipment rental, product sales — i3Detroit model |
| water_transit | $1.50M | $0.05M/yr | Commercial water transit, miniature irrigation systems |
| community_kitchen | $0.08M | $0.01M/yr | Kitchen rental fees, cottage food licenses — marginal |

### Cost Centers (no revenue, maintenance drains discretionary)

| Project | Cost | Maintenance | Rationale |
|---------|------|-------------|-----------|
| food_forest | $0.10M | $0.005M/yr | Feeds people, doesn't generate city revenue |
| rain_garden | $0.14M | $0.005M/yr | Pure stormwater infrastructure |
| native_planting | $0.08M | $0.005M/yr | Pure ecology |
| soil_remediation | $0.50M | $0.01M/yr | Pure cleanup |
| greenway | $0.30M | $0.02M/yr | Infrastructure / connectivity |
| land_trust | $0.20M | $0.01M/yr | Anti-gentrification, no revenue |
| wetland_restoration | $0.80M | $0/yr | Self-maintaining once established |
| wildlife_corridor | $1.20M | $0/yr | Self-maintaining once established |

### Cost Savings (reduce costs, not revenue)

| Project | Cost | Effect | Rationale |
|---------|------|--------|-----------|
| regional_collab | $0.60M | -10% cost on future ecology/restoration projects | Shared purchasing, equipment co-ops — SEMCOG model |

### Revenue removed from

- `food_forest`: was $0.02M/yr, now $0 — food forests don't pay the city
- `regional_collab`: was $0.05M/yr, now cost-reduction modifier — shared purchasing isn't revenue

### Design tension

Profit centers generate gentrification pressure (solar_grid: +5, maker_space: +5, water_transit: +10). Cost centers don't (or reduce it, like land_trust: -15). Chasing revenue to refill your discretionary pool pushes gentrification unless you pair profit centers with land trusts. This is a real trade-off.

---

## 3. Proposal Sources

Three types of proposals compete for the discretionary pool:

### A. Community Leader Proposals (existing, tweaked)

The current system: leaders propose projects from their priority list. These draw from the existing project catalog. Terms are transparent — what the surface card says is what you get.

Changes:
- Project costs now deduct from `meters.discretionary` instead of `meters.budget`.
- Community proposals are marked `transparent: true` — opening them is optional (no hidden terms to discover). Reviewing still costs 1 slot but reveals additional context (community support level, synergy opportunities) rather than hidden downsides.

### B. Developer Proposals (new)

Every 2-4 turns, 1-3 developer proposals arrive. They pitch larger projects promising tax revenue, jobs, and "revitalization." Developer proposals are always `transparent: false`.

**Developer proposal structure:**

```typescript
interface DeveloperProposal extends Proposal {
  source: 'developer';
  transparent: false;
  surfaceSummary: {
    promisedRevenue: number;      // What they claim it'll generate
    promisedJobs: number;         // What they claim for jobs
    pitch: string;                // One-line sales pitch
  };
  hiddenTerms: HiddenTerm[];      // 1-3 downsides, revealed on review
  actualRevenue: number;          // Real revenue after hidden terms
  actualDisplacement: number;     // Real gentrification impact
  actualEcoImpact: number;        // Real environmental impact
}
```

**Developer proposal costs**: $2M-$15M range. These are bigger than community projects — a single developer proposal can eat half the discretionary pool. The surface card makes this look like a great investment.

**Developer proposal generation**: A pool of developer archetypes (luxury condo developer, big box retailer, "green" development firm, charter school operator, logistics/warehouse company) generate proposals using templates. Each archetype has characteristic hidden terms.

### C. Grant Opportunities (new, occasional)

Every 4-6 turns, a federal/state grant opportunity appears. Free or matched money, but with compliance requirements that cost calendar slots to manage.

```typescript
interface GrantProposal extends Proposal {
  source: 'grant';
  transparent: true;
  grantAmount: number;           // Free money
  matchRequired: number;         // Player must match from discretionary (0 = fully funded)
  complianceSlotCost: number;    // Monthly calendar slots for reporting (1-2)
  complianceDuration: number;    // How many months the reporting lasts
  restrictions: string[];        // What the money can be used for
}
```

Grants are transparent (no hidden terms) but have real costs: matching funds and ongoing calendar slots for compliance reporting. A $500K EPA brownfield grant that requires 1 slot/month for 12 months is "free" money that costs you 12 calendar slots over a year.

---

## 4. Proposal Review Mechanic

### States

Each proposal exists in one of three states:

1. **Unread**: Only the surface card is visible. For community proposals (transparent), this is fine — surface = reality. For developer proposals, the surface hides 1-3 downsides.
2. **Reviewed by player**: Full terms visible. All hidden terms revealed. Costs 1 calendar slot to open. Once opened, stays open — free to re-read.
3. **Reviewed by aide**: Partial reveal. Aide flags ~75% of hidden terms. Unflagged terms appear clean (indistinguishable from "no issues"). Uses 1 aide management slot (available at delegation tier 1+).

### Actions available by state

| State | Accept | Modify | Reject | Cost |
|-------|--------|--------|--------|------|
| Unread | Yes (risky) | No | Yes | 0 slots |
| Player-reviewed | Yes (informed) | Yes | Yes | 1 slot (already spent) |
| Aide-reviewed | Yes (partially informed) | Yes | Yes | 1 aide management slot |

- **Accept unread**: Developer proposals apply ALL hidden terms silently. The player finds out later when the project completes and the revenue isn't what was promised, or displacement spikes, or eco drops.
- **Modify**: Only available after review (player or aide). Lets the player negotiate out specific hidden terms at cost of reduced scope or longer timeline.
- **Reject**: Always available. Costs political capital with the proposer (developers may reduce future proposals or go to media).

### Aide Review

At delegation tier 1+, the player can assign their aide to review a proposal:
- Uses 1 of the aide's management slots (tier 1 has 2 management slots per month, tier 2 has 3).
- Aide catches ~75% of hidden terms. Exact catch rate is `0.70 + (tier * 0.05)` — tier 1 catches 75%, tier 2 catches 80%, tier 3 catches 85%.
- Unflagged hidden terms are NOT shown — they look like clean results. The player thinks the aide caught everything. They didn't.
- Aide review happens immediately (same turn) — no delay.

### Information Design

**Surface card (always visible):**
- Proposer name and affiliation
- Project title and one-line description
- Total cost
- Promised revenue / jobs / benefits
- "Review (1 slot)" button
- "Accept Without Review" button (developer proposals only — community proposals don't need this because they're transparent)
- "Assign Aide" button (if delegation tier 1+)

**Reviewed card (after opening):**
- Everything from surface card
- Actual revenue projection (may differ from promised)
- Displacement risk meter (none / low / moderate / high / severe)
- Environmental impact (positive / neutral / negative)
- Hidden terms listed with warning icons and explanations
- Community support/opposition indicator
- Accept / Modify / Reject buttons

**Aide-reviewed card:**
- Same as reviewed card BUT unflagged hidden terms are not shown
- Flagged terms have an aide annotation icon
- A subtle "Aide Review" badge (not "Partial Review" — the player shouldn't know it's incomplete)

---

## 5. Hidden Term Pool

Developer proposals draw 1-3 hidden terms from this pool. Each term has a category, mechanical effect, and surface disguise:

### Financial

| Term | Surface Disguise | Actual Effect |
|------|-----------------|---------------|
| Tax abatement (15yr) | "Projected $X/yr tax revenue" | Revenue = $0 for 15 years (180 turns), then full amount. Surface shows post-abatement number. |
| TIF diversion | "Tax increment financing district" | Diverts property tax growth from city services. -$0.1M/yr from general fund allocation for 20 years. |
| Inflated job count | "200 new jobs" | 40 permanent, 160 construction-phase. Surface shows total. After project completes, actual jobs = 20% of promised. |
| Cost overrun clause | "Estimated $X" | Final cost 30-50% higher than stated. Additional deduction from discretionary mid-construction. |

### Displacement

| Term | Surface Disguise | Actual Effect |
|------|-----------------|---------------|
| 80% AMI "affordable" | "Includes affordable housing" | Affordable units at 80% AMI = unaffordable for actual residents (Detroit median ~$37K). Gentrification pressure +15 instead of stated +5. |
| Small business displacement | "Site preparation" | Displaces 3-6 existing businesses. Trust -8 in affected tile when discovered. |
| No-enforcement CBA | "Community Benefits Agreement included" | CBA has no enforcement mechanism. Promised community benefits (hiring, green space) never materialize. |

### Environmental

| Term | Surface Disguise | Actual Effect |
|------|-----------------|---------------|
| Shallow remediation | "Environmental cleanup included" | Cleans top 2 feet, leaves contamination below. Tile contamination reduced by 20% instead of stated 60%. |
| Stormwater variance | "Green infrastructure included" | Exemption from stormwater requirements. Tile eco -3 and contributes to combined sewer overflow events. |
| Green facade | "LEED-certified design" | Standard construction with a green roof for the photo op. Eco bonus is +1 instead of stated +5. |

---

## 6. UI Changes

### BudgetPanel

Split into two sections:

**Top: Discretionary Capital Fund**
- Large display: current discretionary balance (e.g., "$24.3M")
- Monthly income breakdown: allocation from general fund + project revenue
- Monthly drain: project maintenance costs
- Net monthly change with +/- indicator
- Sparkline or mini bar chart showing last 6 months

**Bottom: City Operating Budget**
- Smaller display: general fund balance ("$1,576M General Fund")
- Monthly surplus/deficit from trust/eco modifiers
- Department expense breakdown (existing)
- Revenue sources (existing)
- Note: "Your monthly allocation depends on general fund health and council trust."

### ProposalPanel

Proposals displayed as cards with visual state:

**Unread developer proposal card:**
- Slightly frosted/blurred details section below the surface summary
- Surface info: proposer, title, cost, promised revenue, pitch
- "Review (1 slot)" button (primary action)
- "Accept Without Review" button (secondary, slightly muted — not hidden, but not encouraged)
- "Assign Aide" button (if available)
- No "Modify" button (can't negotiate what you haven't read)

**Reviewed card:**
- Full details revealed, frosted overlay removed
- Hidden terms highlighted with amber/red warning badges
- Actual vs. promised numbers shown side-by-side where they differ
- Accept / Modify / Reject buttons

**Aide-reviewed card:**
- Looks like a reviewed card — frosted overlay removed
- Flagged issues have aide icon annotations
- Unflagged hidden terms appear as clean/normal (indistinguishable from no issues)
- "Aide Review" badge in corner

**Community proposal card:**
- Clean card, no frosted overlay (transparent)
- "Review (1 slot)" button available but optional — reveals synergy info, community support level
- Accept / Modify / Reject buttons always available

**Header counter:** "6 proposals: 2 developer, 3 community, 1 grant | 1 reviewed, 1 aide-reviewed, 4 unread"

### TopBar

Replace current budget display with discretionary-focused display:
- "$24.3M Capital" (discretionary balance)
- Surplus indicator: "+$1.8M/mo" or "-$0.5M/mo" (net discretionary flow)
- General fund shown smaller or on hover: "($1,576M general fund)"

---

## 7. Data Model Changes

### GameState additions

```typescript
interface Meters {
  // existing
  communityTrust: number;
  ecologicalHealth: number;
  foodSovereignty: number;
  politicalWill: number;
  budget: number;           // General fund ($1,576M)
  climatePressure: number;
  // new
  discretionary: number;    // Discretionary capital fund ($29M start)
}
```

### Proposal type extensions

```typescript
type ProposalSource = 'community' | 'developer' | 'grant';

interface HiddenTerm {
  id: string;
  category: 'financial' | 'displacement' | 'environmental';
  surfaceDisguise: string;
  actualEffect: string;
  mechanicalEffect: {
    revenueMultiplier?: number;        // 0 = no revenue, 0.5 = half promised
    gentrificationDelta?: number;      // Additional gentrification beyond stated
    ecoDelta?: number;                 // Additional eco impact beyond stated
    trustDelta?: number;               // Trust hit when discovered
    costOverrun?: number;              // Additional cost multiplier
    allocationDrain?: number;          // Ongoing drain on general fund allocation
  };
}

interface Proposal {
  // existing fields
  id: string;
  leaderId: string;
  projectDefinitionId: string;
  tileId: string;
  reason: string;
  turnProposed: number;
  expirationTurn: number;
  pressureLevel: number;
  negotiation?: ProposalNegotiation;
  // new fields
  source: ProposalSource;
  transparent: boolean;
  reviewed: boolean;
  reviewedBy: 'player' | 'aide' | null;
  surfaceSummary: {
    promisedRevenue: number;
    promisedJobs: number;
    pitch: string;
  };
  hiddenTerms: HiddenTerm[];
  revealedTerms: string[];    // IDs of hidden terms that have been revealed
  // grant-specific (optional)
  grantAmount?: number;
  matchRequired?: number;
  complianceSlotCost?: number;
  complianceDuration?: number;
}
```

### Developer archetype pool

```typescript
interface DeveloperArchetype {
  id: string;
  name: string;
  firmName: string;
  projectTemplates: string[];        // Project types they propose
  typicalHiddenTerms: string[];      // Pool of hidden term IDs they tend to use
  costRange: [number, number];       // Min/max project cost
  reputationScore: number;           // 0-100, affects how many hidden terms
}
```

Example archetypes:
- **Luxury Condo Developer**: high cost ($8-15M), promises tax revenue + jobs, typical hidden terms: 80% AMI "affordable", tax abatement, small business displacement
- **Big Box Retailer**: medium cost ($5-10M), promises jobs, typical hidden terms: inflated job count, stormwater variance, TIF diversion
- **"Green" Development Firm**: medium cost ($3-8M), promises eco benefits, typical hidden terms: green facade, shallow remediation, no-enforcement CBA
- **Charter School Operator**: low-medium cost ($2-5M), promises education, typical hidden terms: tax abatement, takes property off tax rolls permanently
- **Logistics/Warehouse Company**: medium cost ($4-8M), promises jobs, typical hidden terms: environmental variance, truck traffic (eco impact), inflated job count

---

## 8. Budget Cycle Changes (resolve.ts Step 8)

The existing budget cycle in resolve.ts Step 8 is modified:

**General fund cycle** (unchanged):
- Monthly revenue: $1,576M/12 + trust bonus
- Monthly expenses: $1,576M/12 + eco emergency costs
- Net applied to `meters.budget`

**Discretionary cycle** (new, after general fund):
1. Calculate monthly allocation based on trust level (see Section 1)
2. Add allocation to `meters.discretionary`
3. Add profit-center project revenue to `meters.discretionary`
4. Subtract project maintenance from `meters.discretionary`
5. Subtract any hidden-term ongoing drains from `meters.discretionary`
6. Apply any active hidden term effects (tax abatement suppressing revenue, etc.)

**Project cost deduction**: When a project starts (via RESPOND_PROPOSAL accept, or START_PROJECT), deduct from `meters.discretionary` instead of `meters.budget`.

---

## 9. Testing Strategy

### Monte Carlo simulations (extend existing)

- Discretionary sustainability across 48 turns under various project rates
- Trust sensitivity on allocation (does low trust actually starve the player?)
- Developer proposal acceptance rates: what happens if player accepts all unreviewed?
- Aide review value: how much money does the aide save over 48 turns?

### Balance assertions

- At 2 projects/turn, discretionary should feel tight but manageable
- A single developer proposal can eat 20-50% of discretionary — meaningful
- Accepting all developer proposals unreviewed should produce measurably worse outcomes than reviewing
- Aide review should save 60-80% of hidden-term costs (not 100% — imperfect)
- Trust-gated allocation should create a real feedback loop: low trust → less money → fewer projects → lower trust

### Playtest scenarios

- **Trusting Mayor**: Accepts all developer proposals without review. Tracks hidden costs accumulated.
- **Diligent Mayor**: Reviews everything, no time for community meetings. Great budget, terrible trust.
- **Delegator**: Assigns aide to all reviews. Good but not perfect outcomes.
- **Balanced**: Reviews developers, auto-accepts community. The intended sweet spot.
