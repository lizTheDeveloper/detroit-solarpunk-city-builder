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
    councilMemberId: 'marlena_calloway',
    tileIds: ['brightmoor', 'warrendale', 'grandmont_rosedale', 'rouge_park'],
  },
  {
    number: 2,
    name: 'District 2',
    region: 'North-Central',
    councilMemberId: 'bobby_slade',
    tileIds: ['palmer_park', 'highland_park'],
  },
  {
    number: 3,
    name: 'District 3',
    region: 'Northeast',
    councilMemberId: 'denise_okonkwo',
    tileIds: ['banglatown', 'hamtramck'],
  },
  {
    number: 4,
    name: 'District 4',
    region: 'Far East',
    councilMemberId: 'aaliyah_foster',
    tileIds: ['indian_village', 'west_village'],
  },
  {
    number: 5,
    name: 'District 5',
    region: 'Central',
    councilMemberId: 'jt_thibodeaux',
    tileIds: ['midtown', 'eastern_market', 'north_end'],
  },
  {
    number: 6,
    name: 'District 6',
    region: 'Southwest',
    councilMemberId: 'tomoko_reyes',
    tileIds: ['southwest_detroit', 'corktown', 'mexicantown', 'delray'],
  },
  {
    number: 7,
    name: 'District 7',
    region: 'West-Central',
    councilMemberId: 'victor_marek',
    tileIds: ['livernois_mcnichols', 'fitzgerald'],
  },
];
