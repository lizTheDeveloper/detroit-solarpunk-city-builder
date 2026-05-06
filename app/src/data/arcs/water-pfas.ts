import type { ArcTemplate } from './types';

export const waterPfasArc: ArcTemplate = {
  id: 'water-pfas',
  name: 'Forever Chemicals Crisis',
  description: 'PFAS contamination in Detroit water supply. EPA delays, 3M settles, communities wait.',

  config: {
    arcId: 'water-pfas',
    escalationThreshold: 3,
    maxTurnsAtEscalation: 8,
    minStageDuration: {
      dormant: 0,
      foreshadow: 3,
      escalation: 4,
      crisis: 1,
      reckoning: 3,
      resolved: 0,
    },
    preventionConditions: ['community_water_testing', 'independent_filtration_installed', 'pfas_lawsuit_filed'],
    reckoningDelay: 5,
    cooldownAfterResolution: 12,
  },

  antagonists: [
    {
      id: 'dwsd',
      name: 'Detroit Water & Sewerage Dept',
      voiceProfile: {
        tone: 'Bureaucratic reassurance. Compliant but slow. Always references federal standards as the benchmark — if EPA says it\'s fine, it\'s fine.',
        keyPhrases: [
          'meets federal standards',
          'within EPA guidelines',
          'monitoring closely',
          'capital improvement plan',
          'ratepayer affordability',
          'system upgrades underway',
        ],
        realReferences: [
          'DWSD Annual Water Quality Report 2024',
          'EPA PFAS National Primary Drinking Water Regulation (2024)',
          'Great Lakes Water Authority infrastructure assessments',
        ],
        exampleLanguage: 'Detroit\'s water meets or exceeds all federal drinking water standards. Our ongoing capital improvement plan addresses infrastructure needs while maintaining ratepayer affordability.',
        genuineArgument: 'Testing costs money. Filtration costs more money. DWSD serves 700,000+ people on a system built 100 years ago. Every dollar spent on PFAS is a dollar not spent on lead pipe replacement. They\'re not ignoring it — they\'re triaging with limited funds.',
        dependents: '700,000 Detroit water customers, GLWA partner municipalities, DWSD workforce (1,900 employees), ratepayers on fixed incomes who can\'t absorb rate increases',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.02,
        lobbyCondition: 'dwsd_status_quo',
        trustDrainPerTurn: -0.3,
      },
    },
    {
      id: '3m_corporation',
      name: '3M Corporation',
      voiceProfile: {
        tone: 'Legal precision. Never admits fault. Frames settlements as "resolution" not "responsibility." Forward-looking language.',
        keyPhrases: [
          'voluntarily agreed',
          'science-based approach',
          'resolution without admission',
          'committed to environmental stewardship',
          'legacy products',
        ],
        realReferences: [
          '3M PFAS settlement ($10.3B, June 2023)',
          '3M 2024 Annual Report environmental section',
          'Wolverine World Wide Superfund site proceedings',
        ],
        exampleLanguage: '3M has voluntarily committed $10.3 billion toward resolution of PFAS-related claims. We are focused on science-based solutions and continue our commitment to environmental stewardship.',
        genuineArgument: '3M invented products that were legal, FDA-approved, and considered safe at the time. They employed 95,000 people globally. The settlement is massive. At some point, backward liability has to end and forward remediation has to begin.',
        dependents: '95,000 global employees, pension fund investors, municipal water systems that used 3M products for decades, Scotchgard/Teflon supply chains',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.015,
        lobbyCondition: '3m_legal_defense',
        trustDrainPerTurn: -0.2,
      },
    },
  ],

  crisisForks: [
    {
      id: 'pfas_detection_spike',
      stage: 'escalation',
      title: 'PFAS Levels Spike in Community Testing',
      description: 'Independent water testing by community groups finds PFAS levels at 3x the new EPA limit in 4 zip codes. DWSD says their testing shows compliance. The discrepancy is unexplained.',
      choices: [
        {
          id: 'demand_dwsd_retest',
          label: 'Demand Official Retesting',
          appeal: 'Uses existing institutional channels. If DWSD confirms, federal cleanup funds become available. Costs nothing. Legitimate process.',
          immediate: [
            { meter: 'communityTrust', amount: -1, source: 'waiting_on_bureaucracy' },
            { meter: 'politicalWill', amount: 1, source: 'official_channels' },
          ],
          conditionsCreated: ['dwsd_retest_demanded', 'dwsd_status_quo'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -3, source: 'dwsd_retest_inconclusive' }],
              activationConditions: ['dwsd_retest_demanded'],
              cancelConditions: ['independent_filtration_installed'],
              foreshadowHint: 'DWSD retesting is taking longer than promised...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: 'dwsd',
        },
        {
          id: 'community_water_testing_program',
          label: 'Fund Independent Community Testing',
          appeal: 'Data you control. Results in weeks not months. Builds community science capacity. Names the problem publicly.',
          immediate: [
            { meter: 'budget', amount: -0.12, source: 'testing_equipment_and_lab_fees' },
            { meter: 'communityTrust', amount: 3, source: 'community_takes_control' },
          ],
          conditionsCreated: ['community_water_testing', 'public_pfas_data'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 3,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: 3, source: 'data_drives_action' }],
              activationConditions: ['public_pfas_data'],
              cancelConditions: [],
              foreshadowHint: 'Community water data is getting media attention...',
              hintTurnsBeforeTrigger: 1,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'sue_3m_directly',
          label: 'Join Class Action Against 3M',
          appeal: 'Potential $50M+ in remediation funds for your district. Names the actual polluter. Sets precedent.',
          immediate: [
            { meter: 'budget', amount: -0.2, source: 'legal_costs_upfront' },
            { meter: 'politicalWill', amount: -1, source: 'corporate_opposition_mobilizes' },
            { meter: 'communityTrust', amount: 2, source: 'fighting_for_justice' },
          ],
          conditionsCreated: ['pfas_lawsuit_filed', '3m_legal_defense'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 12,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: 0.8, source: 'settlement_funds_arrive' }],
              activationConditions: ['pfas_lawsuit_filed'],
              cancelConditions: [],
              foreshadowHint: 'The PFAS case is moving through discovery...',
              hintTurnsBeforeTrigger: 4,
            },
            {
              delay: 5,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: -2, source: '3m_lobbies_state_legislature' }],
              activationConditions: ['3m_legal_defense'],
              cancelConditions: ['legal_defense_coalition'],
              foreshadowHint: 'Industry groups are lobbying Lansing on tort reform...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
      ],
    },
    {
      id: 'water_crisis_boil_order',
      stage: 'crisis',
      title: 'Boil Water Advisory — 6 Zip Codes',
      description: 'PFAS contamination confirmed above action levels. DWSD issues boil water advisory for 6 zip codes. 180,000 residents affected. Bottled water distribution overwhelmed within hours.',
      choices: [
        {
          id: 'emergency_filtration',
          label: 'Emergency Filtration Deployment',
          appeal: 'Activated carbon filters at every affected distribution point. Clean water in 72 hours. Expensive but immediate.',
          immediate: [
            { meter: 'budget', amount: -0.5, source: 'emergency_filtration_systems' },
            { meter: 'communityTrust', amount: 2, source: 'decisive_action' },
          ],
          conditionsCreated: ['independent_filtration_installed', 'emergency_infrastructure'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 2,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 3, source: 'clean_water_restored' }],
              activationConditions: ['independent_filtration_installed'],
              cancelConditions: [],
              foreshadowHint: 'Filtration systems are being tested...',
              hintTurnsBeforeTrigger: 1,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'mutual_aid_water',
          label: 'Community Water Distribution Network',
          appeal: 'Neighbor-to-neighbor distribution. Water from unaffected zip codes shared freely. Builds solidarity. Costs almost nothing.',
          immediate: [
            { meter: 'budget', amount: -0.05, source: 'distribution_logistics' },
            { meter: 'communityTrust', amount: 5, source: 'community_saves_itself' },
            { meter: 'politicalWill', amount: 2, source: 'self_reliance_demonstrated' },
          ],
          conditionsCreated: ['mutual_aid_water_network', 'community_resilience_demonstrated'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 4,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -2, source: 'distribution_fatigue' }],
              activationConditions: [],
              cancelConditions: ['independent_filtration_installed'],
              foreshadowHint: 'Volunteer water runners are burning out...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
      ],
    },
  ],

  papers: [
    { doi: 'doi:10.1021/acs.est.3c04869', title: 'PFAS Bioaccumulation in Great Lakes Fish Tissue', relevance: 'Documents actual contamination levels in Detroit-area waterways' },
    { doi: 'doi:10.1016/j.watres.2020.116425', title: 'Activated carbon for PFAS removal: A review', relevance: 'Technical basis for community-scale filtration feasibility' },
    { doi: 'doi:10.1289/EHP10092', title: 'PFAS Exposure and Health Outcomes in Communities Near Contamination Sites', relevance: 'Health impact data for affected Detroit zip codes' },
  ],
};
