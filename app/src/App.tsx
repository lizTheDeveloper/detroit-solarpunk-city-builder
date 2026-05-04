import { useState, useCallback, useRef } from 'react';
import { GameContext } from '@/state/store';
import type { GameState, GameAction } from '@/state/types';
import { createNewGame } from '@/state/create-game';
import { gameReducer } from '@/state/reducer';
import { generateProposals } from '@/systems/proposals';
import { generateEvents } from '@/systems/events';
import { autoSave, loadGame, createUndoStack, pushState, undo, canUndo } from '@/systems/persistence';
import { PROJECT_CATALOG } from '@/data/content/project-catalog';
import { LEADER_DEFINITIONS } from '@/data/content/leaders';
import TopBar from '@/ui/components/TopBar';
import MeterBar from '@/ui/components/MeterBar';
import TileList from '@/ui/components/TileList';
import EndTurnButton from '@/ui/components/EndTurnButton';
import TurnSummary from '@/ui/components/TurnSummary';
import TileDetailPanel from '@/ui/panels/TileDetailPanel';
import ProjectSelectPanel from '@/ui/panels/ProjectSelectPanel';
import ProposalPanel from '@/ui/panels/ProposalPanel';
import CouncilPanel from '@/ui/panels/CouncilPanel';
import CharacterPanel from '@/ui/panels/CharacterPanel';
import PolicyPanel from '@/ui/panels/PolicyPanel';
import NarrativePanel from '@/ui/panels/NarrativePanel';
import EventPanel from '@/ui/panels/EventPanel';
import TensionPanel from '@/ui/panels/TensionPanel';
import SaveLoadPanel from '@/ui/panels/SaveLoadPanel';

type ContentTab = 'tiles' | 'council' | 'characters' | 'policies' | 'narrative' | 'events' | 'tensions' | 'saves';

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

  // Generate initial proposals
  const proposals = generateProposals(state);
  state = { ...state, activeProposals: proposals };

  return state;
}

export default function App() {
  const [state, setState] = useState<GameState>(initGame);
  const [rightPanel, setRightPanel] = useState<RightPanel>({ kind: 'none' });
  const [showTurnSummary, setShowTurnSummary] = useState(false);
  const [activeTab, setActiveTab] = useState<ContentTab>('tiles');
  const undoStackRef = useRef(createUndoStack());

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
      const proposals = generateProposals(afterEnd);
      autoSave(afterEnd);
      return { ...afterEnd, activeProposals: proposals };
    });
    setShowTurnSummary(true);
  }, []);

  const handleResolveAfterEvents = useCallback(() => {
    setState((prev) => {
      const afterEnd = gameReducer(prev, { type: 'END_TURN' }, PROJECT_CATALOG);
      const proposals = generateProposals(afterEnd);
      autoSave(afterEnd);
      return { ...afterEnd, activeProposals: proposals };
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

  const selectedTileId =
    rightPanel.kind === 'tile-detail' || rightPanel.kind === 'project-select'
      ? rightPanel.tileId
      : null;

  const eventCount = state.eventQueue.length;

  const TABS: { id: ContentTab; label: string; badge?: number }[] = [
    { id: 'tiles', label: 'Tiles' },
    { id: 'council', label: 'Council' },
    { id: 'characters', label: 'Leaders' },
    { id: 'policies', label: 'Policies' },
    { id: 'narrative', label: 'Actions' },
    { id: 'events', label: 'Events', badge: eventCount > 0 ? eventCount : undefined },
    { id: 'tensions', label: 'Tensions' },
    { id: 'saves', label: 'Save/Load' },
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

            {/* Events panel shown prominently when events exist */}
            {eventCount > 0 && activeTab === 'events' && <EventPanel />}

            {/* Events auto-show during events phase */}
            {eventCount > 0 && activeTab !== 'events' && state.phase === 'events' && <EventPanel />}

            {activeTab === 'tiles' && (
              <>
                {state.activeProposals.length > 0 && <ProposalPanel />}

                {rightPanel.kind === 'tile-detail' && (
                  <TileDetailPanel
                    tileId={rightPanel.tileId}
                    onStartProjectClick={() => handleStartProjectClick(rightPanel.tileId)}
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

            {activeTab === 'council' && <CouncilPanel />}
            {activeTab === 'characters' && <CharacterPanel />}
            {activeTab === 'policies' && <PolicyPanel />}
            {activeTab === 'narrative' && <NarrativePanel />}
            {activeTab === 'tensions' && <TensionPanel />}
            {activeTab === 'saves' && <SaveLoadPanel onLoad={handleLoadSave} />}
          </main>
        </div>
        <MeterBar />
        {showTurnSummary && <TurnSummary onDismiss={handleDismissSummary} />}
      </div>
    </GameContext.Provider>
  );
}
