import type { PolicyDefinition } from '../../state/types';

export const POLICY_CATALOG: Record<string, PolicyDefinition> = {
  urban_agriculture_zoning: {
    id: 'urban_agriculture_zoning',
    name: 'Urban Agriculture Zoning',
    baseThreshold: 0.30,
    enactmentCost: 0.08,
    ongoingDrain: 0.003,
    requiresCouncilVote: false,
    effects: {
      trustBonus: 0,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['Enables food projects on commercial/industrial tiles'],
    },
  },

  green_infrastructure_grants: {
    id: 'green_infrastructure_grants',
    name: 'Green Infrastructure Grants',
    baseThreshold: 0.40,
    enactmentCost: 0.10,
    ongoingDrain: 0.004,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 0,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: { ecology: -0.20 },
      other: ['All ecology projects -20% cost'],
    },
  },

  cooperative_tax_incentives: {
    id: 'cooperative_tax_incentives',
    name: 'Cooperative Tax Incentives',
    baseThreshold: 0.50,
    enactmentCost: 0.12,
    ongoingDrain: 0.005,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 0,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0.15,
      projectCostModifier: {},
      other: ['+$0.15M/year budget'],
    },
  },

  participatory_budgeting: {
    id: 'participatory_budgeting',
    name: 'Participatory Budgeting',
    baseThreshold: 0.55,
    enactmentCost: 0.15,
    ongoingDrain: 0.005,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 3,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['+1 concurrent project', '+3% Trust'],
    },
  },

  community_land_trust: {
    id: 'community_land_trust',
    name: 'Community Land Trust Ordinance',
    baseThreshold: 0.45,
    enactmentCost: 0.10,
    ongoingDrain: 0.003,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 0,
      ecoBonus: 0,
      foodSovBonus: 0,
      budgetBonus: 0,
      projectCostModifier: {},
      other: ['Blocks gentrification on CLT tiles'],
    },
  },

  water_commons: {
    id: 'water_commons',
    name: 'Water Commons',
    baseThreshold: 0.60,
    enactmentCost: 0.15,
    ongoingDrain: 0.005,
    requiresCouncilVote: true,
    effects: {
      trustBonus: 3,
      ecoBonus: 0,
      foodSovBonus: 5,
      budgetBonus: 0,
      projectCostModifier: { water: -0.30 },
      other: ['+5% Food Sov', '+3% Trust', 'Water projects -30% cost'],
    },
  },
};
