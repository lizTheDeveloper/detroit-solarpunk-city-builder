/**
 * Maps completed projects to dependency web conditions they create.
 * This connects the base game (project building) to the crisis arc engine
 * (condition-gated choices, prevention conditions, consequence cancellation).
 */
export const PROJECT_CONDITION_MAP: Record<string, string[]> = {
  solar_grid: ['community_solar_built', 'decentralized_systems'],
  land_trust: ['community_land_trust_active', 'anti_displacement_infrastructure'],
  rain_garden: ['green_infrastructure_network'],
  wetland_restoration: ['green_infrastructure_network'],
  food_forest: ['local_nutrient_cycle'],
  community_kitchen: ['mutual_aid_network_tested'],
  maker_space: ['cooperative_employment'],
  greenway: ['green_infrastructure_network'],
  water_transit: ['community_water_testing'],
};

/**
 * Maps enacted policies to dependency web conditions.
 */
export const POLICY_CONDITION_MAP: Record<string, string[]> = {
  community_land_trust: ['community_land_trust_active', 'land_bank_partnership'],
  right_to_counsel: ['right_to_counsel_enacted', 'tenant_protection_infrastructure'],
  water_commons: ['community_water_testing', 'public_pfas_data'],
  cooperative_tax_incentives: ['cooperative_employment'],
  green_infrastructure_grants: ['green_infrastructure_network'],
  urban_agriculture_zoning: ['local_nutrient_cycle'],
};
