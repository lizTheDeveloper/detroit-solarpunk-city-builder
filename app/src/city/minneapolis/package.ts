import type { CityPackage, CityCharacter, CityCrisisArc } from '../types';
import type { FeatureCollection, Polygon } from 'geojson';

// Real GeoJSON loaded at runtime from public/data/cities/minneapolis/
const emptyFC: FeatureCollection<Polygon> = { type: 'FeatureCollection', features: [] };

export const mplCharacterDefs: CityCharacter[] = [
  {
    id: 'mpl-tracey',
    name: 'Tracey Redcrow',
    role: 'Indigenous housing advocacy leader',
    organizationInspiredBy: 'Native American Community Development Institute',
    organizationUrl: 'https://www.nacdi.org/',
    neighborhood: 'Phillips West',
    issues: ['indigenous housing', 'sovereignty', 'culturally responsive development'],
    personality: {
      baseReliability: 0.6,
      trustThreshold: 40,
      priorityPolicies: ['community_land_trust', 'affordable_housing_mandate'],
      adversarialPolicies: ['luxury_development', 'gentrification_project'],
      arcAffinity: ['housing-access-arc', 'sovereignty-arc'],
      quote: '"This isn\'t just about housing — it\'s about staying on the land that was never ceded."',
    },
    backstory:
      'Descendant of Ojibwe and Dakota nations. Has spent 20 years fighting displacement in the Phillips neighborhood, where the American Indian Movement was born in 1968.',
    pedagogicalIntent:
      'Teaches players about Indigenous sovereignty and the ongoing fight for housing justice in gentrifying neighborhoods.',
  },
  {
    id: 'mpl-abdi',
    name: 'Abdi Warsame',
    role: 'East African small business coalition leader',
    organizationInspiredBy: 'Cedar-Riverside small business association',
    organizationUrl: 'https://cedarriverside.org/',
    neighborhood: 'Cedar-Riverside',
    issues: ['immigrant entrepreneurship', 'zoning reform', 'cultural districts'],
    personality: {
      baseReliability: 0.5,
      trustThreshold: 50,
      priorityPolicies: ['commercial_district_protection', 'microloan_program'],
      adversarialPolicies: ['corporate_chain_incentive', 'aggressive_code_enforcement'],
      arcAffinity: ['small-business-arc', 'cultural-district-arc'],
      quote: '"We built this neighborhood from nothing. Now the investors want to price us out."',
    },
    backstory:
      'Arrived in Minneapolis as a refugee from Somalia in 1996. Built a thriving restaurant row in Cedar-Riverside. Now advocates for immigrant-owned businesses.',
    pedagogicalIntent:
      'Explores immigrant entrepreneurship, cultural districts, and the tension between preservation and development.',
  },
  {
    id: 'mpl-sarah',
    name: 'Sarah Lindgren',
    role: 'Linden Hills neighborhood association president',
    organizationInspiredBy: 'Linden Hills Neighborhood Association',
    organizationUrl: 'https://www.lindenhills.org/',
    neighborhood: 'Linden Hills',
    issues: ['NIMBY zoning', 'park preservation', 'traffic calming'],
    personality: {
      baseReliability: 0.7,
      trustThreshold: 60,
      priorityPolicies: ['park_preservation', 'traffic_calming', 'historic_preservation'],
      adversarialPolicies: ['upzoning', 'density_bonus', 'industrial_expansion'],
      arcAffinity: ['park-arc', 'gentrification-arc'],
      quote: '"We need to preserve what makes Linden Hills special before it becomes just another generic suburb."',
    },
    backstory:
      'Fourth-generation Linden Hills resident. Her family\'s hardware store has been on the corner since 1952. Loves her neighborhood but resists change.',
    pedagogicalIntent:
      'Illustrates NIMBY politics and the tension between neighborhood preservation and citywide housing needs.',
  },
  {
    id: 'mpl-marcus',
    name: 'Marcus Bell',
    role: 'Environmental justice organizer',
    organizationInspiredBy: 'MN350 / Sierra Club North Star Chapter',
    organizationUrl: 'https://mn350.org/',
    neighborhood: 'Powderhorn Park',
    issues: ['fossil fuel divestment', 'air quality', 'just transition'],
    personality: {
      baseReliability: 0.4,
      trustThreshold: 45,
      priorityPolicies: ['fossil_free_pledge', 'energy_efficiency_rebate', 'air_monitoring'],
      adversarialPolicies: ['gas_pipeline_expansion', 'coal_terminal'],
      arcAffinity: ['air-quality-arc', 'energy-transition-arc'],
      quote: '"The refineries are poisoning us and calling it \'essential infrastructure.\' We will shut them down."',
    },
    backstory:
      'Grew up next to the Marathon refinery\'s tank farm in St. Paul Park. His mother died of cancer he believes was caused by pollution. Now leads MN350 campaigns to shut down fossil fuel infrastructure.',
    pedagogicalIntent:
      'Teaches environmental justice and the tension between economic infrastructure and community health.',
  },
  {
    id: 'mpl-tom',
    name: 'Tom Hufbauer',
    role: 'Downtown business association executive',
    organizationInspiredBy: 'Downtown Minneapolis Council',
    organizationUrl: 'https://downtownmpls.com/',
    neighborhood: 'Downtown West',
    issues: ['public safety', 'office vacancy', 'transit investment'],
    personality: {
      baseReliability: 0.6,
      trustThreshold: 55,
      priorityPolicies: ['small_business_grants', 'transit_investment', 'public_safety_funding'],
      adversarialPolicies: ['defund_police', 'anti_development'],
      arcAffinity: ['downtown-recovery-arc', 'transit-arc'],
      quote: '"Downtown isn\'t dying — it\'s changing. We just need to guide the change."',
    },
    backstory:
      'Former city planner turned economic development director. Believes downtown Minneapolis can recover from pandemic-era vacancy with the right mix of housing, retail, and transit.',
    pedagogicalIntent:
      'Explores post-pandemic downtown recovery and the tension between different visions for urban cores.',
  },
  {
    id: 'mpl-elena',
    name: 'Elena Ramirez',
    role: 'West side tenant union organizer',
    organizationInspiredBy: 'Inquilinxs Unidxs por Justicia',
    organizationUrl: 'https://www.inquilinxs.org/',
    neighborhood: 'Phillips West',
    issues: ['tenant protections', 'anti-displacement', 'rent control'],
    personality: {
      baseReliability: 0.4,
      trustThreshold: 40,
      priorityPolicies: ['rent_control', 'tenant_protections', 'community_land_trust'],
      adversarialPolicies: ['eviction_fast_track', 'luxury_development'],
      arcAffinity: ['evictions-arc', 'housing-speculation-arc'],
      quote: '"If the city won\'t protect us, we\'ll protect ourselves."',
    },
    backstory:
      'Organizes rent strikes in the Phillips neighborhood. Believes housing is a human right, not a commodity.',
    pedagogicalIntent:
      'Teaches tenant organizing, rent control politics, and the limits of market-based housing solutions.',
  },
];

export const mplCrisisArcs: CityCrisisArc[] = [
  {
    id: 'police-abolition-arc',
    name: 'Police Abolition & Public Safety',
    localDescription:
      'After George Floyd was murdered by MPD officers in 2020, Minneapolis voted to abolish the police department — then reversed course. The city struggles to balance community safety demands with calls for transformative justice.',
    keywords: ['police', 'abolish', 'public safety', 'MPD', 'George Floyd', '3rd Precinct'],
    escalationThreshold: 60,
    localities: ['Near North', 'Phillips West', 'Cedar-Riverside', 'Powderhorn Park'],
    connectedArcs: ['housing-access-arc', 'youth-investment-arc'],
    pedagogicalChain:
      'Abolish police (popular, high risk) → invest in alternatives (moderate, slow) → hybrid model with oversight (complex but stable)',
    realExamples: [
      '2020: George Floyd uprising leads to $8M cut from MPD budget',
      '2021: Voters reject Question 2 to replace police with "public safety department"',
      '2023: Mayor Frey hires police chief with reform mandate',
      '2025: MPD still below authorized staffing levels',
    ],
  },
  {
    id: 'affordable-housing-arc',
    name: 'Housing Affordability & Displacement',
    localDescription:
      'Minneapolis has become one of the most expensive rental markets in the Midwest. Longtime residents in Phillips, Cedar-Riverside, and Near North face displacement as developers target transit-accessible areas.',
    keywords: ['housing', 'rent', 'displacement', 'gentrification', 'CLT', 'missing middle'],
    escalationThreshold: 55,
    localities: ['Phillips West', 'Cedar-Riverside', 'Near North', 'North Loop'],
    connectedArcs: ['police-abolition-arc', 'small-business-arc'],
    pedagogicalChain:
      'Do nothing (popular, high displacement) → inclusionary zoning (moderate) → community land trusts (slow but permanent)',
    realExamples: [
      'Median rent increased 42% from 2015-2024',
      '2040 Plan legalized triplexes citywide in 2018',
      'Minneapolis Public Housing Authority waiting list: 4+ years',
      'Native American Community Development Institute fights displacement in Phillips',
    ],
  },
  {
    id: 'transit-equity-arc',
    name: 'Transit Equity & Mobility',
    localDescription:
      'Minneapolis has invested heavily in light rail (Blue Line, Green Line) and BRT (A Line, C Line, D Line). But transit access remains inequitable — north side neighborhoods have less frequent service than south.',
    keywords: ['transit', 'light rail', 'BRT', 'Metro Transit', 'bike', 'bus'],
    escalationThreshold: 45,
    localities: ['Cedar-Riverside', 'Powderhorn Park', 'Near North', 'North Loop'],
    connectedArcs: ['affordable-housing-arc', 'police-abolition-arc'],
    pedagogicalChain:
      'Expand rail (visible, expensive) → improve bus frequency (equitable, less visible) → transit-oriented development (combines both)',
    realExamples: [
      'Blue Line opened 2004, serves airport and Mall of America',
      'Green Line opened 2014, connects downtowns of Minneapolis and St. Paul',
      'A Line (Snelling Ave) opened 2016 as first BRT',
      'D Line (Chicago-Fremont) opened 2022, serves north Minneapolis',
      'Metro Transit ridership only recovered to 65% of pre-pandemic levels',
    ],
  },
];

const minneapolisPackage: CityPackage = {
  meta: {
    cityName: "Minneapolis",
    state: "MN",
    center: [-93.265, 44.978],
    zoomBounds: { min: 10, max: 18 },
    generatedAt: new Date().toISOString().slice(0, 10),
    version: 1,
  },
  geography: {
    neighborhoodBoundaries: emptyFC,  // Real data loads from public/data/cities/minneapolis/neighborhoods.geojson
    blockPolygons: emptyFC,  // Not yet available for Minneapolis
  },
  dataLayers: {},
  newsSources: [],
  characters: mplCharacterDefs,
  powerStructure: {
    mayor: {
      name: "Jacob Frey",
      since: "2018",
      wikidataId: "Q16217518",
    },
    council: [],  // 13 wards, to be populated
    agencies: [],
    utilityCompanies: [],
  },
  crisisArcs: mplCrisisArcs,
  calibration: {
    cityBudget: { real: 1700000000, game: 850, source: "City of Minneapolis 2025 budget" },
    medianIncome: { value: 73000, source: "US Census ACS 2023" },
    vacancyRate: { value: 0.05, source: "US Census ACS 2023" },
    treeCanopy: { current: 0.20, target: 0.25, source: "Minneapolis Park & Recreation Board" },
    foodAccess: { percentLacking: 0.20, source: "MN Dept of Health 2023" },
    population: { value: 429954, source: "US Census 2020" },
  },
  sourceRegistry: [],
};

export default minneapolisPackage;
