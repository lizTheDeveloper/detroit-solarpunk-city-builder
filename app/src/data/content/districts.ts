import type { District } from '../../state/types';

export interface District {
  number: number;
  name: string;
  region: string;
  councilMemberId: string;
  tileIds: string[];
}

export const DISTRICTS: District[] = [
  {
    number: 1,
    name: 'District 1',
    region: 'Northwest',
    councilMemberId: 'james_tate',
    tileIds: ['brightmoor', 'warrendale', 'grandmont_rosedale', 'rouge_park'],
  },
  {
    number: 2,
    name: 'District 2',
    region: 'North-Central',
    councilMemberId: 'angela_whitfield_calloway',
    tileIds: ['palmer_park', 'highland_park'],
  },
  {
    number: 3,
    name: 'District 3',
    region: 'Northeast',
    councilMemberId: 'scott_benson',
    tileIds: ['banglatown', 'hamtramck'],
  },
  {
    number: 4,
    name: 'District 4',
    region: 'Far East',
    councilMemberId: 'latisha_johnson',
    tileIds: ['indian_village', 'west_village'],
  },
  {
    number: 5,
    name: 'District 5',
    region: 'Central',
    councilMemberId: 'renata_miller',
    tileIds: ['midtown', 'eastern_market', 'north_end'],
  },
  {
    number: 6,
    name: 'District 6',
    region: 'Southwest',
    councilMemberId: 'gabriela_santiago_romero',
    tileIds: ['southwest_detroit', 'corktown', 'mexicantown', 'delray'],
  },
  {
    number: 7,
    name: 'District 7',
    region: 'West-Central',
    councilMemberId: 'denzel_anton_mccampbell',
    tileIds: ['livernois_mcnichols', 'fitzgerald'],
  },
];
