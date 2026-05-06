/**
 * Pipeline types for the live news feed ingestion system.
 * These types are designed to be importable by the game client.
 */

export interface RawHeadline {
  id: string;              // hash of URL
  source: string;          // "theblue_report" | "memeorandum"
  date: string;            // ISO timestamp
  headline: string;
  url: string;
  metadata: Record<string, unknown>; // source-specific (engagement, clusters, etc)
  fetchedAt: string;
}

export interface ProcessedHeadline extends RawHeadline {
  classified: boolean;
  arcs: string[];
  severity: 0 | 1 | 2 | 3;
  locality: 'detroit' | 'michigan' | 'national' | 'global' | null;
  confidence: number;
  frames?: { establishment: string | null; community: string | null; market: string | null };
}

export interface ArcState {
  arcId: string;
  stage: 'dormant' | 'foreshadow' | 'escalation' | 'crisis' | 'reckoning' | 'resolved';
  weeklyHits: { severity1: number; severity2: number; severity3: number };
  cumulativeHits: number;
  lastHeadlineTimestamp: string | null;
  stageEnteredAt: string;
  config: ArcConfig;
}

export interface ArcConfig {
  escalationThreshold: number;
  minStageDuration: number; // hours
  keywords: string[];
  locality?: string[];
}

export interface FeedSource {
  id: string;
  type: 'json' | 'rss';
  url: string;
  parser: string;
}

export interface PipelineHealth {
  lastRun: string | null;
  sources: Record<string, {
    lastFetch: string | null;
    lastSuccess: boolean;
    error?: string;
    itemCount: number;
  }>;
  unclassifiedCount: number;
  totalHeadlines: number;
}

export interface PipelineRunResult {
  timestamp: string;
  sourcesAttempted: number;
  sourcesSucceeded: number;
  newHeadlines: number;
  duplicatesSkipped: number;
  errors: Array<{ source: string; error: string }>;
}
