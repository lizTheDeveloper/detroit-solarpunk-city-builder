import { useGame } from '@/state/store';
import { calculateElectionScore, isElectionTurn, generateCalendarPortrait } from '@/systems/reelection';

function ElectionThreatsPanel() {
  const { state } = useGame();
  if (!state) return null;

  const result = calculateElectionScore(state);
  const electionTurn = isElectionTurn(state.turn);
  const calendarPortrait = generateCalendarPortrait(state);

  // Calculate threats with their current penalty values
  interface Threat {
    id: string;
    label: string;
    value: number;
    severity: 'low' | 'medium' | 'high';
    explanation: string;
    action: string;
  }

  const threats: Threat[] = [];

  // Displacement penalty: -3 per tile with gentrificationPressure > 50
  let displacementTiles = 0;
  for (const tile of Object.values(state.tiles)) {
    if (tile.gentrificationPressure > 50) displacementTiles++;
  }
  if (displacementTiles > 0) {
    const severity = displacementTiles >= 3 ? 'high' : displacementTiles >= 1 ? 'medium' : 'low';
    threats.push({
      id: 'displacement',
      label: 'Displacement',
      value: result.breakdown.displacementPenalty,
      severity,
      explanation: `${displacementTiles} neighborhood${displacementTiles > 1 ? 's' : ''} has high gentrification pressure. Residents may vote you out.`,
      action: 'Build Community Land Trusts or accept anti-displacement proposals in high-pressure areas.',
    });
  }

  // Calendar equity: -3 per neglected neighborhood
  let neglectedNeighborhoods = 0;
  if (state.calendarState?.neighborhoodTimeAllocation) {
    const allocation = state.calendarState.neighborhoodTimeAllocation;
    const totalSlots = Object.values(allocation).reduce(
      (sum, months) => sum + months.reduce((s, n) => s + n, 0), 0
    );
    const tileIds = Object.keys(state.tiles);
    
    if (totalSlots > 0 && tileIds.length > 0) {
      for (const tileId of tileIds) {
        const tileTotal = (allocation[tileId] ?? []).reduce((s, n) => s + n, 0);
        const share = tileTotal / totalSlots;
        if (share < 0.05) neglectedNeighborhoods++;
      }
    }
  }
  
  if (neglectedNeighborhoods > 0) {
    const severity = neglectedNeighborhoods >= 3 ? 'high' : neglectedNeighborhoods >= 1 ? 'medium' : 'low';
    threats.push({
      id: 'calendar-equity',
      label: 'Calendar Equity',
      value: result.breakdown.calendarEquity,
      severity,
      explanation: `${neglectedNeighborhoods} neighborhood${neglectedNeighborhoods > 1 ? 's' : ''} receiving < 5% of your time. Residents feel ignored.`,
      action: 'Visit neglected neighborhoods. Use the calendar to distribute your time more equitably.',
    });
  }

  // Antagonist penalty: -4 per antagonist at escalationLevel >= 3
  let highAntagonists = 0;
  for (const antagonist of Object.values(state.antagonists)) {
    if (antagonist.escalationLevel >= 3) highAntagonists++;
  }
  if (highAntagonists > 0) {
    const severity = highAntagonists >= 2 ? 'high' : 'medium';
    threats.push({
      id: 'antagonists',
      label: 'Antagonist Pressure',
      value: result.breakdown.antagonistPenalty,
      severity,
      explanation: `${highAntagonists} opponent${highAntagonists > 1 ? 's' : ''} escalating against you. They\'ll fund opposition campaigns.`,
      action: 'Negotiate with antagonists, pass countervailing policies, or build coalitions to counter their influence.',
    });
  }

  // Council opposition: hostile > friendly
  let friendly = 0, hostile = 0;
  for (const member of Object.values(state.councilMembers)) {
    if (member.disposition > 30) friendly++;
    if (member.disposition < -20) hostile++;
  }
  if (hostile > friendly) {
    const severity = hostile - friendly >= 3 ? 'high' : 'medium';
    threats.push({
      id: 'council',
      label: 'Council Opposition',
      value: result.breakdown.councilSupport,
      severity,
      explanation: `${hostile} hostile council members vs ${friendly} friendly. They\'ll block your agenda.`,
      action: 'Improve council relationships through meetings, accept their proposals, or lobby for better disposition.',
    });
  }

  // Leader dissatisfaction: fewer than 3 leaders at trust >= 40
  let trustedLeaders = 0;
  for (const leader of Object.values(state.leaders)) {
    if (leader.trust >= 40) trustedLeaders++;
  }
  if (trustedLeaders < 3) {
    const severity = trustedLeaders === 0 ? 'high' : 'medium';
    threats.push({
      id: 'leaders',
      label: 'Leader Dissatisfaction',
      value: 0,
      severity,
      explanation: `Only ${trustedLeaders} leader${trustedLeaders > 1 ? 's' : ''} trust you. Community organizers will resist your policies.`,
      action: 'Meet with leaders, accept their proposals, and follow through on commitments to rebuild trust.',
    });
  }

  // Sort threats by severity (high > medium > low)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  threats.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Calendar equity bonus check
  if (result.breakdown.calendarEquity > 0) {
    // Player has equitable distribution
    const equitableMsg = 'Your calendar shows equitable neighborhood attention. This is building trust across the city.';
    threats.unshift({
      id: 'calendar-equity-bonus',
      label: 'Calendar Equity (Bonus)',
      value: result.breakdown.calendarEquity,
      severity: 'low',
      explanation: equitableMsg,
      action: '',
    });
  }

  return (
    <div className="election-threats-panel">
      <h2 className="panel-title">Election Strategy</h2>
      <p className="panel-subtitle">
        Your re-election depends on trust, relationships, and equity. These factors determine if the community will vote you back in.
      </p>

      <div className="election-score-section">
        <div className="election-score-header">
          <span>Predicted Election Score:</span>
          <strong className={result.score >= 45 ? 'winning' : 'losing'}>
            {Math.round(result.score)} / 45
          </strong>
        </div>
        <div className="election-score-bar">
          <div
            className="election-score-fill"
            style={{ width: `${Math.min(100, (result.score / 60) * 100)}%` }}
          />
        </div>
        <div className="election-score-threshold">
          <span>45 (threshold to win)</span>
        </div>
      </div>

      <div className="election-breakdown">
        <h3>Score Breakdown</h3>
        <div className="breakdown-row positive">
          <span>Trust Base (60% of community trust)</span>
          <strong>+{Math.round(result.breakdown.baseTrust)}</strong>
        </div>
        {result.breakdown.councilSupport !== 0 && (
          <div className={`breakdown-row ${result.breakdown.councilSupport > 0 ? 'positive' : 'negative'}`}>
            <span>Council Support ({friendly} friendly, {hostile} hostile)</span>
            <strong>{result.breakdown.councilSupport > 0 ? '+' : ''}{result.breakdown.councilSupport}</strong>
          </div>
        )}
        {result.breakdown.leaderAdvocates > 0 && (
          <div className="breakdown-row positive">
            <span>Leader Advocates ({trustedLeaders} with high trust)</span>
            <strong>+{result.breakdown.leaderAdvocates}</strong>
          </div>
        )}
        {result.breakdown.coalitionBonus > 0 && (
          <div className="breakdown-row positive">
            <span>Coalition Bonus ({state.coalitions.filter(c => c.active).length} active)</span>
            <strong>+{result.breakdown.coalitionBonus}</strong>
          </div>
        )}
        {result.breakdown.politicalWill > 0 && (
          <div className="breakdown-row positive">
            <span>Political Will ({Math.round(state.meters.politicalWill)}%)</span>
            <strong>+{Math.round(result.breakdown.politicalWill)}</strong>
          </div>
        )}
        {result.breakdown.displacementPenalty < 0 && (
          <div className="breakdown-row negative">
            <span>Displacement Penalty ({displacementTiles} high-pressure neighborhoods)</span>
            <strong>{result.breakdown.displacementPenalty}</strong>
          </div>
        )}
        {result.breakdown.calendarEquity < 0 ? (
          <div className="breakdown-row negative">
            <span>Calendar Equity ({neglectedNeighborhoods} neglected neighborhoods)</span>
            <strong>{result.breakdown.calendarEquity}</strong>
          </div>
        ) : result.breakdown.calendarEquity > 0 ? (
          <div className="breakdown-row positive">
            <span>Calendar Equity Bonus (equitable attention)</span>
            <strong>+{result.breakdown.calendarEquity}</strong>
          </div>
        ) : null}
        {result.breakdown.antagonistPenalty < 0 && (
          <div className="breakdown-row negative">
            <span>Antagonist Penalty ({highAntagonists} escalating opponents)</span>
            <strong>{result.breakdown.antagonistPenalty}</strong>
          </div>
        )}
      </div>

      {threats.length > 0 && (
        <div className="election-threats-section">
          <h3>Active Threats ({threats.length})</h3>
          {threats.map((threat) => (
            <div key={threat.id} className={`threat-item threat-${threat.severity}`}>
              <div className="threat-header">
                <strong className="threat-label">{threat.label}</strong>
                {threat.value !== 0 && (
                  <span className={`threat-impact ${threat.value < 0 ? 'negative' : 'positive'}`}>
                    {threat.value > 0 ? '+' : ''}{threat.value} pts
                  </span>
                )}
              </div>
              <p className="threat-explanation">{threat.explanation}</p>
              {threat.action && (
                <p className="threat-action">
                  <strong>→ {threat.action}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {threats.length === 0 && (
        <div className="election-winning">
          <p>✓ No major threats detected. You\'re positioned to win re-election if you maintain current momentum.</p>
        </div>
      )}

      {calendarPortrait && !calendarPortrait.includes('No calendar data') && (
        <div className="calendar-portrait">
          <h3>Your Calendar</h3>
          <p>{calendarPortrait}</p>
        </div>
      )}

      {electionTurn && (
        <div className="election-imminent">
          <strong>⚠ Election This Turn</strong>
          <p>The community will decide your fate. Score ≥ 45 to win re-election.</p>
        </div>
      )}
    </div>
  );
}

export default ElectionThreatsPanel;
