import type { CouncilMember } from '../../state/types';

export const COUNCIL_MEMBERS: Record<string, CouncilMember> = {
  marlena_calloway: {
    id: 'marlena_calloway',
    name: 'Marlena Calloway',
    district: 'Northwest Detroit',
    districtNumber: 1,
    leaning: 'progressive',
    priorities: ['food_sovereignty', 'vacant_land', 'community_land_trusts'],
    disposition: 60,
    backstory:
      'A former urban farmer and community organizer who spent two decades transforming vacant lots in Brightmoor into productive gardens. Marlena built a coalition of neighbors who proved that food sovereignty and land reclamation could revitalize a community from the ground up. She ran for council to scale what she saw working block by block.',
    tileIds: ['brightmoor', 'warrendale', 'grandmont_rosedale', 'rouge_park'],
  },
  jt_thibodeaux: {
    id: 'jt_thibodeaux',
    name: 'JT Thibodeaux',
    district: 'Central Detroit',
    districtNumber: 5,
    leaning: 'moderate',
    priorities: ['small_business', 'arts_culture', 'neighborhood_safety'],
    disposition: 20,
    backstory:
      'A jazz club owner who has run a beloved Midtown venue for over fifteen years. JT knows every small business owner on Woodward and believes the arts scene is the economic engine that keeps neighborhoods alive. He is pragmatic about growth but fiercely protective of the independent operators who give Detroit its soul.',
    tileIds: ['midtown', 'eastern_market', 'north_end'],
  },
  denise_okonkwo: {
    id: 'denise_okonkwo',
    name: 'Denise Okonkwo',
    district: 'Northeast Detroit',
    districtNumber: 3,
    leaning: 'progressive',
    priorities: ['youth_programs', 'education', 'anti_blight'],
    disposition: 40,
    backstory:
      'A retired school principal who spent thirty years in Detroit Public Schools, Denise watched the system fail her students while the neighborhoods around her schools crumbled. She ran for council on a platform of youth investment and blight removal, believing that children deserve to walk to school past gardens, not abandoned houses.',
    tileIds: ['banglatown', 'hamtramck'],
  },
  victor_marek: {
    id: 'victor_marek',
    name: 'Victor Marek',
    district: 'West-Central Detroit',
    districtNumber: 7,
    leaning: 'moderate',
    priorities: ['immigrant_support', 'manufacturing', 'infrastructure'],
    disposition: 25,
    backstory:
      'A machine shop owner whose family emigrated from Poland two generations ago, Victor understands what it means to build something in a new country. His shop employs workers from a dozen different backgrounds, and he sees the diverse communities of west Detroit as the city\'s greatest untapped strength. He wants infrastructure that works for everyone.',
    tileIds: ['livernois_mcnichols', 'fitzgerald'],
  },
  bobby_slade: {
    id: 'bobby_slade',
    name: 'Bobby Slade',
    district: 'North-Central Detroit',
    districtNumber: 2,
    leaning: 'moderate-conservative',
    priorities: ['historic_preservation', 'property_tax', 'public_safety'],
    disposition: -10,
    backstory:
      'A retired auto industry engineer who spent thirty-five years at GM before taking his pension. Bobby is proud of his Tudor Revival home in Sherwood Forest and sees himself as a guardian of the neighborhood\'s historic character. He is cautious about change, wary of rising property taxes, and believes public safety is the foundation everything else rests on.',
    tileIds: ['palmer_park', 'highland_park'],
  },
  tomoko_reyes: {
    id: 'tomoko_reyes',
    name: 'Tomoko Reyes',
    district: 'Southwest Detroit',
    districtNumber: 6,
    leaning: 'progressive',
    priorities: ['environmental_justice', 'water_rights', 'pollution_cleanup'],
    disposition: 50,
    backstory:
      'An environmental justice attorney who has spent a decade fighting industrial polluters in Southwest Detroit. Tomoko grew up in Delray, blocks from the Marathon refinery, and watched neighbors develop asthma and cancer at alarming rates. She brings legal expertise and moral urgency to every environmental vote on the council.',
    tileIds: ['southwest_detroit', 'corktown', 'mexicantown', 'delray'],
  },
  aaliyah_foster: {
    id: 'aaliyah_foster',
    name: 'Aaliyah Foster',
    district: 'Far East Side',
    districtNumber: 4,
    leaning: 'moderate',
    priorities: ['waterfront_access', 'flood_resilience', 'intergenerational_wealth'],
    disposition: 15,
    backstory:
      'A community-minded real estate developer who grew up in Indian Village and returned after college to invest in her own neighborhood. Aaliyah buys and rehabilitates homes with the explicit goal of keeping them affordable for longtime residents. She understands markets but insists development must build intergenerational wealth, not extract it.',
    tileIds: ['indian_village', 'west_village'],
  },
};
