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
import { CalendarBar } from '@/ui/components/CalendarBar';
import { CalendarGrid } from '@/ui/components/CalendarGrid';
import MapPanel from '@/map/MapPanel';

type ContentTab = 'map' | 'tiles' | 'calendar' | 'dashboard' | 'council' | 'characters' | 'coalitions' | 'policies' | 'events' | 'tensions' | 'saves' | 'settings';

type RightPanel =
  | { kind: 'none' }
  | { kind: 'tile-detail'; tileId: string }
  | { kind: 'project-select'; tileId: string };

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

  useEffect(() => {
    initializeArcsFromPipeline(state).then((updated) => {
      if (updated !== state) setState(updated);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const dispatch = useCallback((action: GameAction) => {
    setState((prev) => gameReducer(prev, action, PROJECT_CATALOG));
  }, []);

  const handleSelectTile = useCallback((tileId: string) => {
    setRightPanel({ kind: 'tile-detail', tileId });
    setActiveTab('tiles');
  }, []);

  const handleStartProjectClick = useCallback((tileId: string) => {
    setRightPanel({ kind: 'project-select', tileId });
  }, []);

  const handleBackToTile = useCallback((tileId: string) => {
    setRightPanel({ kind: 'tile-detail', tileId });
  }, []);

  const handleEndTurn = useCallback(() => {
    setState((prev) => {
      // Push current state onto undo stack before advancing
      undoStackRef.current = pushState(undoStackRef.current, prev);

      // Generate events for the player to respond to before resolving
      const events = generateEvents(prev, Math.random);
      if (events.length > 0) {
        return {
          ...prev,
          phase: 'events' as const,
          eventQueue: [...prev.eventQueue, ...events],
        };
      }

      // No events — resolve immediately
      const afterEnd = gameReducer(prev, { type: 'END_TURN' }, PROJECT_CATALOG);
      const ready = prepareTurn(afterEnd);
      autoSave(ready);
      return ready;
    });
    setShowTurnSummary(true);
  }, []);

  const handleResolveAfterEvents = useCallback(() => {
    setState((prev) => {
      const afterEnd = gameReducer(prev, { type: 'END_TURN' }, PROJECT_CATALOG);
      const ready = prepareTurn(afterEnd);
      autoSave(ready);
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
    }
  }, []);

  const handleLoadSave = useCallback((slot: string) => {
    const loaded = loadGame(slot);
    if (loaded) setState(loaded);
  }, []);

  const handleDismissSummary = useCallback(() => {
    setShowTurnSummary(false);
  }, []);

  const handleRestDay = useCallback(() => {
    dispatch({ type: 'CALENDAR_REST_DAY' });
  }, [dispatch]);

  const selectedTileId =
    rightPanel.kind === 'tile-detail' || rightPanel.kind === 'project-select'
      ? rightPanel.tileId
      : null;

  const eventCount = state.eventQueue.length;

  const cal = state.calendarState;
  const slotsRemaining = cal.discretionarySlots - cal.slotsSpent;

  const TABS: { id: ContentTab; label: string; badge?: number }[] = [
    { id: 'map', label: 'Map' },
    { id: 'tiles', label: 'Tiles' },
    { id: 'calendar', label: `Calendar (${slotsRemaining}/${cal.discretionarySlots})` },
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
                  onClick={() => setActiveTab(tab.id)}
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
                  selectedTileId={selectedTileId}
                  tileHealthMap={Object.fromEntries(
                    Object.values(state.tiles).map(t => [t.id, t.ecologicalHealth])
                  )}
                />
              </div>
            )}

            {/* Events panel shown prominently when events exist */}
            {eventCount > 0 && activeTab === 'events' && <EventPanel />}

            {/* Events badge pulses but doesn't hijack the screen */}

            {activeTab === 'tiles' && (
              <>
                {rightPanel.kind === 'none' && state.activeProposals.length > 0 && (
                  <ProposalPanel onConversation={(charId, type, proposalId) => setConversation({ characterId: charId, interactionType: type, message: '', proposalId })} />
                )}

                {rightPanel.kind === 'tile-detail' && (
                  <TileDetailPanel
                    tileId={rightPanel.tileId}
                    onStartProjectClick={() => handleStartProjectClick(rightPanel.tileId)}
                    onConversation={(charId, type, proposalId) => setConversation({ characterId: charId, interactionType: type, message: '', proposalId })}
                  />
                )}

                {rightPanel.kind === 'project-select' && (
                  <ProjectSelectPanel
                    tileId={rightPanel.tileId}
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

            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'council' && <CouncilPanel />}
            {activeTab === 'characters' && <CharacterPanel onTalk={(charId) => setConversation({ characterId: charId, interactionType: 'direct_engagement', message: '' })} />}
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
