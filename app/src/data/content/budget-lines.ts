export interface BudgetLine {
  id: string;
  name: string;
  category: 'public-safety' | 'infrastructure' | 'services' | 'administration' | 'development' | 'revenue';
  annualAmount: number;
  adjustable: boolean;
  minPercent: number;
  description: string;
}

export const EXPENSE_LINES: BudgetLine[] = [
  {
    id: 'police',
    name: 'Police Department',
    category: 'public-safety',
    annualAmount: 442,
    adjustable: true,
    minPercent: 60,
    description: 'DPD operations, patrol, investigations, 911 dispatch',
  },
  {
    id: 'fire',
    name: 'Fire Department',
    category: 'public-safety',
    annualAmount: 167,
    adjustable: true,
    minPercent: 70,
    description: 'Fire suppression, EMS, hazmat response',
  },
  {
    id: 'transit',
    name: 'DDOT Transit',
    category: 'infrastructure',
    annualAmount: 209,
    adjustable: true,
    minPercent: 50,
    description: 'Bus operations, routes, maintenance, driver wages',
  },
  {
    id: 'public_works',
    name: 'Public Works & Roads',
    category: 'infrastructure',
    annualAmount: 160,
    adjustable: true,
    minPercent: 40,
    description: 'Road repair, snow removal, streetlights, alleys',
  },
  {
    id: 'parks',
    name: 'Parks & Recreation',
    category: 'services',
    annualAmount: 113,
    adjustable: true,
    minPercent: 30,
    description: 'Park maintenance, rec centers, Rouge Park, Belle Isle ops',
  },
  {
    id: 'housing',
    name: 'Housing & Revitalization',
    category: 'development',
    annualAmount: 29,
    adjustable: true,
    minPercent: 20,
    description: 'Home repair, blight removal, community land trusts, housing trust fund',
  },
  {
    id: 'health',
    name: 'Health Department',
    category: 'services',
    annualAmount: 45,
    adjustable: true,
    minPercent: 50,
    description: 'Public health, lead testing, environmental health, clinics',
  },
  {
    id: 'planning',
    name: 'Planning & Development',
    category: 'development',
    annualAmount: 18,
    adjustable: true,
    minPercent: 30,
    description: 'Zoning, permits, master plan, neighborhood planning',
  },
  {
    id: 'neighborhoods',
    name: 'Department of Neighborhoods',
    category: 'services',
    annualAmount: 12,
    adjustable: true,
    minPercent: 30,
    description: 'District managers, constituent services, blight complaints',
  },
  {
    id: 'general_services',
    name: 'General Services & IT',
    category: 'administration',
    annualAmount: 85,
    adjustable: false,
    minPercent: 80,
    description: 'City buildings, fleet, IT systems, procurement',
  },
  {
    id: 'debt_service',
    name: 'Debt Service',
    category: 'administration',
    annualAmount: 120,
    adjustable: false,
    minPercent: 100,
    description: 'Bond payments, post-bankruptcy obligations',
  },
  {
    id: 'other',
    name: 'Other Departments',
    category: 'administration',
    annualAmount: 176,
    adjustable: false,
    minPercent: 80,
    description: 'Legal, HR, finance, elections, city council offices, mayor\'s office',
  },
];

export const REVENUE_LINES: BudgetLine[] = [
  {
    id: 'property_tax',
    name: 'Property Tax',
    category: 'revenue',
    annualAmount: 380,
    adjustable: false,
    minPercent: 0,
    description: 'Millage on assessed property values',
  },
  {
    id: 'income_tax',
    name: 'City Income Tax',
    category: 'revenue',
    annualAmount: 420,
    adjustable: false,
    minPercent: 0,
    description: '2.4% resident / 1.2% non-resident',
  },
  {
    id: 'state_sharing',
    name: 'State Revenue Sharing',
    category: 'revenue',
    annualAmount: 310,
    adjustable: false,
    minPercent: 0,
    description: 'Constitutional + statutory revenue sharing from Lansing',
  },
  {
    id: 'wagering_tax',
    name: 'Wagering & Casino Tax',
    category: 'revenue',
    annualAmount: 180,
    adjustable: false,
    minPercent: 0,
    description: 'Three Detroit casinos (MGM, MotorCity, Greektown)',
  },
  {
    id: 'utility_users',
    name: 'Utility Users Tax',
    category: 'revenue',
    annualAmount: 55,
    adjustable: false,
    minPercent: 0,
    description: '5% tax on utility bills',
  },
  {
    id: 'fees_fines',
    name: 'Fees, Fines & Permits',
    category: 'revenue',
    annualAmount: 125,
    adjustable: false,
    minPercent: 0,
    description: 'Building permits, parking, court fines, licenses',
  },
  {
    id: 'federal_state_grants',
    name: 'Federal & State Grants',
    category: 'revenue',
    annualAmount: 106,
    adjustable: false,
    minPercent: 0,
    description: 'CDBG, ARPA remainder, EPA, DOT grants',
  },
];

export function totalAnnualExpenses(): number {
  return EXPENSE_LINES.reduce((sum, l) => sum + l.annualAmount, 0);
}

export function totalAnnualRevenue(): number {
  return REVENUE_LINES.reduce((sum, l) => sum + l.annualAmount, 0);
}
