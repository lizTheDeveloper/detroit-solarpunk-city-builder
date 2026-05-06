import type { ArcTemplate } from './types';

export const phosphorusFoodArc: ArcTemplate = {
  id: 'phosphorus-food',
  name: 'Peak Phosphorus & Food Sovereignty',
  description: 'Global phosphate supply controlled by Morocco. Prices spike. Detroit\'s urban farms face fertilizer crisis — or invent alternatives.',

  config: {
    arcId: 'phosphorus-food',
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
    preventionConditions: ['composting_infrastructure', 'biosolids_processing', 'local_phosphorus_recovery'],
    reckoningDelay: 5,
    cooldownAfterResolution: 16,
  },

  antagonists: [
    {
      id: 'mosaic_corp',
      name: 'Mosaic Company',
      voiceProfile: {
        tone: 'Market confidence. Supply chain expertise. Frames scarcity as "price signals working." Always forward-looking quarterly.',
        keyPhrases: [
          'market dynamics',
          'supply chain resilience',
          'strategic reserves',
          'price discovery',
          'global food security requires scale',
          'responsible mining',
        ],
        realReferences: [
          'Mosaic Company 2024 10-K SEC filing',
          'OCP Group (Morocco) annual reports',
          'USGS Mineral Commodity Summary — Phosphate Rock',
          'International Fertilizer Association market data',
        ],
        exampleLanguage: 'Global phosphate markets are functioning as designed. Price signals drive investment in new capacity and efficiency improvements. Mosaic remains committed to feeding a growing world responsibly.',
        genuineArgument: 'Billions of people depend on phosphate fertilizer for food. There is no organic-only path to feeding 8 billion humans at current dietary patterns. Someone has to mine, process, and distribute this essential mineral. Disrupting that supply chain risks famine.',
        dependents: '12,000 employees, Michigan agricultural sector (55,000 farms), global food supply chains, developing nations dependent on affordable fertilizer',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.02,
        lobbyCondition: 'fertilizer_industry_lobby',
        trustDrainPerTurn: -0.2,
      },
    },
    {
      id: 'michigan_farm_bureau',
      name: 'Michigan Farm Bureau',
      voiceProfile: {
        tone: 'Practical, land-connected, skeptical of urban solutions. Protective of farmer autonomy. Wary of regulation.',
        keyPhrases: [
          'feeding families',
          'farmer-first',
          'proven methods',
          'market access',
          'food safety concerns',
          'unproven alternatives',
        ],
        realReferences: [
          'Michigan Farm Bureau policy positions 2024',
          'MFB testimony to Michigan House Agriculture Committee',
          'USDA National Agricultural Statistics — Michigan',
        ],
        exampleLanguage: 'Michigan farmers feed millions. We need proven, safe fertilizer solutions — not experiments. Any alternative must meet the same food safety standards conventional agriculture already exceeds.',
        genuineArgument: 'Farmers operate on razor-thin margins. A bad harvest is bankruptcy. Switching to unproven nutrient sources risks crop failure. "Humanure" sounds great until someone gets E. coli and the whole organic sector takes a PR hit. They\'re not anti-science — they\'re risk-averse because they have to be.',
        dependents: '55,000 Michigan farms, rural communities, food processing workforce, consumers expecting affordable food',
      },
      inGameManifestations: {
        counterNarrativeProbabilityModifier: 0.025,
        lobbyCondition: 'farm_bureau_opposition',
        trustDrainPerTurn: -0.15,
      },
    },
  ],

  crisisForks: [
    {
      id: 'fertilizer_price_spike',
      stage: 'escalation',
      title: 'Fertilizer Prices Up 300% — Urban Farms Hit Wall',
      description: 'Moroccan export restrictions and shipping disruptions have tripled phosphate fertilizer prices. D-Town Farm, Keep Growing Detroit, and the urban agriculture network report they can\'t afford next season\'s inputs. Community food production faces collapse.',
      choices: [
        {
          id: 'emergency_fertilizer_subsidy',
          label: 'Emergency Fertilizer Subsidy',
          appeal: 'Keeps farms running immediately. No disruption to growing season. Federal USDA matching available for urban agriculture zones.',
          immediate: [
            { meter: 'budget', amount: -0.25, source: 'fertilizer_subsidy_program' },
            { meter: 'foodSovereignty', amount: 2, source: 'farms_keep_growing' },
          ],
          conditionsCreated: ['fertilizer_dependency_maintained', 'federal_ag_partnership'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'budget', amount: -0.3, source: 'subsidy_costs_rising_with_prices' }],
              activationConditions: ['fertilizer_dependency_maintained'],
              cancelConditions: ['local_phosphorus_recovery'],
              foreshadowHint: 'Fertilizer prices continue climbing. The subsidy is becoming unsustainable...',
              hintTurnsBeforeTrigger: 2,
            },
            {
              delay: 12,
              effects: [{ type: 'meterDelta', meter: 'foodSovereignty', amount: -8, source: 'subsidy_ends_cold_turkey' }],
              activationConditions: ['fertilizer_dependency_maintained'],
              cancelConditions: ['composting_infrastructure', 'biosolids_processing'],
              foreshadowHint: 'Budget office warns the fertilizer subsidy cannot continue at current levels...',
              hintTurnsBeforeTrigger: 4,
            },
          ],
          antagonistAlignment: 'mosaic_corp',
        },
        {
          id: 'composting_infrastructure',
          label: 'City-Scale Composting Program',
          appeal: 'Long-term nutrient independence. Diverts waste from landfills (saves money). Creates 40+ jobs. Builds on existing community composting.',
          immediate: [
            { meter: 'budget', amount: -0.15, source: 'composting_facility_startup' },
            { meter: 'foodSovereignty', amount: -1, source: 'transition_gap_one_season' },
            { meter: 'communityTrust', amount: 2, source: 'visible_local_solution' },
          ],
          conditionsCreated: ['composting_infrastructure', 'local_nutrient_cycle'],
          conditionsRemoved: ['fertilizer_dependency_maintained'],
          delayedConsequences: [
            {
              delay: 8,
              effects: [{ type: 'meterDelta', meter: 'foodSovereignty', amount: 5, source: 'compost_production_at_scale' }],
              activationConditions: ['composting_infrastructure'],
              cancelConditions: [],
              foreshadowHint: 'The composting facility is processing its first large batches...',
              hintTurnsBeforeTrigger: 3,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'humanure_program',
          label: 'Human Nutrient Recovery',
          appeal: 'Closes the loop completely. Humans eat phosphorus, excrete 100% of it. Recovery at 95% efficiency proven in Sweden. Free feedstock forever.',
          immediate: [
            { meter: 'budget', amount: -0.2, source: 'nutrient_recovery_facility' },
            { meter: 'communityTrust', amount: -2, source: 'public_disgust_reaction' },
            { meter: 'politicalWill', amount: -3, source: 'political_suicide_optics' },
            { meter: 'foodSovereignty', amount: 1, source: 'pilot_program_starts' },
          ],
          conditionsCreated: ['biosolids_processing', 'local_phosphorus_recovery', 'nutrient_sovereignty'],
          conditionsRemoved: ['fertilizer_dependency_maintained'],
          delayedConsequences: [
            {
              delay: 10,
              effects: [{ type: 'meterDelta', meter: 'foodSovereignty', amount: 8, source: 'full_nutrient_independence' }],
              activationConditions: ['biosolids_processing'],
              cancelConditions: [],
              foreshadowHint: 'The nutrient recovery system is proving its yield numbers...',
              hintTurnsBeforeTrigger: 3,
            },
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: 4, source: 'public_opinion_shifts_as_results_show' }],
              activationConditions: ['biosolids_processing'],
              cancelConditions: [],
              foreshadowHint: 'Attitudes toward nutrient recovery are softening as food prices rise elsewhere...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
          taboo: {
            opinionTopic: 'nutrientRecycling',
            unlockThreshold: 50,
            baseSocialCost: 5,
            justificationPapers: [
              'doi:10.1016/j.gloenvcha.2009.02.007',
              'doi:10.1021/acs.est.0c00399',
              'doi:10.2166/wst.2019.135',
            ],
            tabooLabel: 'Requires public acceptance of human nutrient recovery (nutrientRecycling > 50)',
          },
        },
      ],
    },
    {
      id: 'phosphorus_supply_collapse',
      stage: 'crisis',
      title: 'Morocco Suspends Phosphate Exports',
      description: 'Geopolitical instability has led Morocco (controlling 70% of global reserves) to suspend phosphate rock exports. Global fertilizer markets in freefall. Detroit urban farms have 60 days of stockpiled inputs.',
      choices: [
        {
          id: 'emergency_rationing',
          label: 'Emergency Food Rationing Protocol',
          appeal: 'Preserves current food supply. Fair distribution prevents hoarding. Buys time for alternatives to scale.',
          immediate: [
            { meter: 'foodSovereignty', amount: -3, source: 'rationing_reduces_production' },
            { meter: 'communityTrust', amount: 1, source: 'fair_distribution_perceived' },
            { meter: 'politicalWill', amount: -2, source: 'rationing_is_unpopular' },
          ],
          conditionsCreated: ['food_rationing_active'],
          conditionsRemoved: [],
          delayedConsequences: [
            {
              delay: 4,
              effects: [{ type: 'meterDelta', meter: 'communityTrust', amount: -4, source: 'rationing_fatigue' }],
              activationConditions: ['food_rationing_active'],
              cancelConditions: ['local_phosphorus_recovery', 'composting_infrastructure'],
              foreshadowHint: 'Residents are tired of food restrictions...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
        {
          id: 'crash_program_alternatives',
          label: 'Crash Alternative Nutrient Program',
          appeal: 'All-hands: composting, struvite recovery from wastewater, bone char, wood ash. Imperfect but immediate. Community science meets crisis.',
          immediate: [
            { meter: 'budget', amount: -0.3, source: 'crash_program_funding' },
            { meter: 'foodSovereignty', amount: -2, source: 'transition_disruption' },
            { meter: 'communityTrust', amount: 3, source: 'we_are_solving_this_together' },
            { meter: 'politicalWill', amount: 3, source: 'crisis_breeds_political_will' },
          ],
          conditionsCreated: ['local_phosphorus_recovery', 'composting_infrastructure', 'community_science_network'],
          conditionsRemoved: ['fertilizer_dependency_maintained'],
          delayedConsequences: [
            {
              delay: 6,
              effects: [{ type: 'meterDelta', meter: 'foodSovereignty', amount: 6, source: 'alternative_nutrients_online' }],
              activationConditions: ['local_phosphorus_recovery'],
              cancelConditions: [],
              foreshadowHint: 'Local nutrient sources are beginning to produce usable fertilizer...',
              hintTurnsBeforeTrigger: 2,
            },
          ],
          antagonistAlignment: null,
        },
      ],
    },
  ],

  papers: [
    { doi: 'doi:10.1016/j.gloenvcha.2009.02.007', title: 'The story of phosphorus: Global food security and food for thought', relevance: 'Foundational "peak phosphorus" paper — Cordell et al. 2009' },
    { doi: 'doi:10.1021/acs.est.0c00399', title: 'Source-separated human urine as a nutrient source for agriculture', relevance: 'Documents 95%+ phosphorus recovery efficiency from human waste' },
    { doi: 'doi:10.2166/wst.2019.135', title: 'Nutrient recovery from source-separated urine — Swedish pilot results', relevance: 'Real-world municipal-scale implementation data' },
    { doi: 'doi:10.1016/j.resconrec.2019.104515', title: 'Morocco\'s phosphate monopoly and global food vulnerability', relevance: 'Geopolitical risk analysis of concentrated supply' },
  ],
};
