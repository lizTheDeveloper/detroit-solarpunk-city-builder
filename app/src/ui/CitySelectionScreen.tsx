import { listCities } from '@/city/registry';
import { getCity } from '@/city/registry';
import type { CityPackage } from '@/city/types';

interface CitySelectionScreenProps {
  onSelectCity: (citySlug: string) => void;
}

export default function CitySelectionScreen({ onSelectCity }: CitySelectionScreenProps) {
  const cities = listCities();

  const getCityDescription = (citySlug: string, city: CityPackage): string => {
    const descriptions: Record<string, string> = {
      detroit: "Transform the Motor City from post-industrial decline to solarpunk utopia. Navigate neighborhood politics, environmental justice, and community-led development.",
      minneapolis: "Shape the future of Minneapolis through housing justice, transit equity, and police abolition. Engage with Indigenous activists, tenant unions, and environmental justice organizers in a city grappling with rapid change.",
    };
    return descriptions[citySlug] || `Explore ${city.meta.cityName} and build sustainable community initiatives.`;
  };

  return (
    <div className="city-selection-screen">
      <div className="city-selection-header">
        <h1>Solarpunk City Builder</h1>
        <p className="city-selection-subtitle">Select a city to transform</p>
      </div>

      <div className="city-selection-grid">
        {cities.map((citySlug) => {
          const city = getCity(citySlug);
          if (!city) return null;

          return (
            <button
              key={citySlug}
              className="city-card"
              onClick={() => onSelectCity(citySlug)}
              data-testid={`city-card-${citySlug}`}
            >
              <h2>{city.meta.cityName}</h2>
              <p className="city-state">{city.meta.state}</p>
              <div className="city-meta">
                <span className="city-population">
                  Pop: {city.calibration.population?.value?.toLocaleString() || 'Unknown'}
                </span>
                {city.calibration.medianIncome?.value && (
                  <span className="city-income">
                    Income: ${city.calibration.medianIncome.value.toLocaleString()}
                  </span>
                )}
              </div>
              <p className="city-description">{getCityDescription(citySlug, city)}</p>
              <div className="city-features">
                <span className="city-arc-count">{city.crisisArcs.length} crisis arcs</span>
                <span className="city-character-count">{city.characters.length} characters</span>
              </div>
              <div className="city-card-action">Start Campaign →</div>
            </button>
          );
        })}
      </div>

      <div className="city-selection-footer">
        <p className="city-selection-note">
          More cities coming soon. Each city has unique challenges, neighborhoods, and community dynamics.
        </p>
      </div>
    </div>
  );
}
