import { useState } from 'react';
import { discoverCity, type DiscoveredMovement, type DiscoveredCharacter } from '@/city/discovery';
import { addDiscoveredCity } from '@/systems/city-discovery-storage';

interface DiscoveryDialogProps {
  onCityDiscovered: (slug: string) => void;
  onClose: () => void;
}

export default function DiscoveryDialog({ onCityDiscovered, onClose }: DiscoveryDialogProps) {
  const [cityName, setCityName] = useState('');
  const [state, setState] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    cityName: string;
    state: string;
    movements: DiscoveredMovement[];
    characters: DiscoveredCharacter[];
    slug: string;
  } | null>(null);

  const handleDiscover = async () => {
    if (!cityName.trim() || !state.trim()) {
      setError('Please enter a city name and state');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const discovery = await discoverCity(cityName.trim(), state.trim());
      
      if (!discovery.success) {
        setError(discovery.error || 'Discovery failed');
        setLoading(false);
        return;
      }

      setResult({
        cityName: cityName.trim(),
        state: state.trim(),
        movements: discovery.movements,
        characters: discovery.characters,
        slug: discovery.slug,
      });

      // Store the discovered city
      addDiscoveredCity({
        slug: discovery.slug,
        cityName: cityName.trim(),
        state: state.trim(),
        movements: discovery.movements.map(m => m.name),
        discoveredAt: new Date().toISOString(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    if (result) {
      onCityDiscovered(result.slug);
    }
  };

  return (
    <div className="discovery-dialog-overlay">
      <div className="discovery-dialog">
        <div className="discovery-dialog-header">
          <h2>Discover New City</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="discovery-dialog-content">
          {!result ? (
            <>
              <div className="discovery-form">
                <div className="form-field">
                  <label>City Name</label>
                  <input
                    type="text"
                    value={cityName}
                    onChange={(e) => setCityName(e.target.value)}
                    placeholder="e.g., Portland"
                    disabled={loading}
                  />
                </div>
                <div className="form-field">
                  <label>State</label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g., OR"
                    disabled={loading}
                  />
                </div>
                {error && <div className="error-message">{error}</div>}
                <button
                  className="discover-btn"
                  onClick={handleDiscover}
                  disabled={loading}
                >
                  {loading ? 'Discovering...' : 'Discover City'}
                </button>
              </div>

              <div className="discovery-info">
                <h3>What we'll discover:</h3>
                <ul>
                  <li>City coordinates and basic info</li>
                  <li>Local solarpunk movements and cooperatives</li>
                  <li>Key community organizers and activists</li>
                  <li>Neighborhood boundaries (if available)</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="discovery-result">
              <h3>{result.cityName}, {result.state}</h3>
              
              <div className="result-section">
                <h4>Movements Found ({result.movements.length})</h4>
                {result.movements.length > 0 ? (
                  <ul className="movements-list">
                    {result.movements.map((m, i) => (
                      <li key={i}>
                        <span className="movement-type">[{m.type}]</span> {m.name}
                        {m.cityRelevanceScore > 0 && (
                          <span className="relevance-badge">{m.cityRelevanceScore}% relevant</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No movements discovered</p>
                )}
              </div>

              <div className="result-section">
                <h4>Key Characters ({result.characters.length})</h4>
                {result.characters.length > 0 ? (
                  <ul className="characters-list">
                    {result.characters.map((c, i) => (
                      <li key={i}>
                        <strong>{c.name}</strong>
                        <br />
                        <small>{c.role} @ {c.organization}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="no-data">No characters discovered</p>
                )}
              </div>

              <div className="result-actions">
                <button className="cancel-btn" onClick={onClose}>Cancel</button>
                <button
                  className="register-btn"
                  onClick={handleRegister}
                  disabled={result.movements.length === 0}
                >
                  {result.movements.length === 0 ? 'Not Enough Data' : 'Register City'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
