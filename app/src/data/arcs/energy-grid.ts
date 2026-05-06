import type { ArcTemplate } from './types';

export const energyGridArc: ArcTemplate = {
  id: 'energy-grid',
  name: 'Grid Modernization Crisis',
  description: 'DTE proposes massive grid investment. Ratepayers pay. Communities have alternatives.',

  config: {
    arcId: 'energy-grid',
    escalationThreshold: 3,
    maxTurnsAtEscalation: 6,
    minStageDuration: {
      dormant: 0,
      foreshadow: 3,
      escalation: 4,
      crisis: 1,
      reckoning: 3,
      resolved: 0,
    },
    preventionConditions: ['community_solar_built', 'microgrid_operational', 'energy_cooperative_formed'],
    reckoningDelay: 4,
    cooldownAfterResolution: 12,
  },

  antagonists: [
    {
      id: 'dte_energy',
      name: 'DTE Energy',
      voiceProfile: {
        tone: 'Corporate responsibility, measured concern, future-focused. Never defensive — always framing investment as inevitable modernization.',
        keyPhrases: [
          'grid modernization',
          'reliable service',
          'rate base investment',
          'clean energy transition',
          'customer choice',
          'infrastructure investment',
          'system reliability',
        ],
        realReferences: [
          'DTE Electric 2024 Rate Case (MPSC Case No. U-21534)',
          'DTE Integrated Resource Plan 2024',
          'IBEW Local 17 partnership agreements',
          'DTE CleanVision plan (net-zero by 2050)',
        ],
        exampleLanguage: "DTE's $9 billion grid investment plan will create 2,000 jobs while improving reliability for 2.2 million customers. This is responsible stewardship of critical infrastructure.",
        genuineArgument: 'The grid IS aging. 60% of distribution infrastructure is past design life. Someone has to pay for upgrades or blackouts get worse. DTE employs 11,000 people and union contracts require scale.',
        dependents: 'IBEW Local 17 (2,400 members), 11,000 total employees, 2.2M ratepayers who need reliable power, municipal bond holders, pension funds with DTE stock',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.03,
        lobbyCondition: 'dte_lobby_active',
        trustDrainPerTurn: -0.5,
      },
    },
  ],

  crisisForks: [
    {
      id: 'grid_modernization_proposal',
      stage: 'escalation',
      title: 'DTE Files $4.2B Grid Modernization Plan',
      description: 'DTE has filed with the Michigan Public Service Commission for a 15-year, $4.2 billion grid overhaul. Your city council has 90 days to file a response.',
      choices: [
        {
          id: 'support_dte_plan',
          label: 'Support the Plan',
          appeal: '200 union jobs in your district. Federal matching funds. Grid reliability scores improve within 2 years. IBEW endorsement for next election.',
          immediate: [
            { meter: 'budget', amount: -0.15, source: 'rate_increase_preparation' },
            { meter: 'communityTrust', amount: 2, source: 'union_jobs_announcement' },
          ],
          conditionsCreated: ['accepted_dte_grid_plan', 'union_support', 'dte_lobby_active'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 8,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.3, source: 'rate_hike_hits_residents' }],
              activationConditions: ['accepted_dte_grid_plan'],
              cancelConditions: ['rate_cap_negotiated'],
              foreshadowHint: 'Energy bills are climbing across the district...',
              hintTurnsBeforeTrigger: 3,
            },
            {
              delay: 14,
              effects: [{ type: 'conditionChange', action: 'add', condition: 'grid_dependency_locked' }],
              activationConditions: ['accepted_dte_grid_plan'],
              cancelConditions: ['community_solar_built'],
              foreshadowHint: 'The city is becoming more dependent on centralized infrastructure...',
              hintTurnsBeforeTrigger: 4,
            },
          ],
          antagonistAlignment: 'dte_energy',
        },
        {
          id: 'counter_propose_community_solar',
          label: 'Counter-Propose Community Solar',
          appeal: 'Cheaper per-kWh long term. Local ownership. Energy independence. Soulardarity model proven in Highland Park.',
          immediate: [
            { meter: 'budget', amount: -0.08, source: 'legal_filing_costs' },
            { meter: 'communityTrust', amount: -1, source: 'union_opposition_immediate' },
            { meter: 'politicalWill', amount: 2, source: 'community_energy_momentum' },
          ],
          conditionsCreated: ['community_solar_proposal', 'dte_opposition_active'],
          conditionsRemoved: ['union_support'],
          delayedConsequences: [
            {
              delay: 4,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: -3, source: 'union_campaign_against' }],
              activationConditions: ['dte_opposition_active'],
              cancelConditions: ['union_compromise_reached'],
              foreshadowHint: 'Labor groups are organizing against the solar proposal...',
              hintTurnsBeforeTrigger: 2,
            },
            {
              delay: 10,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 4, source: 'solar_proves_viable' }],
              activationConditions: ['community_solar_proposal'],
              cancelConditions: [],
              foreshadowHint: 'Early solar installations are generating real savings...',
              hintTurnsBeforeTrigger: 3,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'microgrid_resistance',
          label: 'Neighborhood Microgrids',
          appeal: 'Full energy sovereignty. Immune to grid failures. Storage + solar + shared. Proven by Soulardarity.',
          immediate: [
            { meter: 'budget', amount: -0.2, source: 'microgrid_infrastructure_investment' },
            { meter: 'communityTrust', amount: 3, source: 'energy_sovereignty_excitement' },
            { meter: 'politicalWill', amount: -2, source: 'establishment_opposition' },
          ],
          conditionsCreated: ['microgrid_operational', 'dte_opposition_active', 'energy_sovereignty'],
          conditionsRemoved: ['dte_lobby_active'],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.1, source: 'dte_legal_challenge' }],
              activationConditions: ['dte_opposition_active'],
              cancelConditions: ['legal_defense_coalition'],
              foreshadowHint: 'DTE is filing regulatory challenges against distributed generation...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          taboo: {
            opinionTopic: 'nuclearEnergy',
            unlockThreshold: 40,
            baseSocialCost: 3,
            justificationPapers: [
              'doi:10.1016/j.enpol.2018.11.002',
              'doi:10.1038/s41560-019-0457-x',
            ],
            tabooLabel: 'Requires public acceptance of decentralized energy infrastructure',
          },
        },
      ],
    },
    {
      id: 'grid_failure_crisis',
      stage: 'crisis',
      title: 'Multi-Day Grid Failure',
      description: 'An ice storm has collapsed 3,100 utility poles. 400,000 customers without power, some for 2+ weeks. DTE restoration timeline: "as fast as possible." This is the third multi-day outage this year.',
      choices: [
        {
          id: 'emergency_dte_contract',
          label: 'Emergency DTE Restoration Contract',
          appeal: 'Fastest path to restoring power. Union crews deployed immediately. Federal disaster declaration accelerates funding.',
          immediate: [
            { meter: 'budget', amount: -0.4, source: 'emergency_restoration_contract' },
            { meter: 'communityTrust', amount: 1, source: 'power_restored_fastest' },
          ],
          conditionsCreated: ['dte_emergency_dependency', 'accepted_dte_grid_plan'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 3,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.25, source: 'emergency_cost_overruns' }],
              activationConditions: ['dte_emergency_dependency'],
              cancelConditions: [],
              foreshadowHint: 'Restoration invoices are coming in higher than quoted...',
              hintTurnsBeforeTrigger: 1,
            },
          ],
          antagonistAlignment: 'dte_energy',
        },
        {
          id: 'mutual_aid_restoration',
          label: 'Mutual Aid + Partial Restoration',
          appeal: 'Community shelters, shared generators, neighbor-to-neighbor support. Slower grid restoration but nobody dies alone in the cold.',
          immediate: [
            { meter: 'budget', amount: -0.1, source: 'shelter_operations' },
            { meter: 'communityTrust', amount: 4, source: 'mutual_aid_solidarity' },
            { meter: 'politicalWill', amount: 2, source: 'community_self_reliance' },
          ],
          conditionsCreated: ['mutual_aid_network_tested', 'community_resilience_demonstrated'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 2,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -2, source: 'prolonged_outage_frustration' }],
              activationConditions: [],
              cancelConditions: ['microgrid_operational'],
              foreshadowHint: 'Some residents are losing patience with the extended outage...',
              hintTurnsBeforeTrigger: 1,
            },
          ],
          antagonistAlignment: null,
        },
      ],
    },
  ],

  papers: [
    { doi: 'doi:10.1016/j.enpol.2018.11.002', title: 'Community energy storage: A smart choice for the smart grid?', relevance: 'Demonstrates cost-effectiveness of distributed storage vs centralized grid investment' },
    { doi: 'doi:10.1038/s41560-019-0457-x', title: 'Distributive justice in solar energy transition', relevance: 'Framework for equitable energy access in low-income communities' },
    { doi: 'doi:10.1016/j.erss.2021.102290', title: 'Energy sovereignty and the Dakota Access Pipeline', relevance: 'Indigenous and community models for energy self-determination' },
  ],
};
