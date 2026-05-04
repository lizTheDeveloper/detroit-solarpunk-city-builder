import type { CouncilMember } from '../../state/types';

export const COUNCIL_MEMBERS: Record<string, CouncilMember> = {
  marlena_calloway: {
    id: 'marlena_calloway',
    name: 'Marlena Calloway',
    district: 'Bagley/Grandmont/Brightmoor',
    districtNumber: 1,
    leaning: 'progressive',
    priorities: ['food_sovereignty', 'vacant_land', 'community_land_trusts'],
    disposition: 60,
    backstory:
      'A former urban farmer and community organizer who spent two decades transforming vacant lots in Brightmoor into productive gardens. Marlena built a coalition of neighbors who proved that food sovereignty and land reclamation could revitalize a community from the ground up. She ran for council to scale what she saw working block by block.',
    tileIds: ['bagley', 'grandmont', 'brightmoor'],
  },
  jt_thibodeaux: {
    id: 'jt_thibodeaux',
    name: 'JT Thibodeaux',
    district: 'Midtown/New Center/North End',
    districtNumber: 2,
    leaning: 'moderate',
    priorities: ['small_business', 'arts_culture', 'neighborhood_safety'],
    disposition: 20,
    backstory:
      'A jazz club owner who has run a beloved Midtown venue for over fifteen years. JT knows every small business owner on Woodward and believes the arts scene is the economic engine that keeps neighborhoods alive. He is pragmatic about growth but fiercely protective of the independent operators who give Detroit its soul.',
    tileIds: ['midtown', 'new_center', 'north_end'],
  },
  denise_okonkwo: {
    id: 'denise_okonkwo',
    name: 'Denise Okonkwo',
    district: 'East Side/Osborn/Gratiot',
    districtNumber: 3,
    leaning: 'progressive',
    priorities: ['youth_programs', 'education', 'anti_blight'],
    disposition: 40,
    backstory:
      'A retired school principal who spent thirty years in Detroit Public Schools, Denise watched the system fail her students while the neighborhoods around her schools crumbled. She ran for council on a platform of youth investment and blight removal, believing that children deserve to walk to school past gardens, not abandoned houses.',
    tileIds: ['east_side', 'osborn', 'gratiot'],
  },
  victor_marek: {
    id: 'victor_marek',
    name: 'Victor Marek',
    district: 'Hamtramck/Banglatown/Conant Gardens',
    districtNumber: 4,
    leaning: 'moderate',
    priorities: ['immigrant_support', 'manufacturing', 'infrastructure'],
    disposition: 25,
    backstory:
      'A machine shop owner whose family emigrated from Poland two generations ago, Victor understands what it means to build something in a new country. His shop employs workers from a dozen different backgrounds, and he sees the diverse immigrant communities of Hamtramck as Detroit\'s greatest untapped strength. He wants infrastructure that works for everyone.',
    tileIds: ['hamtramck', 'banglatown', 'conant_gardens'],
  },
  pat_lundgren: {
    id: 'pat_lundgren',
    name: 'Pat Lundgren',
    district: 'Downtown/Corktown/Woodbridge',
    districtNumber: 5,
    leaning: 'conservative',
    priorities: ['budget_discipline', 'business_climate', 'property_values'],
    disposition: -30,
    backstory:
      'A former corporate accountant who managed finances for one of the Big Three before retiring. Pat sees the city budget the way she saw a balance sheet: every dollar must justify itself. She is skeptical of community-led projects she considers financially unproven and pushes relentlessly for fiscal restraint and private-sector partnerships.',
    tileIds: ['downtown', 'corktown', 'woodbridge'],
  },
  tomoko_reyes: {
    id: 'tomoko_reyes',
    name: 'Tomoko Reyes',
    district: 'Southwest Detroit/Delray/Springwells',
    districtNumber: 6,
    leaning: 'progressive',
    priorities: ['environmental_justice', 'water_rights', 'pollution_cleanup'],
    disposition: 50,
    backstory:
      'An environmental justice attorney who has spent a decade fighting industrial polluters in Southwest Detroit. Tomoko grew up in Delray, blocks from the Marathon refinery, and watched neighbors develop asthma and cancer at alarming rates. She brings legal expertise and moral urgency to every environmental vote on the council.',
    tileIds: ['southwest_detroit', 'delray', 'springwells'],
  },
  bobby_slade: {
    id: 'bobby_slade',
    name: 'Bobby Slade',
    district: 'Palmer Park/Sherwood Forest/University District',
    districtNumber: 7,
    leaning: 'moderate-conservative',
    priorities: ['historic_preservation', 'property_tax', 'public_safety'],
    disposition: -10,
    backstory:
      'A retired auto industry engineer who spent thirty-five years at GM before taking his pension. Bobby is proud of his Tudor Revival home in Sherwood Forest and sees himself as a guardian of the neighborhood\'s historic character. He is cautious about change, wary of rising property taxes, and believes public safety is the foundation everything else rests on.',
    tileIds: ['palmer_park', 'sherwood_forest', 'university_district'],
  },
  aaliyah_foster: {
    id: 'aaliyah_foster',
    name: 'Aaliyah Foster',
    district: 'Indian Village/West Village/Jefferson-Chalmers',
    districtNumber: 8,
    leaning: 'moderate',
    priorities: ['waterfront_access', 'flood_resilience', 'intergenerational_wealth'],
    disposition: 15,
    backstory:
      'A community-minded real estate developer who grew up in Indian Village and returned after college to invest in her own neighborhood. Aaliyah buys and rehabilitates homes with the explicit goal of keeping them affordable for longtime residents. She understands markets but insists development must build intergenerational wealth, not extract it.',
    tileIds: ['indian_village', 'west_village', 'jefferson_chalmers'],
  },
  frank_bukowski: {
    id: 'frank_bukowski',
    name: 'Frank Bukowski',
    district: 'Grosse Pointe border/Eastpointe/Near East Side',
    districtNumber: 9,
    leaning: 'conservative',
    priorities: ['tax_burden', 'public_safety', 'infrastructure_basics'],
    disposition: -50,
    backstory:
      'A retired DPD officer who served twenty-eight years on the force, mostly in the Ninth Precinct. Frank is deeply skeptical of what he calls "experimental" governance and believes the city should focus on filling potholes, keeping streets safe, and lowering the tax burden before spending money on anything else. His constituents elected him to say no.',
    tileIds: ['grosse_pointe_border', 'eastpointe', 'near_east_side'],
  },
};
