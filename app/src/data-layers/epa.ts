import type { EpaSite } from './types';

export function parseEpaSites(raw: any[]): EpaSite[] {
  return raw
    .filter(r => r.LATITUDE83 && r.LONGITUDE83 || r.FacLat && r.FacLong)
    .map(r => ({
      id: String(r.REGISTRY_ID || r.FacilityID || ''),
      name: r.PRIMARY_NAME || r.FacName || 'Unknown',
      lat: parseFloat(r.LATITUDE83 || r.FacLat),
      lon: parseFloat(r.LONGITUDE83 || r.FacLong),
      type: inferSiteType(r),
      status: r.SITE_TYPE_NAME || r.EPASystem || 'unknown',
      contaminants: [],
    }));
}

function inferSiteType(r: any): EpaSite['type'] {
  const siteType = (r.SITE_TYPE_NAME || '').toLowerCase();
  if (siteType.includes('brownfield')) return 'brownfield';
  if (siteType.includes('superfund') || siteType.includes('cerclis')) return 'superfund';
  return 'echo_facility';
}

export async function fetchEpaSites(bbox: { south: number; west: number; north: number; east: number }): Promise<EpaSite[]> {
  const params = new URLSearchParams({
    output: 'JSON',
    p_c1lat: String(bbox.south),
    p_c1lon: String(bbox.west),
    p_c2lat: String(bbox.north),
    p_c2lon: String(bbox.east),
  });
  const url = `https://echo.epa.gov/api/echo_rest_services.get_facilities?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EPA API error: ${res.status}`);
  const data = await res.json();
  const facilities = data?.Results?.Facilities || [];
  return parseEpaSites(facilities);
}
