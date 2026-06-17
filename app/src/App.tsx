import { useState, useCallback, useRef, useEffect } from 'react';
import { GameContext } from '@/state/store';
import type { GameState, GameAction } from '@/state/types';
import { createNewGame } from '@/state/create-game';
import { gameReducer } from '@/state/reducer';
import { generateEvents } from '@/systems/events';
import { prepareTurn } from '@/systems/resolve';
import { autoSave, loadGame, createUndoStack, pushState, undo, canUndo } from '@/systems/persistence';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { LEADER_DEFINITIONS } from '@/data/content/leaders';
import { initializeArcsFromPipeline } from '@/state/initialize-arcs-from-pipeline';
import {
  initAnalytics,
  trackGameAction,
  trackSessionEnd,
  trackTabOpen,
  trackPanelOpen,
  trackConversationStart,
  trackFunnelStep,
  trackLoadGame,
  trackUndo as trackUndoAnalytics,
  trackStrategySnapshot,
} from '@/systems/analytics';
import TopBar from '@/ui/components/TopBar';
import MeterBar from '@/ui/components/MeterBar';
import TileList from '@/ui/components/TileList';
import EndTurnButton from '@/ui/components/EndTurnButton';
import TurnSummary from '@/ui/components/TurnSummary';
import AdvisorToast from '@/ui/components/AdvisorToast';
import Dashboard from '@/ui/components/Dashboard';
import TutorialTooltip from '@/ui/components/TutorialTooltip';
import TileDetailPanel from '@/ui/panels/TileDetailPanel';
import ProjectSelectPanel from '@/ui/panels/ProjectSelectPanel';
import ProposalPanel from '@/ui/panels/ProposalPanel';
import CouncilPanel from '@/ui/panels/CouncilPanel';
import CharacterPanel from '@/ui/panels/CharacterPanel';
import PolicyPanel from '@/ui/panels/PolicyPanel';
import EventPanel from '@/ui/panels/EventPanel';
import TensionPanel from '@/ui/panels/TensionPanel';
import SaveLoadPanel from '@/ui/panels/SaveLoadPanel';
import ConversationPanel from '@/ui/panels/ConversationPanel';
import CoalitionPanel from '@/ui/panels/CoalitionPanel';
import LLMSettingsPanel from '@/ui/panels/LLMSettingsPanel';
import HeadlinesPanel from '@/ui/panels/HeadlinesPanel';
import BudgetPanel from '@/ui/panels/BudgetPanel';
import { CalendarBar } from '@/ui/components/CalendarBar';
import { CalendarGrid } from '@/ui/components/CalendarGrid';
import MapPanel from '@/map/MapPanel';
import BlockDetailPanel from '@/ui/panels/BlockDetailPanel';
import { useHeadlines } from '@/hooks/useHeadlines';

type ContentTab = 'map' | 'tiles' | 'calendar' | 'budget' | 'dashboard' | 'council' | 'characters' | 'coalitions' | 'policies' | 'events' | 'tensions' | 'saves' | 'settings';

type RightPanel =
  | { kind: 'none' }
  | { kind: 'tile-detail'; tileId: string }
  | { kind: 'project-select'; tileId: string; blockId?: string }
  | { kind: 'block-detail'; tileId: string; blockId: string };

/** Create initial game state with leader definitions applied and first proposals generated. */
function initGame(): GameState {
  const base = createNewGame();

  // Apply full leader definitions (name, neighborhood, backstory, priorities, etc.)
  const leaders = { ...base.leaders };
  for (const [id, def] of Object.entries(LEADER_DEFINITIONS)) {
    if (leaders[id]) {
      leaders[id] = { ...leaders[id], ...def, trust: leaders[id].trust };
    }
  }

  let state: GameState = { ...base, leaders };

  return prepareTurn(state);
}

export default function App() {
  const [state, setState] = useState<GameState>(initGame);
  const [rightPanel, setRightPanel] = useState<RightPanel>({ kind: 'none' });
  const [showTurnSummary, setShowTurnSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('map');
  const undoStackRef = useRef(createUndoStack());
  const [conversation, setConversation] = useState<{ characterId: string; interactionType: string; message: string; proposalId?: string } | null>(null);
  const { headlines } = useHeadlines(20);

  useEffect(() => {
    initAnalytics();
    trackFunnelStep('game_started');
  }, []);

  useEffect(() => {
    initializeArcsFromPipeline(state).then((updated) => {
      if (updated !== state) setState(updated);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stateRef = { current: state };
    stateRef.current = state;
    const handleBeforeUnload = () => trackSessionEnd(stateRef.current);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state]);

  const dispatch = useCallback((action: GameAction) => {
    setState((prev) => {
      const next = gameReducer(prev, action, PROJECT_CATALOG);
      trackGameAction(action, prev, next);
      return next;
    });
  }, []);

  const handleSelectTile = useCallback((tileId: string) => {
    setRightPanel({ kind: 'tile-detail', tileId });
    trackPanelOpen('tile-detail', { tile_id: tileId });
    setActiveTab('tiles');
  }, []);

  const handleSelectBlock = useCallback((blockId: string, neighborhoodId: string) => {
    dispatch({ type: 'MAP_SELECT_BLOCK', blockId, neighborhoodId });
    setRightPanel((prev) => {
      const tileId = neighborhoodId || (prev.kind !== 'none' ? prev.tileId : '');
      return { kind: 'block-detail' as const, tileId, blockId };
    });
    trackPanelOpen('block-detail', { block_id: blockId });
    setActiveTab('tiles');
  }, [dispatch]);

  const handleStartProjectClick = useCallback((tileId: string) => {
    setRightPanel({ kind: 'project-select', tileId });
    trackPanelOpen('project-select', { tile_id: tileId });
  }, []);

  const handleBackToTile = useCallback((tileId: string) => {
    setRightPanel({ kind: 'tile-detail', tileId });
  }, []);

  const handleEndTurn = useCallback(() => {
    setState((prev) => {
      undoStackRef.current = pushState(undoStackRef.current, prev);

      const events = generateEvents(prev, Math.random);
      if (events.length > 0) {
        return {
          ...prev,
          phase: 'events' as const,
          eventQueue: [...prev.eventQueue, ...events],
        };
      }

      const afterEnd = gameReducer(prev, { type: 'END_TURN' }, PROJECT_CATALOG);
      trackGameAction({ type: 'END_TURN' }, prev, afterEnd);
      const ready = prepareTurn(afterEnd);
      autoSave(ready);
      trackStrategySnapshot(ready);
      return ready;
    });
    setShowTurnSummary(true);
  }, []);

  const handleResolveAfterEvents = useCallback(() => {
    setState((prev) => {
      const afterEnd = gameReducer(prev, { type: 'END_TURN' }, PROJECT_CATALOG);
      trackGameAction({ type: 'END_TURN' }, prev, afterEnd);
      const ready = prepareTurn(afterEnd);
      autoSave(ready);
      trackStrategySnapshot(ready);
      return ready;
    });
    setShowTurnSummary(true);
  }, []);

  const handleUndo = useCallback(() => {
    if (!canUndo(undoStackRef.current)) return;
    const result = undo(undoStackRef.current);
    if (result.state) {
      undoStackRef.current = result.stack;
      setState(result.state);
      trackUndoAnalytics();
    }
  }, []);

  const handleLoadSave = useCallback((slot: string) => {
    const loaded = loadGame(slot);
    if (loaded) {
      setState(loaded);
      trackLoadGame(slot);
      trackFunnelStep('returning_player');
    }
  }, []);

  const handleDismissSummary = useCallback(() => {
    setShowTurnSummary(false);
  }, []);

  const handleRestDay = useCallback(() => {
    dispatch({ type: 'CALENDAR_REST_DAY' });
  }, [dispatch]);

  const selectedTileId =
    rightPanel.kind === 'tile-detail' || rightPanel.kind === 'project-select' || rightPanel.kind === 'block-detail'
      ? rightPanel.tileId
      : null;

  const selectedBlockId = rightPanel.kind === 'block-detail' || (rightPanel.kind === 'project-select' && rightPanel.blockId)
    ? ('blockId' in rightPanel ? rightPanel.blockId : null)
    : null;

  const eventCount = state.eventQueue.length;

  const cal = state.calendarState;
  const slotsRemaining = cal.discretionarySlots - cal.slotsSpent;

  const TABS: { id: ContentTab; label: string; badge?: number }[] = [
    { id: 'map', label: 'Map' },
    { id: 'tiles', label: 'Tiles' },
    { id: 'calendar', label: `Calendar (${slotsRemaining}/${cal.discretionarySlots})` },
    { id: 'budget', label: 'Budget' },
    { id: 'dashboard', label: 'Briefing' },
    { id: 'council', label: 'Council' },
    { id: 'characters', label: 'Leaders' },
    { id: 'coalitions', label: 'Coalitions' },
    { id: 'policies', label: 'Policies' },
    { id: 'events', label: 'Events', badge: eventCount > 0 ? eventCount : undefined },
    { id: 'tensions', label: 'Tensions' },
    { id: 'saves', label: 'Save/Load' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      <div className="game-layout">
        <TopBar />
        <div className="game-main">
          <aside className="game-sidebar">
            <TileList
              selectedTileId={selectedTileId}
              onSelectTile={handleSelectTile}
            />
            <HeadlinesPanel />
            <EndTurnButton onEndTurn={handleEndTurn} onResolve={handleResolveAfterEvents} />
            <button
              className="btn btn-sm btn-undo"
              onClick={handleUndo}
              disabled={!canUndo(undoStackRef.current)}
              type="button"
            >
              Undo Turn
            </button>
          </aside>
          <main className="game-content">
            <div className="content-tab-bar">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`content-tab ${activeTab === tab.id ? 'content-tab--active' : ''}`}
                  onClick={() => { trackTabOpen(tab.id, activeTab); setActiveTab(tab.id); }}
                  type="button"
                >
                  {tab.label}
                  {tab.badge != null && (
                    <span className="content-tab-badge">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === 'map' && (
              <div className="map-container">
                <MapPanel
                  onSelectTile={handleSelectTile}
                  onSelectBlock={handleSelectBlock}
                  selectedTileId={selectedTileId}
                  selectedBlockId={selectedBlockId}
                  tileHealthMap={Object.fromEntries(
                    Object.values(state.tiles).map(t => [t.id, t.ecologicalHealth])
                  )}
                  headlines={headlines}
                />
              </div>
            )}

            {/* Events panel shown prominently when events exist */}
            {eventCount > 0 && activeTab === 'events' && <EventPanel />}

            {/* Events badge pulses but doesn't hijack the screen */}

            {activeTab === 'tiles' && (
              <>
                {rightPanel.kind === 'none' && state.activeProposals.length > 0 && (
                  <ProposalPanel onConversation={(charId, type, proposalId) => { trackConversationStart(charId, type); setConversation({ characterId: charId, interactionType: type, message: '', proposalId }); }} />
                )}

                {rightPanel.kind === 'tile-detail' && (
                  <TileDetailPanel
                    tileId={rightPanel.tileId}
                    onStartProjectClick={() => handleStartProjectClick(rightPanel.tileId)}
                    onConversation={(charId, type, proposalId) => { trackConversationStart(charId, type); setConversation({ characterId: charId, interactionType: type, message: '', proposalId }); }}
                  />
                )}

                {rightPanel.kind === 'block-detail' && (
                  <BlockDetailPanel
                    blockId={rightPanel.blockId}
                    onBack={() => setRightPanel({ kind: 'tile-detail', tileId: rightPanel.tileId })}
                    onStartProject={() => setRightPanel({ kind: 'project-select', tileId: rightPanel.tileId, blockId: rightPanel.blockId })}
                  />
                )}

                {rightPanel.kind === 'project-select' && (
                  <ProjectSelectPanel
                    tileId={rightPanel.tileId}
                    blockId={'blockId' in rightPanel ? rightPanel.blockId : undefined}
                    onBack={() => handleBackToTile(rightPanel.tileId)}
                  />
                )}

                {rightPanel.kind === 'none' && state.activeProposals.length === 0 && (
                  <div className="panel welcome-panel">
                    <h2 className="panel-title">Detroit Solarpunk City Builder</h2>
                    <p>Select a neighborhood from the sidebar to view details and start projects.</p>
                    <p>Respond to community proposals, then end the turn to advance.</p>
                  </div>
                )}
              </>
            )}

            {activeTab === 'calendar' && (
              <div className="panel calendar-panel">
                <CalendarBar
                  discretionarySlots={cal.discretionarySlots}
                  slotsSpent={cal.slotsSpent}
                  overscheduleAmount={cal.overscheduleAmount}
                  overscheduleLimit={cal.overscheduleLimit}
                  crisisSlotTax={cal.crisisSlotTax}
                  burnoutState={cal.burnoutState}
                  burnoutBuffer={cal.burnoutBuffer}
                  burnoutBufferMax={cal.burnoutBufferMax}
                  onRestDay={handleRestDay}
                />
                <CalendarGrid
                  totalSlots={cal.totalSlots}
                  fixedSlots={cal.fixedSlots}
                  slotsSpent={cal.slotsSpent}
                  crisisSlotTax={cal.crisisSlotTax}
                  overscheduleAmount={cal.overscheduleAmount}
                  spentSlotDetails={[]}
                  crisisNames={state.activeArcs.map((a) => a.arcId)}
                  monthNumber={cal.monthNumber}
                  expanded={true}
                  onToggle={() => {}}
                />
              </div>
            )}

            {activeTab === 'budget' && <BudgetPanel />}
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'council' && <CouncilPanel />}
            {activeTab === 'characters' && <CharacterPanel onTalk={(charId) => { trackConversationStart(charId, 'direct_engagement'); setConversation({ characterId: charId, interactionType: 'direct_engagement', message: '' }); }} />}
            {activeTab === 'coalitions' && <CoalitionPanel />}
            {activeTab === 'policies' && <PolicyPanel />}
            {activeTab === 'tensions' && <TensionPanel />}
            {activeTab === 'saves' && <SaveLoadPanel onLoad={handleLoadSave} />}
            {activeTab === 'settings' && <LLMSettingsPanel />}
          </main>
        </div>
        <MeterBar />
        {conversation && (
          <ConversationPanel
            characterId={conversation.characterId}
            interactionType={conversation.interactionType}
            onDismiss={() => setConversation(null)}
            initialMessage={conversation.message}
            proposalId={conversation.proposalId}
          />
        )}
        {showTurnSummary && <TurnSummary onDismiss={handleDismissSummary} />}
        <TutorialTooltip onStateUpdate={setState} />
        <AdvisorToast onStateUpdate={setState} />
      </div>
    </GameContext.Provider>
  );
}
