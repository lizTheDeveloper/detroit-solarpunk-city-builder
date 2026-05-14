import { useMemo } from 'react';
import { useGame } from '@/state/store';
import { detroitPackage } from '@/city/detroit';
import type { PowerStructureEntry } from '@/city/types';

interface PowerStructurePanelProps {
  neighborhoodId: string;
}

function OfficialCard({ entry, roleLabel }: { entry: PowerStructureEntry; roleLabel: string }) {
  return (
    <div className="power-card">
      <div className="power-card__header">
        <span className="power-card__name">{entry.name}</span>
        <span className="power-card__role">{roleLabel}</span>
      </div>
      {entry.title && <div className="power-card__title">{entry.title}</div>}
      {entry.responsibility && <div className="power-card__resp">{entry.responsibility}</div>}
      {entry.contact && (
        <a className="power-card__contact" href={entry.contact} target="_blank" rel="noopener noreferrer">
          Contact
        </a>
      )}
      {entry.relevantArcs && entry.relevantArcs.length > 0 && (
        <div className="power-card__arcs">
          {entry.relevantArcs.map(arc => (
            <span key={arc} className="power-card__arc-tag">{arc.replace(/-/g, ' ')}</span>
          ))}
        </div>
      )}
      <div className="power-card__note">{entry.pedagogicalNote}</div>
    </div>
  );
}

export default function PowerStructurePanel({ neighborhoodId }: PowerStructurePanelProps) {
  const { state } = useGame();
  const ps = detroitPackage.powerStructure;

  const councilForNeighborhood = useMemo(() =>
    ps.council.filter(c =>
      c.neighborhoods?.some(n =>
        n.replace(/\s+/g, '-').toLowerCase() === neighborhoodId.replace(/_/g, '-').toLowerCase()
      )
    ),
    [neighborhoodId, ps.council],
  );

  const activeArcIds = useMemo(() =>
    state.activeArcs.map(a => a.arcId),
    [state.activeArcs],
  );

  const relevantAgencies = useMemo(() =>
    ps.agencies.filter(a =>
      a.relevantArcs?.some(arc => activeArcIds.includes(arc))
    ),
    [activeArcIds, ps.agencies],
  );

  const allAgencies = ps.agencies.filter(a => !relevantAgencies.includes(a));

  if (councilForNeighborhood.length === 0 && relevantAgencies.length === 0 && allAgencies.length === 0 && ps.utilityCompanies.length === 0) {
    return null;
  }

  return (
    <div className="power-structure-section">
      <h3 className="block-section__title">POWER STRUCTURE</h3>

      {ps.mayor && (
        <div className="power-card power-card--mayor">
          <div className="power-card__header">
            <span className="power-card__name">{ps.mayor.name}</span>
            <span className="power-card__role">Mayor</span>
          </div>
          {ps.mayor.since && <div className="power-card__title">Since {ps.mayor.since}</div>}
          {ps.mayor.contact && (
            <a className="power-card__contact" href={ps.mayor.contact} target="_blank" rel="noopener noreferrer">
              Contact
            </a>
          )}
        </div>
      )}

      {councilForNeighborhood.length > 0 && (
        <>
          <div className="power-structure-label">YOUR COUNCIL DISTRICT</div>
          {councilForNeighborhood.map((c, i) => (
            <OfficialCard key={i} entry={c} roleLabel="Council" />
          ))}
        </>
      )}

      {relevantAgencies.length > 0 && (
        <>
          <div className="power-structure-label">AGENCIES (ACTIVE CRISES)</div>
          {relevantAgencies.map((a, i) => (
            <OfficialCard key={i} entry={a} roleLabel="Agency" />
          ))}
        </>
      )}

      {allAgencies.length > 0 && (
        <>
          <div className="power-structure-label">OTHER AGENCIES</div>
          {allAgencies.map((a, i) => (
            <OfficialCard key={i} entry={a} roleLabel="Agency" />
          ))}
        </>
      )}

      {ps.utilityCompanies.length > 0 && (
        <>
          <div className="power-structure-label">UTILITIES</div>
          {ps.utilityCompanies.map((u, i) => (
            <OfficialCard key={i} entry={u} roleLabel={u.ownership ?? 'Utility'} />
          ))}
        </>
      )}
    </div>
  );
}
