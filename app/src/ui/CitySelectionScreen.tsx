import { listCities } from '@/city/registry';

interface CitySelectionScreenProps {
  onSelectCity: (citySlug: string) => void;
}

export default function CitySelectionScreen({ onSelectCity }: CitySelectionScreenProps) {
  const cities = listCities();

  return (
    <div className="city-selection-screen">
      <div className="city-selection-header">
        <h1>Solarpunk City Builder</h1>
        <p className="city-selection-subtitle">Select a city to transform</p>
      </div>

      <div className="city-selection-grid">
        {cities.map((citySlug) => {
          const cityNames: Record<string, { name: string; state: string; description: string }> = {
            detroit: {
              name: 'Detroit',
              state: 'Michigan',
              description: 'Transform the Motor City from post-industrial decline to solarpunk utopia. Navigate neighborhood politics, environmental justice, and community-led development.',
            },
            // Future cities can be added here
          };

          const cityInfo = cityNames[citySlug];

          return (
            <button
              key={citySlug}
              className="city-card"
              onClick={() => onSelectCity(citySlug)}
              data-testid={`city-card-${citySlug}`}
            >
              <h2>{cityInfo.name}</h2>
              <p className="city-state">{cityInfo.state}</p>
              <p className="city-description">{cityInfo.description}</p>
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
