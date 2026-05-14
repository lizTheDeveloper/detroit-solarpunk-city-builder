import { useState } from 'react';
import { useHeadlines } from '@/hooks/useHeadlines';
import type { Headline } from '@/hooks/useHeadlines';

function localityClass(locality: Headline['locality']): string {
  switch (locality) {
    case 'detroit': return 'headline-locality--detroit';
    case 'michigan': return 'headline-locality--michigan';
    case 'national': return 'headline-locality--national';
    case 'global': return 'headline-locality--global';
    default: return '';
  }
}

function localityLabel(locality: Headline['locality']): string {
  switch (locality) {
    case 'detroit': return 'DET';
    case 'michigan': return 'MI';
    case 'national': return 'US';
    case 'global': return 'INTL';
    default: return '';
  }
}

function sourceLabel(source: string): string {
  if (source === 'theblue_report') return 'Blue';
  if (source === 'memeorandum') return 'Memo';
  return source.slice(0, 4);
}

function severityBorderClass(severity: number): string {
  if (severity === 1) return 'headline-item--sev1';
  if (severity === 2) return 'headline-item--sev2';
  if (severity >= 3) return 'headline-item--sev3';
  return '';
}

export default function HeadlinesPanel() {
  const { headlines, loading, error } = useHeadlines(10);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="headlines-panel">
      <button
        className="headlines-panel-header"
        onClick={() => setCollapsed(!collapsed)}
        type="button"
      >
        <span className="headlines-panel-title">The Wire</span>
        <span className="headlines-live-dot" />
        <span className="headlines-live-label">live</span>
        <span className="headlines-collapse-icon">{collapsed ? '+' : '–'}</span>
      </button>

      {!collapsed && (
        <div className="headlines-panel-body">
          {loading && headlines.length === 0 && (
            <p className="headlines-status">Tuning in...</p>
          )}

          {error && headlines.length === 0 && (
            <p className="headlines-status">No feed configured</p>
          )}

          {headlines.length > 0 && (
            <ul className="headlines-list">
              {headlines.map((h) => (
                <li
                  key={h.id}
                  className={`headline-item ${severityBorderClass(h.severity)}`}
                >
                  <a
                    className="headline-link"
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={h.headline}
                  >
                    {h.headline}
                  </a>
                  <div className="headline-meta">
                    <span className="headline-source-badge">
                      {sourceLabel(h.source)}
                    </span>
                    {h.locality && (
                      <span className={`headline-locality-badge ${localityClass(h.locality)}`}>
                        {localityLabel(h.locality)}
                      </span>
                    )}
                    {h.arcs.length > 0 && (
                      <span className="headline-arc-dots">
                        {h.arcs.map((arc) => (
                          <span key={arc} className="headline-arc-dot" title={arc} />
                        ))}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error && headlines.length === 0 && (
            <p className="headlines-status">No dispatches yet</p>
          )}
        </div>
      )}
    </div>
  );
}
