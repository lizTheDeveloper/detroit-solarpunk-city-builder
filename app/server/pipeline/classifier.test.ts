import { describe, it, expect } from 'vitest';
import { classifyByKeywords } from './classifier';

describe('classifyByKeywords', () => {
  it('matches energy arc keywords', () => {
    const result = classifyByKeywords('DTE reports widespread power outage in Brightmoor');
    expect(result.arcs).toContain('energy-grid');
    expect(result.severity).toBeGreaterThan(0);
  });

  it('matches water arc keywords', () => {
    const result = classifyByKeywords('PFAS contamination found in Detroit water supply');
    expect(result.arcs).toContain('water-pfas');
  });

  it('detects neighborhood mentions', () => {
    const result = classifyByKeywords('New solar project launches in Corktown');
    expect(result.neighborhoodTag).toBe('corktown');
  });

  it('returns empty for unrelated headlines', () => {
    const result = classifyByKeywords('Celebrity spotted at local restaurant');
    expect(result.arcs).toEqual([]);
    expect(result.severity).toBe(0);
  });

  it('detects locality', () => {
    const result = classifyByKeywords('Michigan governor signs clean energy bill');
    expect(result.locality).toBe('michigan');
  });

  it('detects multiple arcs when keywords overlap', () => {
    const result = classifyByKeywords('Detroit water contamination forces infrastructure shutdown');
    expect(result.arcs).toContain('water-pfas');
    expect(result.arcs).toContain('infrastructure-debt');
    expect(result.confidence).toBeGreaterThan(0.7);
  });

  it('detects high severity for crisis language', () => {
    const result = classifyByKeywords('Emergency declared as grid collapse threatens Detroit');
    expect(result.severity).toBe(3);
  });

  it('normalizes multi-word neighborhood tags with hyphens', () => {
    const result = classifyByKeywords('New development planned for Southwest Detroit');
    expect(result.neighborhoodTag).toBe('southwest-detroit');
  });

  it('detects detroit locality from DTE mention', () => {
    const result = classifyByKeywords('DTE announces rate hike for summer');
    expect(result.locality).toBe('detroit');
  });

  it('returns zero confidence when no arcs match', () => {
    const result = classifyByKeywords('Local sports team wins championship');
    expect(result.confidence).toBe(0);
  });
});
