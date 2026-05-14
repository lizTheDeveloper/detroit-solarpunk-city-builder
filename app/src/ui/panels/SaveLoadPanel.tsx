import { useState } from 'react';
import { useGame } from '@/state/store';
import { saveGame, loadGame, listSaves, deleteSave } from '@/systems/persistence';
import type { SaveMetadata } from '@/systems/persistence';
import { trackSaveGame } from '@/systems/analytics';

interface SaveLoadPanelProps {
  onLoad: (slot: string) => void;
}

export default function SaveLoadPanel({ onLoad }: SaveLoadPanelProps) {
  const { state } = useGame();
  const [saves, setSaves] = useState<SaveMetadata[]>(() => listSaves());
  const [saveSlot, setSaveSlot] = useState('');
  const [message, setMessage] = useState('');

  function refreshSaves() {
    setSaves(listSaves());
  }

  function handleSave() {
    const slot = saveSlot.trim() || `manual_${Date.now()}`;
    saveGame(state, slot);
    trackSaveGame(slot);
    setMessage(`Saved to "${slot}"`);
    setSaveSlot('');
    refreshSaves();
  }

  function handleQuickSave() {
    saveGame(state, 'quicksave');
    trackSaveGame('quicksave');
    setMessage('Quick saved!');
    refreshSaves();
  }

  function handleLoad(slot: string) {
    const loaded = loadGame(slot);
    if (loaded) {
      onLoad(slot);
      setMessage(`Loaded "${slot}"`);
    } else {
      setMessage('Failed to load save (version mismatch or corrupt).');
    }
  }

  function handleDelete(slot: string) {
    deleteSave(slot);
    setMessage(`Deleted "${slot}"`);
    refreshSaves();
  }

  return (
    <div className="panel save-load-panel">
      <h2 className="panel-title">Save / Load</h2>

      <div className="save-section">
        <button className="btn btn-sm btn-primary" onClick={handleQuickSave} type="button">
          Quick Save
        </button>
        <div className="save-custom">
          <input
            className="save-slot-input"
            type="text"
            placeholder="Save name..."
            value={saveSlot}
            onChange={(e) => setSaveSlot(e.target.value)}
          />
          <button className="btn btn-sm" onClick={handleSave} type="button">
            Save
          </button>
        </div>
      </div>

      {message && <div className="save-message">{message}</div>}

      {saves.length > 0 && (
        <div className="saves-list">
          <h3 className="saves-list-title">Saved Games</h3>
          {saves
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
            .map((save) => (
              <div key={save.slot} className="save-entry">
                <div className="save-entry-info">
                  <span className="save-entry-name">{save.slot}</span>
                  <span className="save-entry-details">
                    Turn {save.turn} / Year {save.year} / {save.stage}
                  </span>
                  <span className="save-entry-date">
                    {new Date(save.savedAt).toLocaleString()}
                  </span>
                </div>
                <div className="save-entry-actions">
                  <button
                    className="btn btn-sm"
                    onClick={() => handleLoad(save.slot)}
                    type="button"
                  >
                    Load
                  </button>
                  <button
                    className="btn btn-sm btn-reject"
                    onClick={() => handleDelete(save.slot)}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
