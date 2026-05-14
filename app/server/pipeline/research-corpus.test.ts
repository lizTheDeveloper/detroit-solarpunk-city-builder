import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import {
  loadCorpus,
  resetCorpus,
  searchByArc,
  searchByTopic,
  addPaper,
  type PaperRecord,
} from './research-corpus.ts';

const TEST_DATA_DIR = join(import.meta.dirname, 'data-test-corpus');

const TEST_PAPERS: PaperRecord[] = [
  {
    doi: 'doi:10.1016/j.enpol.2018.11.002',
    title: 'Community energy storage: A smart choice for the smart grid?',
    authors: ['Smith, J.', 'Jones, K.'],
    abstract: 'Demonstrates cost-effectiveness of distributed storage vs centralized grid investment',
    year: 2018,
    relevance: 'Demonstrates cost-effectiveness of distributed storage vs centralized grid investment',
    arcs: ['energy-grid'],
  },
  {
    doi: 'doi:10.1038/s41560-019-0457-x',
    title: 'Distributive justice in solar energy transition',
    authors: [],
    abstract: 'Framework for equitable energy access in low-income communities',
    year: 2019,
    relevance: 'Framework for equitable energy access in low-income communities',
    arcs: ['energy-grid'],
  },
  {
    doi: 'doi:10.1016/j.gloenvcha.2009.02.007',
    title: 'The story of phosphorus: Global food security and food for thought',
    authors: ['Cordell, D.'],
    abstract: 'Foundational peak phosphorus paper — Cordell et al. 2009',
    year: 2009,
    relevance: 'Foundational peak phosphorus paper — Cordell et al. 2009',
    arcs: ['phosphorus-food'],
  },
  {
    doi: 'doi:10.1021/acs.est.3c04869',
    title: 'PFAS Bioaccumulation in Great Lakes Fish Tissue',
    authors: [],
    abstract: 'Documents actual contamination levels in Detroit-area waterways',
    year: null,
    relevance: 'Documents actual contamination levels in Detroit-area waterways',
    arcs: ['water-pfas'],
  },
];

function seedCorpus() {
  writeFileSync(
    join(TEST_DATA_DIR, 'research-corpus.json'),
    JSON.stringify({ papers: TEST_PAPERS, updatedAt: new Date().toISOString() })
  );
}

describe('research corpus', () => {
  beforeEach(() => {
    resetCorpus();
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
    mkdirSync(TEST_DATA_DIR, { recursive: true });
    seedCorpus();
  });

  afterEach(() => {
    resetCorpus();
    if (existsSync(TEST_DATA_DIR)) {
      rmSync(TEST_DATA_DIR, { recursive: true });
    }
  });

  describe('loadCorpus', () => {
    it('loads papers from JSON file', () => {
      const papers = loadCorpus(TEST_DATA_DIR);
      expect(papers).toHaveLength(4);
      expect(papers[0].doi).toBe('doi:10.1016/j.enpol.2018.11.002');
    });

    it('returns cached corpus on subsequent calls', () => {
      const first = loadCorpus(TEST_DATA_DIR);
      const second = loadCorpus(TEST_DATA_DIR);
      expect(first).toBe(second);
    });
  });

  describe('searchByArc', () => {
    it('returns papers for a specific arc', () => {
      const results = searchByArc('energy-grid', TEST_DATA_DIR);
      expect(results).toHaveLength(2);
      expect(results.every(r => r.relevanceScore === 1.0)).toBe(true);
    });

    it('returns empty array for unknown arc', () => {
      const results = searchByArc('nonexistent-arc', TEST_DATA_DIR);
      expect(results).toHaveLength(0);
    });

    it('returns correct paper metadata shape', () => {
      const results = searchByArc('phosphorus-food', TEST_DATA_DIR);
      expect(results).toHaveLength(1);
      const paper = results[0];
      expect(paper).toHaveProperty('doi');
      expect(paper).toHaveProperty('title');
      expect(paper).toHaveProperty('authors');
      expect(paper).toHaveProperty('abstract');
      expect(paper).toHaveProperty('year');
      expect(paper).toHaveProperty('relevanceScore');
    });
  });

  describe('searchByTopic', () => {
    it('returns relevant papers for topic query', () => {
      const results = searchByTopic('energy storage grid', 5, TEST_DATA_DIR);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].title).toContain('energy');
    });

    it('ranks results by relevance score', () => {
      const results = searchByTopic('phosphorus food security', 5, TEST_DATA_DIR);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('respects limit parameter', () => {
      const results = searchByTopic('energy', 1, TEST_DATA_DIR);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('returns empty array for unrelated topic', () => {
      const results = searchByTopic('quantum blockchain cryptocurrency', 5, TEST_DATA_DIR);
      expect(results).toHaveLength(0);
    });

    it('returns empty array for empty query', () => {
      const results = searchByTopic('', 5, TEST_DATA_DIR);
      expect(results).toHaveLength(0);
    });

    it('finds PFAS papers by contamination topic', () => {
      const results = searchByTopic('PFAS contamination water', 5, TEST_DATA_DIR);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].doi).toBe('doi:10.1021/acs.est.3c04869');
    });
  });

  describe('addPaper', () => {
    it('adds a new paper to the corpus', () => {
      const newPaper: PaperRecord = {
        doi: 'doi:10.9999/new-paper',
        title: 'New research on urban farming in Detroit',
        authors: ['Researcher, A.'],
        abstract: 'Analysis of community garden effectiveness',
        year: 2025,
        relevance: 'Direct evidence for urban agriculture policy',
        arcs: ['phosphorus-food'],
      };

      addPaper(newPaper, TEST_DATA_DIR);

      resetCorpus();
      const papers = loadCorpus(TEST_DATA_DIR);
      expect(papers).toHaveLength(5);
      expect(papers.find(p => p.doi === 'doi:10.9999/new-paper')).toBeDefined();
    });

    it('updates existing paper by DOI instead of duplicating', () => {
      const updatedPaper: PaperRecord = {
        doi: 'doi:10.1016/j.enpol.2018.11.002',
        title: 'Updated title',
        authors: ['New Author'],
        abstract: 'Updated abstract',
        year: 2018,
        relevance: 'Updated relevance',
        arcs: ['energy-grid', 'infrastructure-debt'],
      };

      addPaper(updatedPaper, TEST_DATA_DIR);

      resetCorpus();
      const papers = loadCorpus(TEST_DATA_DIR);
      expect(papers).toHaveLength(4);
      const paper = papers.find(p => p.doi === 'doi:10.1016/j.enpol.2018.11.002')!;
      expect(paper.title).toBe('Updated title');
      expect(paper.arcs).toContain('energy-grid');
      expect(paper.arcs).toContain('infrastructure-debt');
    });

    it('persists added papers to disk', () => {
      addPaper({
        doi: 'doi:10.9999/persisted',
        title: 'Persisted paper',
        authors: [],
        abstract: 'Should survive reload',
        year: 2026,
        relevance: 'test',
        arcs: [],
      }, TEST_DATA_DIR);

      resetCorpus();
      const papers = loadCorpus(TEST_DATA_DIR);
      expect(papers.find(p => p.doi === 'doi:10.9999/persisted')).toBeDefined();
    });
  });
});
