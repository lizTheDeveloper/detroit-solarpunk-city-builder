import type { PolicyDefinition } from '../../state/types';

/**
 * Policy thresholds calibrated to Detroit political reality.
 * Fast-track (crisis): 1-2 turns. Targeted ordinance: 6-10 turns. Structural: 10+ turns.
 * Real examples: Urban Ag zoning passed easily (low opposition). CBO took 3.5 years
 * and the stronger version still failed. Water shutoff moratorium took 8 years but
 * crisis accelerated it. Right to Counsel passed unanimously after 3 years.
 * Source: Detroit People's Platform decade of organizing, Right to Counsel Coalition.
 *
 * Threshold = fraction of Political Will needed. Detroit council needs 5/9 majority.
 * Low opposition + council champion = 25-30% Will. Contested = 40-50%. Structural = 55%+.
 */
export const POLICY_CATALOG: Record<string, PolicyDefinition> = {
  urban_agriculture_zoning: {
    id: 'urban_agriculture_zoning',
    name: 'Urban Agriculture Zoning',
    baseThreshold: 0.20,
    enactmentCost: 0.05,
    ongoingDrain: 0.002,
    requiresCouncilVote: false,
    effects: {
      trustBonus: 2,
      ecoBonus: 2,
      foodSovBonus: 3,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['Enables food projects on commercial/industrial tiles — Source: Detroit urban agriculture ordinance (2013)'],
    },
  },

  green_infrastructure_grants: {
    id: 'green_infrastructure_grants',
    name: 'Green Infrastructure Grants',
    baseThreshold: 0.30,
    enactmentCost: 0.08,
    ongoingDrain: 0.003,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 0,
      ecoBonus: 3,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: { ecology: -0.25 },
      other: ['All ecology projects -25% cost — Source: DWSD $50M GSI target by 2029'],
    },
  },

  cooperative_tax_incentives: {
    id: 'cooperative_tax_incentives',
    name: 'Cooperative Tax Incentives',
    baseThreshold: 0.35,
    enactmentCost: 0.08,
    ongoingDrain: 0.003,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 2,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0.20,
      projectCostModifier: {},
      other: ['+$0.20M/year budget — Source: Detroit income tax generates 30% of city revenue'],
    },
  },

  participatory_budgeting: {
    id: 'participatory_budgeting',
    name: 'Participatory Budgeting',
    baseThreshold: 0.40,
    enactmentCost: 0.10,
    ongoingDrain: 0.004,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 5,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['+1 concurrent project, +5% Trust — Source: Chicago participatory budgeting model adapted for Detroit districts'],
    },
  },

  community_land_trust: {
    id: 'community_land_trust',
    name: 'Community Land Trust Ordinance',
    baseThreshold: 0.30,
    enactmentCost: 0.06,
    ongoingDrain: 0.002,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 3,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['Blocks gentrification on CLT tiles — Source: Cass Corridor NDC, Detroit Cultivator CLT, 6+ active CLTs in Detroit'],
    },
  },

  water_commons: {
    id: 'water_commons',
    name: 'Water Commons',
    baseThreshold: 0.45,
    enactmentCost: 0.12,
    ongoingDrain: 0.004,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 4,
      ecoBonus: 3,
      foodSovBonus: 5,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['+5% Food Sov, +4% Trust, +3% Eco — Source: We the People of Detroit water justice campaign, GLWA serves 3M people'],
    },
  },

  community_benefits: {
    id: 'community_benefits',
    name: 'Community Benefits Ordinance',
    baseThreshold: 0.50,
    enactmentCost: 0.12,
    ongoingDrain: 0.004,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 4,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0.10,
      projectCostModifier: {},
      other: ['Developers must negotiate with neighborhoods; reduces gentrification — Source: 2016 Prop B, passed 53-47%'],
    },
  },

  right_to_counsel: {
    id: 'right_to_counsel',
    name: 'Right to Counsel',
    baseThreshold: 0.35,
    enactmentCost: 0.10,
    ongoingDrain: 0.005,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 5,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['Tenants get legal rep in eviction; blocks displacement — Source: Detroit Right to Counsel Coalition, passed 9-0 in 2022'],
    },
  },
};
