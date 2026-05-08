export interface VoiceProfile {
  id: string;
  name: string;
  entity: string;
  arcs: string[];
  tone: string;
  keyPhrases: string[];
  realWorldReferences: string[];
  genuineArgument: string;
  dependents: string[];
  exampleLanguage: string[];
}

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  dte_energy: {
    id: 'dte_energy',
    name: 'DTE Energy',
    entity: 'Regulated electric utility',
    arcs: ['energy-grid'],
    tone: 'Measured corporate reassurance. Emphasizes reliability, investment, and ratepayer protection. Frames community energy as reckless experimentation.',
    keyPhrases: [
      'grid reliability',
      'ratepayer protection',
      'infrastructure investment',
      'responsible energy transition',
      'system stability',
      'proven track record',
    ],
    realWorldReferences: [
      'MPSC rate case filings',
      'DTE IRP (Integrated Resource Plan)',
      'DTE 10-K SEC filings citing $20B grid modernization',
      'DTE earnings calls referencing distributed generation challenges',
    ],
    genuineArgument: 'Maintaining a reliable grid for 2.2 million customers requires massive capital investment that only a regulated utility can finance. Community microgrids are untested at scale and could leave vulnerable residents without power during emergencies.',
    dependents: [
      '2.2 million ratepayers',
      '11,000 direct employees',
      '5,000+ contractor jobs',
      'Municipal tax base ($50M+ annually)',
      'Pension fund obligations',
    ],
    exampleLanguage: [
      'We remain committed to delivering safe, reliable, and affordable energy to all our customers.',
      'Our $20 billion grid modernization plan will create thousands of jobs while ensuring system reliability.',
      'We share the community\'s clean energy goals, but the transition must be managed responsibly.',
    ],
  },

  dwsd_glwa: {
    id: 'dwsd_glwa',
    name: 'DWSD / Great Lakes Water Authority',
    entity: 'Regional water authority',
    arcs: ['water-pfas'],
    tone: 'Bureaucratic competence. Emphasizes compliance with federal standards, ongoing testing, and system-wide upgrades. Deflects from legacy contamination to future investment.',
    keyPhrases: [
      'EPA compliance',
      'parts per trillion',
      'treatment upgrades',
      'system-wide monitoring',
      'federal standards',
      'water quality reports',
    ],
    realWorldReferences: [
      'GLWA annual water quality reports',
      'EPA PFAS Strategic Roadmap (2021)',
      'Michigan PFAS Action Response Team findings',
      'DWSD lead service line replacement program',
    ],
    genuineArgument: 'Detroit\'s water system serves 3.8 million people across 125 communities. PFAS remediation requires coordinated regional investment that individual community filters cannot replicate. Our centralized treatment facilities can deploy advanced filtration at scale.',
    dependents: [
      '3.8 million regional water customers',
      '1,700 GLWA employees',
      '125 member communities',
      'Industrial water users funding system upgrades',
    ],
    exampleLanguage: [
      'Our water meets or exceeds all federal and state quality standards.',
      'We are investing $500 million in advanced treatment technology to address emerging contaminants.',
      'Community-level testing is welcome, but certified lab results from our monitoring network provide the most reliable data.',
    ],
  },

  three_m_corp: {
    id: 'three_m_corp',
    name: '3M Corporation',
    entity: 'Chemical manufacturer',
    arcs: ['water-pfas', 'phosphorus-food'],
    tone: 'Polished corporate legal. Acknowledges environmental concerns in abstract while contesting specific liability. Pivots to voluntary phase-outs as evidence of good faith.',
    keyPhrases: [
      'voluntary phase-out',
      'scientific consensus',
      'responsible stewardship',
      'remediation investment',
      'evolving standards',
      'multi-stakeholder approach',
    ],
    realWorldReferences: [
      '3M PFAS settlement ($10.3B, 2023)',
      '3M voluntary PFOA/PFOS phase-out (2000-2002)',
      'SEC 10-K environmental liability disclosures',
      'Congressional testimony on PFAS manufacturing',
    ],
    genuineArgument: 'PFAS chemicals enabled critical advances in firefighting, medical devices, and semiconductor manufacturing. 3M voluntarily phased out PFOS production two decades before regulation required it and has committed over $10 billion to remediation.',
    dependents: [
      '95,000 global employees',
      'Firefighter protective equipment supply chain',
      'Medical device manufacturers',
      'Semiconductor fabrication facilities',
    ],
    exampleLanguage: [
      'We acted ahead of regulation by voluntarily phasing out PFOS production in 2002.',
      'Our $10.3 billion settlement reflects our commitment to being part of the solution.',
      'The science on PFAS health effects continues to evolve, and we support evidence-based policymaking.',
    ],
  },

  real_estate_developers: {
    id: 'real_estate_developers',
    name: 'Detroit Development Coalition',
    entity: 'Real estate investment consortium',
    arcs: ['housing-speculation'],
    tone: 'Aspirational urban boosterism. Frames investment as revival, displacement as natural market correction. Uses "blight" as justification for demolition and redevelopment.',
    keyPhrases: [
      'urban revival',
      'blight removal',
      'market-rate housing',
      'mixed-use development',
      'economic catalyst',
      'property values',
    ],
    realWorldReferences: [
      'Detroit Land Bank Authority auction data',
      'Bedrock Detroit development portfolio',
      'Gilbert/Quicken Loans downtown investment ($5.6B)',
      'Wayne County tax foreclosure auction records',
    ],
    genuineArgument: 'Detroit lost 60% of its population and has 80,000+ vacant structures. Private investment in housing brings tax revenue, eliminates dangerous blight, and creates construction jobs. Without market-rate development, the city cannot fund services for existing residents.',
    dependents: [
      'Construction trade unions (15,000+ workers)',
      'Property tax revenue for city services',
      'Small businesses in revitalized corridors',
      'New residents stabilizing neighborhoods',
    ],
    exampleLanguage: [
      'Every dollar of private investment generates $3 in local economic activity.',
      'These vacant lots are fire hazards and dumping grounds — redevelopment is a public safety issue.',
      'We\'re committed to including affordable units in every major development.',
    ],
  },

  michigan_farm_bureau: {
    id: 'michigan_farm_bureau',
    name: 'Michigan Farm Bureau',
    entity: 'Agricultural industry lobby',
    arcs: ['phosphorus-food'],
    tone: 'Folksy pragmatism. Positions industrial agriculture as feeding America, frames regulation as threatening family farms. Uses food security language to defend fertilizer practices.',
    keyPhrases: [
      'food security',
      'family farms',
      'best management practices',
      'voluntary conservation',
      'feed the world',
      'affordable food',
    ],
    realWorldReferences: [
      'Michigan Farm Bureau policy positions on nutrient management',
      'USDA Census of Agriculture (Michigan)',
      'Michigan Agriculture Environmental Assurance Program',
      'Great Lakes phosphorus loading data (IJC reports)',
    ],
    genuineArgument: 'Michigan agriculture is a $104.7 billion industry supporting 805,000 jobs. Farmers are already adopting precision nutrient management voluntarily. Mandatory restrictions would raise food costs and push production to states with weaker environmental standards.',
    dependents: [
      '805,000 agricultural workers',
      '47,600 Michigan farms',
      'Rural community economies',
      'Food processing industry ($25B revenue)',
    ],
    exampleLanguage: [
      'Michigan farmers are the original conservationists — they depend on healthy soil and clean water too.',
      'Voluntary programs have reduced phosphorus runoff 30% since 2010 without a single mandate.',
      'Punishing family farms with regulations won\'t stop nutrient pollution — it\'ll just move production overseas.',
    ],
  },

  state_legislature: {
    id: 'state_legislature',
    name: 'Michigan State Legislature',
    entity: 'State government (infrastructure committee)',
    arcs: ['infrastructure-debt'],
    tone: 'Fiscal conservatism wrapped in bipartisan concern. Emphasizes budget constraints, state-level authority, and incremental progress. Frames local infrastructure demands as competing with statewide needs.',
    keyPhrases: [
      'fiscal responsibility',
      'statewide priorities',
      'revenue sharing',
      'infrastructure bond',
      'bipartisan solution',
      'taxpayer burden',
    ],
    realWorldReferences: [
      'Michigan Infrastructure Report Card (ASCE)',
      'Michigan revenue sharing formula (Act 51)',
      'Rebuild Michigan bonding program',
      'State Transportation Commission priority lists',
    ],
    genuineArgument: 'Michigan has a $4 billion annual infrastructure deficit across all 83 counties. Detroit receives more per-capita infrastructure spending than any other Michigan city. Accelerating Detroit\'s timeline means delaying critical repairs in communities with even fewer resources.',
    dependents: [
      '10 million Michigan residents',
      '83 county road commissions',
      '533 municipalities competing for infrastructure funds',
      'State employee pension obligations',
    ],
    exampleLanguage: [
      'We\'re committed to rebuilding Michigan\'s infrastructure, but we must do so in a fiscally responsible manner.',
      'Detroit already receives the largest share of state infrastructure dollars — we have to balance needs across all 83 counties.',
      'The bipartisan infrastructure bond will generate $3.5 billion for roads and bridges statewide.',
    ],
  },
};

export function getProfilesForArc(arcId: string): VoiceProfile[] {
  return Object.values(VOICE_PROFILES).filter(p => p.arcs.includes(arcId));
}

export function getProfileById(id: string): VoiceProfile | undefined {
  return VOICE_PROFILES[id];
}
