import { useHeadlines } from '@/hooks/useHeadlines';

export function HeadlinesPanel() {
  const { headlines, loading, error } = useHeadlines();

  if (loading && headlines.length === 0) {
    return (
      <div className="panel headlines-panel">
        <h3 className="panel-title">Headlines</h3>
        <p className="panel-empty">Loading headlines…</p>
      </div>
    );
  }

  if (error && headlines.length === 0) {
    return (
      <div className="panel headlines-panel">
        <h3 className="panel-title">Headlines</h3>
        <p className="panel-empty">Could not load headlines.</p>
      </div>
    );
  }

  if (headlines.length === 0) {
    return (
      <div className="panel headlines-panel">
        <h3 className="panel-title">Headlines</h3>
        <p className="panel-empty">No recent headlines.</p>
      </div>
    );
  }

  return (
    <div className="panel headlines-panel">
      <h3 className="panel-title">Headlines</h3>
      <ul className="headlines-list">
        {headlines.slice(0, 8).map((h) => (
          <li key={h.id} className="headlines-item">
            <a href={h.url} target="_blank" rel="noopener noreferrer" className="headlines-item-title">
              {h.headline}
            </a>
            <span className="headlines-item-source">— {h.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default HeadlinesPanel;
