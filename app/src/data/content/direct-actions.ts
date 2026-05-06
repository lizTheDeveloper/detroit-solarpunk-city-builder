/**
 * Direct Action: the punk option.
 *
 * Skip the budget. Skip the permits. Spend trust and political capital
 * instead of money. Build faster, piss off the council, risk antagonist
 * escalation. Nobody asked permission.
 *
 * Mechanically:
 * - Costs 0 budget (or very little — scavenged materials)
 * - Costs trust (you're asking people to take a risk)
 * - Builds FAST (half duration, rounded up)
 * - Zero gentrification (you're not attracting capital, you're seizing space)
 * - Angers council members (-5 disposition each)
 * - 30% chance of antagonist escalation per direct action
 * - If trust < 50, people won't stick their necks out — can't do it
 *
 * Real Detroit precedents:
 * - Guerrilla gardens on DLBA lots (planted before anyone noticed)
 * - Heidelberg Project (Guyton just started painting houses)
 * - Trumbullplex squatting → eventual legal purchase
 * - Highland Park solar streetlights (Soulardarity bypassed DTE)
 * - Fireweed Universe City (occupied abandoned school)
 * - Grace Lee Boggs school in abandoned building
 * - Pirate radio stations (WDET alternative)
 * - Illegal basement shows funding community projects
 */

export interface DirectActionRisk {
  type: 'council_anger' | 'antagonist_escalation' | 'trust_loss' | 'political_will_drain';
  probability: number;
  magnitude: number;
  description: string;
}

export interface DirectActionFlavor {
  projectId: string;
  flavorText: string;
  risks: DirectActionRisk[];
}

export const DIRECT_ACTION_FLAVORS: Record<string, DirectActionFlavor> = {
  food_forest: {
    projectId: 'food_forest',
    flavorText: 'Showed up at 5 AM with shovels and 200 fruit trees before the land bank knew what happened. By the time they sent someone to check, the pawpaws were already in the ground and thirty neighbors were watering them. What are they gonna do, arrest the grandma with the hose?',
    risks: [
      { type: 'council_anger', probability: 0.4, magnitude: -3, description: 'Council member calls it "illegal dumping of vegetation"' },
      { type: 'antagonist_escalation', probability: 0.2, magnitude: 1, description: 'Land speculator files complaint about unpermitted agriculture' },
    ],
  },
  native_planting: {
    projectId: 'native_planting',
    flavorText: 'Seed bombs made in the church kitchen — clay, compost, native wildflower mix rolled into balls the size of golf balls. Kids threw them into every vacant lot between Joy Road and Michigan Ave on a Saturday morning. Called it a "nature walk." City can\'t mow what they can\'t find under the six-foot bluestem.',
    risks: [
      { type: 'council_anger', probability: 0.2, magnitude: -2, description: 'Complaints about "overgrown weeds" from people who moved here last year' },
    ],
  },
  rain_garden: {
    projectId: 'rain_garden',
    flavorText: 'Dug the bioswale on a Sunday when the code enforcement office is closed. Connected it to the neighbor\'s downspout with PVC from the dumpster behind the hardware store. By Monday the swale was full of rainwater and the storm drain wasn\'t backing up into the basement anymore. Filed the permit retroactively. Or didn\'t.',
    risks: [
      { type: 'council_anger', probability: 0.3, magnitude: -2, description: 'DWSD sends a letter about "unauthorized stormwater modifications"' },
      { type: 'political_will_drain', probability: 0.3, magnitude: -5, description: 'Bureaucrats spend two meetings debating jurisdiction' },
    ],
  },
  solar_grid: {
    projectId: 'solar_grid',
    flavorText: 'Panels went up on a weekend. Inverters wired by a retired electrician who used to work for DTE — knows exactly which codes to "interpret creatively." Interconnection agreement? That\'s for people who plan to ask DTE\'s permission to generate their own power. The meter runs backwards now and nobody\'s said anything. Yet.',
    risks: [
      { type: 'antagonist_escalation', probability: 0.5, magnitude: 1, description: 'DTE sends disconnection notice for "unauthorized generation"' },
      { type: 'council_anger', probability: 0.5, magnitude: -5, description: 'Utility lobby pressures council to "address safety concerns"' },
      { type: 'trust_loss', probability: 0.2, magnitude: -3, description: 'Some neighbors scared of the legal exposure' },
    ],
  },
  maker_space: {
    projectId: 'maker_space',
    flavorText: 'Occupied the old factory on a Friday night. Changed the locks, swept the floor, ran an extension cord from the church next door. Laser cutter was online by Monday. Landlord lives in Florida and hasn\'t checked on the building since 2019. Adverse possession kicks in at 15 years in Michigan — clock\'s ticking.',
    risks: [
      { type: 'antagonist_escalation', probability: 0.4, magnitude: 1, description: 'Absentee landlord\'s property management company sends cease-and-desist' },
      { type: 'council_anger', probability: 0.3, magnitude: -4, description: 'Fire marshal "concerned about egress" (read: developer wants the building)' },
    ],
  },
  community_kitchen: {
    projectId: 'community_kitchen',
    flavorText: 'Started cooking in the church without a commercial license. Health inspector came once, ate the jollof rice, said "I didn\'t see anything." Cottage food law covers sales under $25K anyway. The real kitchen — the one with the walk-in and the six-burner — that got "donated" when the restaurant on Vernor closed at 2 AM and someone happened to have a truck.',
    risks: [
      { type: 'council_anger', probability: 0.2, magnitude: -2, description: 'Health department sends a "friendly reminder" about licensing' },
      { type: 'trust_loss', probability: 0.1, magnitude: -2, description: 'Some folks worried about liability if someone gets sick' },
    ],
  },
  land_trust: {
    projectId: 'land_trust',
    flavorText: 'Bought the lots at tax auction for $500 each using money from a fish fry and three basement shows. Filed the deed restrictions before the speculators\' lawyers even knew the auction happened. Legal? Completely. Expected? Absolutely not. The look on the Quicken Loans guy\'s face when he found out those lots were deed-restricted forever — that alone was worth the $4,000.',
    risks: [
      { type: 'antagonist_escalation', probability: 0.6, magnitude: 1, description: 'Developer lobby demands council "review" land trust tax exemptions' },
      { type: 'political_will_drain', probability: 0.4, magnitude: -8, description: 'Legal challenges from displaced speculators tie up political energy' },
    ],
  },
  greenway: {
    projectId: 'greenway',
    flavorText: 'Started mowing a path through the abandoned rail corridor. Then someone put down gravel. Then someone else planted milkweed on both sides. Then the benches appeared — welded from scrap by the kid who got kicked out of Cass Tech for "unauthorized fabrication." By the time the city noticed, four thousand bikes were using it every Monday night. Try closing it now.',
    risks: [
      { type: 'council_anger', probability: 0.4, magnitude: -4, description: 'Railroad company claims right-of-way, threatens litigation' },
      { type: 'antagonist_escalation', probability: 0.3, magnitude: 1, description: 'Developer sees the greenway as a selling point — starts buying adjacent lots' },
    ],
  },
};

/**
 * Direct action mode constants
 */
export const DIRECT_ACTION_RULES = {
  trustCost: 8,
  minTrust: 50,
  durationMultiplier: 0.5,
  budgetCost: 0.02, // token amount — scavenged materials
  gentrificationMultiplier: 0,
  councilDispositionPenalty: -5,
  antagonistEscalationChance: 0.30,
  trustGainOnComplete: 6, // people love it when it works
};
