import type { ArcTemplate } from './types';

export const infrastructureDebtArc: ArcTemplate = {
  id: 'infrastructure-debt',
  name: 'Infrastructure Debt Reckoning',
  description: 'Decades of deferred maintenance coming due. Bridges, sewers, roads — everything breaks at once. State funding is a trap.',

  config: {
    arcId: 'infrastructure-debt',
    escalationThreshold: 4,
    maxTurnsAtEscalation: 8,
    minStageDuration: {
      dormant: 0,
      foreshadow: 4,
      escalation: 5,
      crisis: 1,
      reckoning: 4,
      resolved: 0,
    },
    preventionConditions: ['green_infrastructure_network', 'community_maintenance_cooperative', 'decentralized_systems'],
    reckoningDelay: 5,
    cooldownAfterResolution: 14,
  },

  antagonists: [
    {
      id: 'state_legislature',
      name: 'Michigan State Legislature',
      voiceProfile: {
        tone: 'Fiscal discipline. Detroit-skeptic. Frames aid as handouts. References bankruptcy era. Always conditions funding on oversight.',
        keyPhrases: [
          'fiscal responsibility',
          'taxpayer accountability',
          'consent agreement',
          'emergency management lessons',
          'matching requirements',
          'oversight and transparency',
          'all Michigan communities',
        ],
        realReferences: [
          'PA 436 (Emergency Manager Law)',
          'Michigan Revenue Sharing history (cut 50% since 2000)',
          'Detroit bankruptcy exit plan (2014)',
          'Michigan Infrastructure Council 2023 report',
        ],
        exampleLanguage: 'The Legislature is committed to infrastructure investment for all Michigan communities. Any funding package must include accountability measures to ensure taxpayer dollars are spent responsibly. We learned hard lessons from the emergency management era.',
        genuineArgument: 'Michigan has 83 counties and 1,800+ local governments all competing for infrastructure dollars. Detroit already received extraordinary intervention (bankruptcy, emergency management). Other cities also have crumbling bridges. State dollars come with strings because the last time they didn\'t, billions were mismanaged. Oversight isn\'t punishment — it\'s due diligence.',
        dependents: 'All Michigan municipalities competing for same funds, state taxpayers, bond rating agencies, federal infrastructure match requirements',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.02,
        lobbyCondition: 'state_oversight_imposed',
        trustDrainPerTurn: -0.3,
      },
    },
  ],

  crisisForks: [
    {
      id: 'sewer_overflow_crisis',
      stage: 'escalation',
      title: 'Combined Sewer Overflow: 4 Billion Gallons into Detroit River',
      description: 'A 3-inch rainfall event overwhelmed the combined sewer system (designed for 2 inches). 4 billion gallons of untreated sewage and stormwater discharged into the Detroit River. EPA notice of violation issued. State offers $200M in infrastructure bonds — with conditions.',
      choices: [
        {
          id: 'accept_state_bonds',
          label: 'Accept State Infrastructure Bonds',
          appeal: '$200M for sewer separation. Federal match doubles it to $400M. Eliminates 80% of combined sewer overflows. 5,000 construction jobs over 10 years.',
          immediate: [
            { meter: 'budget', amount: 0.2, source: 'state_bond_proceeds' },
            { meter: 'politicalWill', amount: -2, source: 'conditions_limit_autonomy' },
          ],
          conditionsCreated: ['state_oversight_imposed', 'conventional_infrastructure_path', 'bond_debt_service'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.15, source: 'debt_service_payments_begin' }],
              activationConditions: ['bond_debt_service'],
              cancelConditions: [],
              foreshadowHint: 'Bond debt service payments are approaching...',
              hintTurnsBeforeTrigger: 2,
            },
            {
              delay: 10,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: -3, source: 'state_oversight_blocks_green_projects' }],
              activationConditions: ['state_oversight_imposed'],
              cancelConditions: ['oversight_sunset_negotiated'],
              foreshadowHint: 'State auditors are questioning spending on "non-essential" green infrastructure...',
              hintTurnsBeforeTrigger: 3,
            },
          ],
          antagonistAlignment: 'state_legislature',
        },
        {
          id: 'green_infrastructure_approach',
          label: 'Green Infrastructure Alternative',
          appeal: 'Rain gardens, bioswales, permeable surfaces PLUS sewer repair. Costs less per gallon managed. Creates parks, not just pipes. Builds climate resilience simultaneously.',
          immediate: [
            { meter: 'budget', amount: -0.15, source: 'green_infrastructure_program' },
            { meter: 'communityTrust', amount: 3, source: 'visible_neighborhood_improvements' },
            { meter: 'ecologicalHealth', amount: 2, source: 'green_infrastructure_eco_boost' },
          ],
          conditionsCreated: ['green_infrastructure_network', 'decentralized_systems'],
          conditionsRemoved: ['conventional_infrastructure_path'],
          delayedConsequences: [
            {
              delay: 8,
              effects: [{ type: 'meterDelta', meter: 'ecologicalHealth', amount: 4, source: 'green_infra_mature_performance' }],
              activationConditions: ['green_infrastructure_network'],
              cancelConditions: [],
              foreshadowHint: 'Rain gardens are reaching maturity and performing above design capacity...',
              hintTurnsBeforeTrigger: 3,
            },
            {
              delay: 4,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: -2, source: 'state_criticizes_unproven_approach' }],
              activationConditions: ['green_infrastructure_network'],
              cancelConditions: ['state_partnership_secured'],
              foreshadowHint: 'State infrastructure board questions Detroit\'s "experimental" approach...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'degrowth_infrastructure',
          label: 'Planned Contraction — Shrink the System',
          appeal: 'Detroit doesn\'t need infrastructure for 1.8M people when 640K live here. Decommission oversized systems. Concentrate services. Dramatically cheaper to maintain what you actually need.',
          immediate: [
            { meter: 'budget', amount: 0.1, source: 'immediate_maintenance_savings' },
            { meter: 'communityTrust', amount: -3, source: 'feels_like_giving_up' },
            { meter: 'politicalWill', amount: -4, source: 'defeatist_narrative' },
          ],
          conditionsCreated: ['planned_contraction', 'decentralized_systems', 'right_sizing_infrastructure'],
          conditionsRemoved: ['conventional_infrastructure_path'],
          delayedConsequences: [
            {
              delay: 12,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: 0.3, source: 'reduced_maintenance_burden_realized' }],
              activationConditions: ['planned_contraction'],
              cancelConditions: [],
              foreshadowHint: 'The smaller system footprint is dramatically cheaper to maintain...',
              hintTurnsBeforeTrigger: 4,
            },
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 3, source: 'concentrated_services_work_better' }],
              activationConditions: ['planned_contraction'],
              cancelConditions: [],
              foreshadowHint: 'Residents in concentrated service areas report faster response times...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          taboo: {
            opinionTopic: 'deGrowth',
            unlockThreshold: 60,
            baseSocialCost: 7,
            justificationPapers: [
              'doi:10.1016/j.ecolecon.2012.08.027',
              'doi:10.1080/01onal.2016.1266027',
            ],
            tabooLabel: 'Requires public acceptance of planned economic contraction (deGrowth > 60)',
          },
        },
      ],
    },
    {
      id: 'bridge_collapse',
      stage: 'crisis',
      title: 'I-94 Service Drive Bridge Collapse',
      description: 'A bridge carrying the I-94 service drive over a local street has partially collapsed. No fatalities but 2 injuries. MDOT rates 47 bridges in Detroit metro as "structurally deficient." Federal emergency declared.',
      choices: [
        {
          id: 'federal_emergency_rebuild',
          label: 'Federal Emergency Rebuild',
          appeal: 'FEMA + FHWA emergency funds. Bridge rebuilt to modern standards. Sets precedent for federal intervention on other deficient bridges.',
          immediate: [
            { meter: 'budget', amount: -0.1, source: 'local_match_requirement' },
            { meter: 'communityTrust', amount: 2, source: 'decisive_response' },
          ],
          conditionsCreated: ['federal_infrastructure_partnership', 'conventional_infrastructure_path'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 8,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.2, source: 'ongoing_maintenance_obligations' }],
              activationConditions: ['conventional_infrastructure_path'],
              cancelConditions: ['community_maintenance_cooperative'],
              foreshadowHint: 'Federal grants cover construction but not long-term maintenance...',
              hintTurnsBeforeTrigger: 3,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'community_maintenance_coop',
          label: 'Form Community Infrastructure Cooperative',
          appeal: 'Resident-owned maintenance cooperative for local roads and bridges. Trained local crews. Faster response than MDOT. Creates 200 permanent jobs.',
          immediate: [
            { meter: 'budget', amount: -0.2, source: 'cooperative_startup_and_training' },
            { meter: 'communityTrust', amount: 3, source: 'local_ownership_of_infrastructure' },
            { meter: 'politicalWill', amount: 2, source: 'innovation_in_governance' },
          ],
          conditionsCreated: ['community_maintenance_cooperative', 'decentralized_systems', 'cooperative_employment'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 2, source: 'faster_pothole_response_times' }],
              activationConditions: ['community_maintenance_cooperative'],
              cancelConditions: [],
              foreshadowHint: 'The maintenance co-op is building capacity and reputation...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
      ],
    },
  ],

  papers: [
    { doi: 'doi:10.1016/j.ecolecon.2012.08.027', title: 'Degrowth: A vocabulary for a new era', relevance: 'Framework for planned economic contraction as a positive strategy' },
    { doi: 'doi:10.3390/su12229327', title: 'Green infrastructure for urban stormwater management', relevance: 'Cost-benefit analysis: green vs grey infrastructure for combined sewer overflow' },
    { doi: 'doi:10.1061/(ASCE)IS.1943-555X.0000582', title: 'Cooperative maintenance models for municipal infrastructure', relevance: 'Evidence for community-owned infrastructure maintenance effectiveness' },
  ],
};
