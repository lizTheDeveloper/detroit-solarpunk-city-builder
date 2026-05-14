import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getDataDir } from './index.ts';

export interface PaperRecord {
  doi: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number | null;
  relevance: string;
  arcs: string[];
  embedding?: number[];
}

export interface PaperSearchResult {
  doi: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number | null;
  relevanceScore: number;
}

interface PaperCorpusFile {
  papers: PaperRecord[];
  updatedAt: string;
}

let corpus: PaperRecord[] | null = null;
let tfidfCache: Map<string, Map<string, number>> | null = null;

export function loadCorpus(dataDir?: string): PaperRecord[] {
  if (corpus) return corpus;

  const dir = dataDir ?? getDataDir();
  const corpusPath = join(dir, 'research-corpus.json');

  if (existsSync(corpusPath)) {
    const data: PaperCorpusFile = JSON.parse(readFileSync(corpusPath, 'utf-8'));
    corpus = data.papers;
  } else {
    corpus = buildCorpusFromArcs();
    saveCorpus(corpus, dir);
  }

  tfidfCache = null;
  return corpus;
}

export function resetCorpus(): void {
  corpus = null;
  tfidfCache = null;
}

function saveCorpus(papers: PaperRecord[], dataDir?: string): void {
  const dir = dataDir ?? getDataDir();
  const corpusPath = join(dir, 'research-corpus.json');
  const data: PaperCorpusFile = {
    papers,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(corpusPath, JSON.stringify(data, null, 2));
}

function buildCorpusFromArcs(): PaperRecord[] {
  const arcModules = [
    { id: 'energy-grid', path: '../../src/data/arcs/energy-grid.ts' },
    { id: 'water-pfas', path: '../../src/data/arcs/water-pfas.ts' },
    { id: 'phosphorus-food', path: '../../src/data/arcs/phosphorus-food.ts' },
    { id: 'housing-speculation', path: '../../src/data/arcs/housing-speculation.ts' },
    { id: 'infrastructure-debt', path: '../../src/data/arcs/infrastructure-debt.ts' },
  ];

  const papersByDoi = new Map<string, PaperRecord>();

  for (const arc of arcModules) {
    try {
      const fullPath = join(import.meta.dirname, arc.path);
      const moduleText = readFileSync(fullPath, 'utf-8');
      const papersMatch = moduleText.match(/papers:\s*\[([\s\S]*?)\],\s*\n\s*slotTax/);
      if (!papersMatch) continue;

      const papersBlock = papersMatch[1];
      const paperRegex = /doi:\s*'([^']+)',\s*title:\s*'([^']+)',\s*relevance:\s*'([^']+)'/g;
      let match;
      while ((match = paperRegex.exec(papersBlock)) !== null) {
        const [, doi, title, relevance] = match;
        const existing = papersByDoi.get(doi);
        if (existing) {
          if (!existing.arcs.includes(arc.id)) {
            existing.arcs.push(arc.id);
          }
        } else {
          papersByDoi.set(doi, {
            doi,
            title,
            authors: [],
            abstract: relevance,
            year: extractYear(doi, title),
            relevance,
            arcs: [arc.id],
          });
        }
      }
    } catch {
      // Arc file not found or parse error — skip
    }
  }

  return Array.from(papersByDoi.values());
}

function extractYear(doi: string, title: string): number | null {
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) return parseInt(yearMatch[0], 10);
  const doiYearMatch = doi.match(/\.(20\d{2})\./);
  if (doiYearMatch) return parseInt(doiYearMatch[1], 10);
  return null;
}

export function searchByArc(arcId: string, dataDir?: string): PaperSearchResult[] {
  const papers = loadCorpus(dataDir);
  return papers
    .filter(p => p.arcs.includes(arcId))
    .map(p => ({
      doi: p.doi,
      title: p.title,
      authors: p.authors,
      abstract: p.abstract,
      year: p.year,
      relevanceScore: 1.0,
    }));
}

export function searchByTopic(topic: string, limit: number = 5, dataDir?: string): PaperSearchResult[] {
  const papers = loadCorpus(dataDir);
  if (papers.length === 0) return [];

  const queryTerms = tokenize(topic);
  if (queryTerms.length === 0) return [];

  const idf = getOrBuildTfidf(papers);
  const queryVector = buildQueryVector(queryTerms, idf);

  const scored = papers.map(paper => {
    const docTerms = tokenize(`${paper.title} ${paper.relevance} ${paper.abstract}`);
    const docVector = buildDocVector(docTerms, idf);
    const score = cosineSimilarity(queryVector, docVector);
    return { paper, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored
    .filter(s => s.score > 0)
    .slice(0, limit)
    .map(s => ({
      doi: s.paper.doi,
      title: s.paper.title,
      authors: s.paper.authors,
      abstract: s.paper.abstract,
      year: s.paper.year,
      relevanceScore: Math.round(s.score * 1000) / 1000,
    }));
}

export function addPaper(paper: PaperRecord, dataDir?: string): void {
  const papers = loadCorpus(dataDir);
  const existing = papers.findIndex(p => p.doi === paper.doi);
  if (existing >= 0) {
    papers[existing] = { ...papers[existing], ...paper, arcs: [...new Set([...papers[existing].arcs, ...paper.arcs])] };
  } else {
    papers.push(paper);
  }
  tfidfCache = null;
  saveCorpus(papers, dataDir);
}

// --- TF-IDF implementation ---

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'as', 'that', 'this', 'it', 'its', 'not', 'no', 'can', 'do', 'does',
  'has', 'have', 'had', 'will', 'would', 'could', 'should', 'may', 'might',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function getOrBuildTfidf(papers: PaperRecord[]): Map<string, number> {
  if (tfidfCache) return tfidfCache.values().next().value!;

  const docCount = papers.length;
  const docFreq = new Map<string, number>();

  for (const paper of papers) {
    const terms = new Set(tokenize(`${paper.title} ${paper.relevance} ${paper.abstract}`));
    for (const term of terms) {
      docFreq.set(term, (docFreq.get(term) || 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, df] of docFreq) {
    idf.set(term, Math.log(docCount / df));
  }

  tfidfCache = new Map([['idf', idf]]);
  return idf;
}

function buildQueryVector(terms: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    const idfVal = idf.get(term) ?? Math.log(100);
    vector.set(term, count * idfVal);
  }
  return vector;
}

function buildDocVector(terms: string[], idf: Map<string, number>): Map<string, number> {
  const tf = new Map<string, number>();
  for (const term of terms) {
    tf.set(term, (tf.get(term) || 0) + 1);
  }
  const vector = new Map<string, number>();
  for (const [term, count] of tf) {
    const idfVal = idf.get(term) ?? 0;
    vector.set(term, count * idfVal);
  }
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const [term, val] of a) {
    dot += val * (b.get(term) || 0);
    magA += val * val;
  }
  for (const [, val] of b) {
    magB += val * val;
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
