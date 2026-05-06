/**
 * Research Citations — Real-world data sources for game balance calibration.
 *
 * Every number in this game is grounded in real Detroit data. This file documents
 * the sources so designers can verify and update values as new data becomes available.
 *
 * Scale factor: Game operates at approximately 1000:1 for budget values.
 * Real Detroit general fund: $1.46B. Game budget: ~$1.5M starting.
 * 1 turn = 1 season (3 months). 4 turns = 1 year. 64 turns = 16 years.
 */

export const RESEARCH_CITATIONS = {
  // ─── BUDGET & ECONOMICS ─────────────────────────────────────────────
  budget: {
    totalCityBudget: {
      value: '$2.76B total, $1.46B general fund',
      source: 'Detroit FY2024 Budget',
      url: 'https://detroitmi.gov/departments/office-chief-financial-officer/financial-reports',
      gameImplication: 'Starting budget $1.5M at 1000:1 scale',
    },
    revenueBreakdown: {
      value: 'Income tax 30%, casinos 19%, state revenue sharing 18%, property tax 12%',
      source: 'Detroit FY2024 Budget Revenue Analysis',
      gameImplication: 'Higher trust → more state sharing; eco projects → less emergency spending',
    },
    quarterlyRevenue: {
      value: '$365M/quarter general fund',
      source: 'Detroit FY2024 Budget / 4',
      gameImplication: 'Base replenishment $0.30M/turn + bonuses from trust/eco',
    },
    bankruptcyContext: {
      value: '$18-20B debt, emerged Dec 2014 after 21 months under emergency manager',
      source: 'Wikipedia - Detroit bankruptcy',
      gameImplication: 'Budget collapse = state intervention = loss condition',
    },
  },

  // ─── PROJECT COSTS ──────────────────────────────────────────────────
  projectCosts: {
    communityGarden: {
      real: '$7,000-$15,000',
      game: '$0.01-0.02M',
      source: 'Keep Growing Detroit, Greening of Detroit annual reports',
    },
    foodForest: {
      real: '$40,000-$100,000',
      game: '$0.10M',
      source: 'USDA Urban Agriculture grants, Detroit Food Policy Council',
    },
    rainGarden: {
      real: '$140,000 per bioretention installation',
      game: '$0.14M',
      source: 'DWSD Cody Rouge project (2015), 300K gal/yr stormwater diverted',
    },
    solarInstallation: {
      real: '$200,000-$500,000 community-scale',
      game: '$0.40M',
      source: 'DTE Solar Neighborhoods program, Soulardarity Highland Park',
    },
    greenway: {
      real: '$1.7-12M per mile (Joe Louis Greenway: 27.5 mi, $250M+ total)',
      game: '$0.30M per neighborhood segment',
      source: 'Detroit Greenways Coalition, Joe Louis Greenway budget',
    },
    soilRemediation: {
      real: '$500K-$2M per site (EPA brownfield grants average $500K)',
      game: '$0.50M',
      source: 'EPA Brownfields Program, Michigan DEQ cleanup standards',
    },
    wetlandRestoration: {
      real: '$800K-$3M (Rouge River restoration projects)',
      game: '$0.80M',
      source: 'Friends of the Rouge, GLWA watershed management',
    },
  },

  // ─── ECOLOGY & TIMELINES ────────────────────────────────────────────
  ecology: {
    treeCanopy: {
      value: '26% current, 40% target, losing 2,000 trees/year',
      source: 'American Forests, Greening of Detroit',
      gameImplication: 'Eco decays -0.3/turn without investment (swimming upstream)',
    },
    rainGardenEffect: {
      value: 'Immediate stormwater benefit; 300K gal/yr per installation',
      source: 'DWSD Cody Rouge bioretention (2015)',
      gameImplication: 'Duration 1 turn, immediate eco effect',
    },
    foodForestMaturity: {
      value: '7-10 years to full production; partial yield in 2-3 years',
      source: 'USDA Plant Hardiness Zone 6a data, Brightmoor Farmway timeline',
      gameImplication: 'Duration 3 turns (partial), but food sov +8 reflects long-term value',
    },
    biodiversityReturn: {
      value: '100+ bird species after 5 years of meadow restoration (single park)',
      source: 'Detroit Bird City, Callahan Park monitoring data',
      gameImplication: 'Native planting shows strong eco return within 5-10 turns',
    },
    brightmoorFarmway: {
      value: '8 years from one garden to neighborhood identity transformation',
      source: 'Brightmoor Alliance records, Detroit Future City framework',
      gameImplication: 'Full neighborhood transformation = 32 turns of sustained investment',
    },
    annualProduce: {
      value: '550,000 lbs grown across 2,200+ farms/gardens (<5% of neighborhood needs)',
      source: 'Keep Growing Detroit 2023 report',
      gameImplication: 'Food sov starts at 12% — massive gap between current and sufficient',
    },
  },

  // ─── CLIMATE ────────────────────────────────────────────────────────
  climate: {
    floodFrequency: {
      value: '4+ major floods since 2016; effective return period now 1-2 years',
      source: 'Grist, Bridge Michigan, GLISA data',
      gameImplication: 'Climate events fire frequently even at 30% pressure',
    },
    flood2014: {
      value: '4.57-6+ inches in <12 hours; $1.8B damage; 118,000 homes affected',
      source: 'Wikipedia August 2014 United States floods, FEMA records',
      gameImplication: 'Catastrophic flood = $1.8M game scale (nearly full budget wipe)',
    },
    flood2021: {
      value: '6 inches in 5 hours; $100M+ FEMA payout; 94,356 applicants',
      source: 'FEMA disaster records, Bridge Michigan',
      gameImplication: 'Moderate flood = -$0.15M budget hit',
    },
    sewerCapacity: {
      value: 'Designed for 2 inches; 4-6 inches = system-wide failure',
      source: 'Detroit Water Director Gary Brown, DWSD capacity study',
      gameImplication: 'Rain gardens directly reduce flood damage (adaptation mechanic)',
    },
    heatProjection: {
      value: '13 days 90F+ now → 35 days by 2050 (5x increase)',
      source: 'ClimateCheck Detroit, NWS Detroit heat data',
      gameImplication: 'Heat wave frequency increases with climate pressure',
    },
    iceStorms: {
      value: '2-3 per decade; 2023 knocked out 700K+ customers for up to 2 weeks',
      source: 'Great Lakes Energy, Bridge Michigan',
      gameImplication: 'Ice storms cause -$0.20M + trust damage (prolonged outages)',
    },
    urbanHeatIsland: {
      value: 'Detroit urban areas 8F hotter than rural; some neighborhoods 10F+',
      source: 'Planet Detroit, University of Michigan study',
      gameImplication: 'Greenways provide -40% heat damage (canopy cooling)',
    },
    temperatureIncrease: {
      value: '+3F since 1900; +3-6F projected by 2050',
      source: 'Michigan State Climate Summary 2022, GLISA regional maps',
      gameImplication: 'Climate pressure: 0.55/turn base, accelerating 5%/year',
    },
    extremePrecipitation: {
      value: '2-inch+ events increased 128% from 1964-2014',
      source: 'GLISA Great Lakes Regional Climate Change Maps',
      gameImplication: 'Event probability: 10% base + 0.8% per climate pressure point',
    },
  },

  // ─── POLITICS & ELECTIONS ───────────────────────────────────────────
  politics: {
    electionThreshold: {
      value: 'Duggan 2013: 55% (contested). 2017: 72% (comfortable). 2021: 75% (blowout)',
      source: 'Ballotpedia, Wikipedia Detroit mayoral elections',
      gameImplication: 'Trust 50% + some allies = barely win. Trust < 50% = lose.',
    },
    voterTurnout: {
      value: '18-22% typical; 35% in wealthy neighborhoods; 10% in underserved areas',
      source: 'BridgeDetroit 2025 election analysis, Axios Detroit',
      gameImplication: 'Leader advocates matter more than raw popularity (low turnout elections)',
    },
    policyTimeline: {
      value: 'Fast (crisis): days. Normal (targeted): 3-4 years. Structural: 4-8 years, may fail',
      source: 'Detroit People\'s Platform decade report, Right to Counsel Coalition',
      gameImplication: 'Policy thresholds: 20-30% Will for easy, 35-45% for contested, 50%+ for structural',
    },
    communityOrganizing: {
      value: '5+ orgs = noticed. 20+ orgs = actionable. Mayor opposition can kill 67-33',
      source: 'Detroit People\'s Platform, Proposal P rejection',
      gameImplication: 'Coalitions provide +5 election score each; antagonists -4',
    },
    councilStructure: {
      value: '9 members (7 district + 2 at-large). 5/9 = simple majority. 6/9 = supermajority',
      source: 'Detroit City Charter 2012',
      gameImplication: 'Council disposition > 30 = +2 election score per member',
    },
    approvalBenchmark: {
      value: 'Duggan peak: 84% approval. Sheffield: 77% vote. Minimum re-election: ~55%',
      source: 'Detroit News 2025 polling, BridgeDetroit',
      gameImplication: 'Starting trust 50% = vulnerable. Must build to 55%+ for safe re-election',
    },
    emergencyManager: {
      value: '50% of Michigan Black residents placed under EM; only 2% of white residents',
      source: 'Michigan Advance, DREM organizing records',
      gameImplication: 'State intervention is the ultimate loss condition — racially disproportionate',
    },
  },

  // ─── GENTRIFICATION ─────────────────────────────────────────────────
  gentrification: {
    propertyValueGap: {
      value: 'Corktown $250K vs Brightmoor $55K = 4.5:1 ratio',
      source: 'Zillow, Detroit Land Bank Authority data',
      gameImplication: 'Infrastructure projects increase gentrification in undervalued neighborhoods',
    },
    antiDisplacement: {
      value: '6+ active CLTs; Inclusionary Zoning (2017): 20% affordable for subsidized devs',
      source: 'National CLT Network, NLIHC Detroit report',
      gameImplication: 'Land Trust project: -15 gentrification change. CLT policy blocks pressure entirely.',
    },
    communityBenefits: {
      value: 'CBO passed 2016 (53-47%); requires developer negotiation with neighborhoods',
      source: 'Building Movement Project, Detroit News election results',
      gameImplication: 'Community Benefits policy: requires 50% Will but provides anti-displacement + revenue',
    },
  },

  // ─── FOOD SOVEREIGNTY ───────────────────────────────────────────────
  food: {
    foodInsecurity: {
      value: '36% lack adequate food access; 3x national average',
      source: 'USDA Food Desert Atlas, Detroit Food Policy Council',
      gameImplication: 'Starting food sov 12% — critical gap. Each food project matters.',
    },
    urbanFarming: {
      value: '2,200+ farms/gardens; 550K lbs/year; still <5% of neighborhood needs',
      source: 'Keep Growing Detroit 2023',
      gameImplication: 'Each food forest adds meaningful % but total transformation requires many',
    },
    waterAccess: {
      value: '100,000 residents had water shut off; Lifeline Plan caps bills at 1.8% income',
      source: 'We the People of Detroit, City of Detroit water affordability plan',
      gameImplication: 'Water Commons policy: +5% food sov reflects water-food nexus',
    },
  },
} as const;

export type CitationCategory = keyof typeof RESEARCH_CITATIONS;
