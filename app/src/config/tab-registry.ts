import type { ComponentType } from 'react';
import type { GameState } from '../state/types';

export interface TabDefinition {
  id: string;
  label: string | ((state: GameState) => string);
  order: number;
  badge?: (state: GameState) => number | undefined;
  component: ComponentType<Record<string, never>>;
}

class TabRegistry {
  private tabs: Map<string, TabDefinition> = new Map();

  register(tab: TabDefinition): void {
    this.tabs.set(tab.id, tab);
  }

  getTab(id: string): TabDefinition | undefined {
    return this.tabs.get(id);
  }

  getAllTabs(): TabDefinition[] {
    return Array.from(this.tabs.values()).sort((a, b) => a.order - b.order);
  }
}

export const tabRegistry = new TabRegistry();
