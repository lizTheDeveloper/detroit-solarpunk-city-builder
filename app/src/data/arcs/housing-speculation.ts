import type { ArcTemplate } from './types';

export const housingSpeculationArc: ArcTemplate = {
  id: 'housing-speculation',
  name: 'Speculation & Displacement',
  description: 'Outside capital floods Detroit land market. Residents face displacement. Community land trusts vs market forces.',

  config: {
    arcId: 'housing-speculation',
    escalationThreshold: 3,
    maxTurnsAtEscalation: 6,
    minStageDuration: {
      dormant: 0,
      foreshadow: 3,
      escalation: 3,
      crisis: 1,
      reckoning: 4,
      resolved: 0,
    },
    preventionConditions: ['community_land_trust_active', 'right_to_counsel_enacted', 'land_bank_partnership'],
    reckoningDelay: 4,
    cooldownAfterResolution: 10,
  },

  antagonists: [
    {
      id: 'speculative_developers',
      name: 'National Development Capital',
      voiceProfile: {
        tone: 'Optimistic investment language. "Revitalization" not "gentrification." "Bringing value back" not "displacing residents." Always cites property values and tax revenue.',
        keyPhrases: [
          'revitalization',
          'investment',
          'property values',
          'tax base recovery',
          'blight elimination',
          'mixed-use development',
          'market-rate housing',
          'bringing Detroit back',
        ],
        realReferences: [
          'Bedrock Detroit development announcements',
          'Gilbert/Rocket Companies downtown investments',
          'Detroit Land Bank Authority auction data',
          'Wayne County tax foreclosure proceedings',
        ],
        exampleLanguage: 'Our $2.1 billion investment in Detroit demonstrates confidence in the city\'s future. Mixed-use development eliminates blight while creating housing choices at every price point.',
        genuineArgument: 'Detroit has 24,000 vacant structures. Someone has to invest capital to make them habitable again. That capital needs return to justify risk. Developers create construction jobs, raise property values (increasing city tax revenue), and build housing people actually want to live in. Without private investment, blight continues.',
        dependents: 'Construction workers (15,000+ in metro Detroit), building trades unions, property tax base (funds schools/services), new residents attracted by development, neighboring property owners whose values rise',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.035,
        lobbyCondition: 'developer_lobby_active',
        trustDrainPerTurn: -0.4,
      },
    },
  ],

  crisisForks: [
    {
      id: 'bulk_land_purchase',
      stage: 'escalation',
      title: 'National Fund Acquires 800 Parcels in 3 Neighborhoods',
      description: 'A New York-based investment fund has purchased 800 vacant parcels from Wayne County tax foreclosure auction at $3,500 average per lot. Combined with recent Bedrock activity, outside ownership now exceeds resident ownership in parts of Brightmoor and the North End.',
      choices: [
        {
          id: 'welcome_investment',
          label: 'Welcome the Investment',
          appeal: 'Property values up 40% in areas with new development. Tax revenue funds schools. Construction jobs for 3 years. Blight eliminated on 800 lots.',
          immediate: [
            { meter: 'budget', amount: 0.15, source: 'increased_property_tax_revenue' },
            { meter: 'communityTrust', amount: -2, source: 'residents_fear_displacement' },
          ],
          conditionsCreated: ['developer_lobby_active', 'outside_capital_welcomed', 'gentrification_accelerating'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 8,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -5, source: 'displacement_begins' }],
              activationConditions: ['gentrification_accelerating'],
              cancelConditions: ['community_land_trust_active', 'right_to_counsel_enacted'],
              foreshadowHint: 'Long-term residents report receiving unsolicited purchase offers...',
              hintTurnsBeforeTrigger: 3,
            },
            {
              delay: 12,
              effects: [{ type: 'tileDamage', tileSelector: 'highest_gentrify', damage: 15 }],
              activationConditions: ['gentrification_accelerating'],
              cancelConditions: ['community_land_trust_active'],
              foreshadowHint: 'Rent increases are pushing families out of neighborhoods they\'ve lived in for decades...',
              hintTurnsBeforeTrigger: 4,
            },
          ],
          antagonistAlignment: 'speculative_developers',
        },
        {
          id: 'community_land_trust_counter',
          label: 'Activate Community Land Trust',
          appeal: 'Permanently affordable housing. Community ownership. Land can never be speculated on again. Proven model (Detroit CLT already exists).',
          immediate: [
            { meter: 'budget', amount: -0.2, source: 'land_trust_acquisition_fund' },
            { meter: 'communityTrust', amount: 4, source: 'community_ownership_excitement' },
            { meter: 'politicalWill', amount: 1, source: 'housing_justice_movement' },
          ],
          conditionsCreated: ['community_land_trust_active', 'anti_displacement_infrastructure'],
          conditionsRemoved: ['gentrification_accelerating'],
          delayedConsequences: [
            {
              delay: 4,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.1, source: 'land_trust_operating_costs' }],
              activationConditions: ['community_land_trust_active'],
              cancelConditions: [],
              foreshadowHint: 'Land trust needs ongoing operating funds for stewardship...',
              hintTurnsBeforeTrigger: 2,
            },
            {
              delay: 10,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 3, source: 'permanently_affordable_units_occupied' }],
              activationConditions: ['community_land_trust_active'],
              cancelConditions: [],
              foreshadowHint: 'First land trust homes are being occupied by long-term residents...',
              hintTurnsBeforeTrigger: 3,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'eminent_domain_community',
          label: 'Eminent Domain for Community Use',
          appeal: 'Take the land back. Legally seize parcels held speculatively for community housing. Precedent exists (Kelo v. New London, reversed for community benefit).',
          immediate: [
            { meter: 'budget', amount: -0.3, source: 'legal_costs_and_compensation' },
            { meter: 'communityTrust', amount: 3, source: 'radical_action_for_residents' },
            { meter: 'politicalWill', amount: -5, source: 'property_rights_backlash' },
          ],
          conditionsCreated: ['eminent_domain_precedent', 'community_land_trust_active', 'developer_lobby_active'],
          conditionsRemoved: ['outside_capital_welcomed'],
          delayedConsequences: [
            {
              delay: 3,
              effects: [{ type: 'meterDelta', meter: 'politicalWill', amount: -4, source: 'legal_challenges_mounted' }],
              activationConditions: ['developer_lobby_active'],
              cancelConditions: ['legal_defense_coalition'],
              foreshadowHint: 'Property rights groups are filing challenges to eminent domain use...',
              hintTurnsBeforeTrigger: 1,
            },
            {
              delay: 14,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 6, source: 'community_land_secured_permanently' }],
              activationConditions: ['eminent_domain_precedent'],
              cancelConditions: [],
              foreshadowHint: 'The legal precedent is holding. Community land ownership is becoming normalized...',
              hintTurnsBeforeTrigger: 4,
            },
          ],
          taboo: {
            opinionTopic: 'landExpropriation',
            unlockThreshold: 45,
            baseSocialCost: 4,
            justificationPapers: [
              'doi:10.1080/07352166.2019.1569465',
              'doi:10.1177/0042098020951001',
            ],
            tabooLabel: 'Requires public acceptance of eminent domain for community use (landExpropriation > 45)',
          },
        },
      ],
    },
    {
      id: 'mass_eviction_crisis',
      stage: 'crisis',
      title: '200 Eviction Filings in One Week',
      description: 'New property owners issue non-renewal notices to month-to-month tenants across 3 neighborhoods simultaneously. 200 families face displacement in 30 days. Legal aid is overwhelmed.',
      choices: [
        {
          id: 'emergency_right_to_counsel',
          label: 'Emergency Right to Counsel',
          appeal: 'City-funded lawyers for every tenant facing eviction. 90% of represented tenants keep their housing (vs 10% unrepresented). Proven in NYC, San Francisco.',
          immediate: [
            { meter: 'budget', amount: -0.25, source: 'emergency_legal_fund' },
            { meter: 'communityTrust', amount: 4, source: 'city_fights_for_residents' },
          ],
          conditionsCreated: ['right_to_counsel_enacted', 'tenant_protection_infrastructure'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 2,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 2, source: 'evictions_blocked_in_court' }],
              activationConditions: ['right_to_counsel_enacted'],
              cancelConditions: [],
              foreshadowHint: 'Tenant lawyers are winning cases...',
              hintTurnsBeforeTrigger: 1,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'negotiate_with_developers',
          label: 'Negotiate Relocation Package',
          appeal: 'Developers pay relocation costs. Residents get 6 months + moving expenses + first/last at new unit. Pragmatic compromise.',
          immediate: [
            { meter: 'communityTrust', amount: -1, source: 'accepting_displacement' },
            { meter: 'politicalWill', amount: 2, source: 'pragmatic_deal_making' },
          ],
          conditionsCreated: ['developer_partnership', 'managed_displacement'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -4, source: 'relocated_residents_scattered' }],
              activationConditions: ['managed_displacement'],
              cancelConditions: [],
              foreshadowHint: 'Relocated families report difficulty maintaining community ties...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: 'speculative_developers',
        },
      ],
    },
  ],

  papers: [
    { doi: 'doi:10.1080/07352166.2019.1569465', title: 'Community Land Trusts and Urban Governance', relevance: 'Framework for CLTs as anti-displacement infrastructure in post-industrial cities' },
    { doi: 'doi:10.1177/0042098020951001', title: 'Speculative urbanism and the remaking of Detroit', relevance: 'Documents speculation patterns in Detroit specifically' },
    { doi: 'doi:10.1080/10511482.2020.1798487', title: 'Right to Counsel in eviction proceedings: Impact analysis', relevance: 'Evidence base for tenant representation effectiveness (90% retention rate)' },
  ],
};
