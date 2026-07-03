import { useState } from 'react';
import { listCities, getCity } from '@/city/registry';
import DiscoveryDialog from './DiscoveryDialog';
import { getDiscoveredCities } from '@/systems/city-discovery-storage';

interface CitySelectionScreenProps {
  onSelectCity: (citySlug: string) => void;
}

export default function CitySelectionScreen({ onSelectCity }: CitySelectionScreenProps) {
  const [showDiscovery, setShowDiscovery] = useState(false);
  
  const registeredCities = listCities();
  const discoveredCities = getDiscoveredCities();
  
  // Merge registered cities with discovered cities
  const allCities = [
    ...registeredCities.map(slug => {
      const city = getCity(slug);
      return {
        slug,
        cityName: city?.meta.cityName || slug,
        state: city?.meta.state || '',
        population: city?.calibration.population?.value,
        medianIncome: city?.calibration.medianIncome?.value,
        crisisArcs: city?.crisisArcs?.length || 0,
        characters: city?.characters?.length || 0,
        status: 'registered' as const,
        description: getDescription(slug),
      };
    }),
    ...discoveredCities
      .filter(dc => !registeredCities.includes(dc.slug))
      .map(dc => ({
        slug: dc.slug,
        cityName: dc.cityName,
        state: dc.state,
        population: undefined,
        medianIncome: undefined,
        crisisArcs: 0,
        characters: 0,
        status: 'discovered' as const,
        description: `${dc.movements.length} movements discovered in ${dc.cityName}`,
        movements: dc.movements.length,
      })),
  ];

  const getDescription = (slug: string): string => {
    const descriptions: Record<string, string> = {
      detroit: "Transform the Motor City from post-industrial decline to solarpunk utopia. Navigate neighborhood politics, environmental justice, and community-led development.",
      minneapolis: "Shape the future of Minneapolis through housing justice, transit equity, and police abolition. Engage with Indigenous activists, tenant unions, and environmental justice organizers.",
    };
    return descriptions[slug] || "Explore and build a sustainable future in your city.";
  };

  const handleCityDiscovered = (_slug: string) => {
    setShowDiscovery(false);
    // Refresh the page or trigger a state update
    window.location.reload();
  };

  return (
    <div className="city-selection-screen">
      <div className="city-selection-header">
        <h1>Solarpunk City Builder</h1>
        <p className="city-selection-subtitle">Select a city to transform</p>
        <div className="city-stats">
          <span>{registeredCities.length} registered</span>
          <span>•</span>
          <span>{discoveredCities.length} discovered</span>
        </div>
      </div>

      <div className="city-selection-grid">
        {allCities.map((city) => (
          <div
            key={city.slug}
            className={`city-card ${city.status}`}
            onClick={() => city.status === 'registered' && onSelectCity(city.slug)}
            data-testid={`city-card-${city.slug}`}
            style={{ cursor: city.status === 'registered' ? 'pointer' : 'default' }}
          >
            <div className="city-status-badge">{city.status}</div>
            
            <h2>{city.cityName}</h2>
            <p className="city-state">{city.state}</p>
            
            <div className="city-meta">
              {city.population && (
                <span className="city-population">
                  Pop: {city.population.toLocaleString()}
                </span>
              )}
              {city.medianIncome && (
                <span className="city-income">
                  ${city.medianIncome.toLocaleString()} median
                </span>
              )}
            </div>

            <p className="city-description">{city.description}</p>

            <div className="city-features">
              {city.crisisArcs > 0 && (
                <span className="city-arc-count">{city.crisisArcs} crisis arcs</span>
              )}
              {city.characters > 0 && (
                <span className="city-character-count">{city.characters} characters</span>
              )}
              {city.status === 'discovered' && 'movements' in city && (
                <span className="city-movement-count">
                  {city.movements} movements
                </span>
              )}
            </div>

            {city.status === 'registered' && (
              <div className="city-card-action">Start Campaign →</div>
            )}
            {city.status === 'discovered' && (
              <div className="city-card-action">Coming Soon</div>
            )}
          </div>
        ))}

        {/* Discover New City Card */}
        <div
          className="city-card discovery-card"
          onClick={() => setShowDiscovery(true)}
          data-testid="city-card-discover"
        >
          <div className="discovery-icon">+</div>
          <h2>Discover New City</h2>
          <p className="city-description">
            Search for real solarpunk movements and community organizers in your city
          </p>
          <div className="city-card-action">Discover City →</div>
        </div>
      </div>

      <div className="city-selection-footer">
        <p className="city-selection-note">
          Each city has unique challenges, neighborhoods, and community dynamics.
        </p>
      </div>

      {showDiscovery && (
        <DiscoveryDialog
          onCityDiscovered={handleCityDiscovered}
          onClose={() => setShowDiscovery(false)}
        />
      )}
    </div>
  );
}
