import { useState, useEffect, useRef, useCallback } from 'react';

export interface Headline {
  id: string;
  headline: string;
  url: string;
  source: string; // "theblue_report" | "memeorandum"
  date: string;
  severity: 0 | 1 | 2 | 3;
  locality: 'detroit' | 'michigan' | 'national' | 'global' | null;
  arcs: string[];
}

interface UseHeadlinesResult {
  headlines: Headline[];
  loading: boolean;
  error: string | null;
}

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useHeadlines(limit = 10): UseHeadlinesResult {
  const [headlines, setHeadlines] = useState<Headline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHeadlines = useCallback(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/headlines?limit=${limit}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: Headline[] = await res.json();
      setHeadlines(data);
      setError(null);
    } catch (err) {
      // Keep stale data if we already have some
      if (headlines.length === 0) {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchHeadlines();

    intervalRef.current = setInterval(fetchHeadlines, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchHeadlines]);

  return { headlines, loading, error };
}
