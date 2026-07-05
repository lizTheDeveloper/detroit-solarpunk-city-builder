/**
 * Quick Playtest - 12 turns (one year) - No AI, just simulates
 * Run: bun scripts/playtest-gemini-quick.ts
 */

import { createNewGame } from '../src/state/create-game';
import { generateProposals } from '../src/systems/proposals';
import { generateEvents } from '../src/systems/events';

const TURNS_TO_PLAY = 12; // One year

interface GameState {
  turn: number;
  year: number;
  season: string;
  stage: string;
  budget: number;
  meters: {
    trust: number;
    eco: number;
    food: number;
  };
  leaders: number;
  proposals: number;
  gameOver: boolean;
  gameOverCondition?: string;
}

function simulateTurn(state: GameState): GameState {
  console.log(`\n━━━ Turn ${state.turn}/${state.year} (${state.season}) ━━━`);
  console.log(`Budget: $${state.budget}M | Trust: ${state.meters.trust}% | Eco: ${state.meters.eco}% | Food: ${state.meters.food}%`);
  console.log(`Leaders: ${state.leaders} | Active Proposals: ${state.proposals}`);
  
  // Simulate some activity
  const newLeaders = state.leaders + Math.floor(Math.random() * 3);
  const budgetChange = Math.floor(Math.random() * 20) - 10; // -10 to +10
  const trustChange = Math.floor(Math.random() * 20) - 5;   // -5 to +15
  const ecoChange = Math.floor(Math.random() * 15);          // 0 to +15
  const foodChange = Math.floor(Math.random() * 10);         // 0 to +10
  
  const nextState: GameState = {
    ...state,
    turn: state.turn + 1,
    season: ['spring', 'summer', 'fall', 'winter'][state.turn % 4],
    budget: Math.max(0, state.budget + budgetChange),
    meters: {
      trust: Math.min(100, Math.max(0, state.meters.trust + trustChange)),
      eco: Math.min(100, Math.max(0, state.meters.eco + ecoChange)),
      food: Math.min(100, Math.max(0, state.meters.food + foodChange)),
    },
    leaders: newLeaders,
    proposals: state.proposals + Math.floor(Math.random() * 2),
    year: Math.floor((state.turn + 1) / 4) + 1,
  };
  
  return nextState;
}

function runPlaytest(): void {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Quick Playtest: 12 Turns (No AI)      ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  let state: GameState = {
    turn: 1,
    year: 1,
    season: 'spring',
    stage: 'planning',
    budget: 50,
    meters: {
      trust: 50,
      eco: 30,
      food: 20,
    },
    leaders: 4,
    proposals: 2,
    gameOver: false,
  };
  
  // Turn 1: Create some proposals
  console.log('━━━ Turn 1 - Creating Initial Proposals ━━━');
  const proposals = generateProposals(state as any);
  console.log(`Generated ${proposals.length} proposals`);
  
  // Turn 1: Generate some events
  console.log('━━━ Turn 1 - Generating Events ━━━');
  const events = generateEvents(state as any);
  console.log(`Generated ${events.length} events`);
  
  // Simulate 12 turns
  for (let i = 0; i < TURNS_TO_PLAY; i++) {
    state = simulateTurn(state);
    
    if (state.gameOver) {
      console.log(`\n⚠️  Game Over at Turn ${state.turn}!`);
      console.log(`Reason: ${state.gameOverCondition}`);
      break;
    }
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('FINAL STATE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Budget: $${state.budget}M | Trust: ${state.meters.trust}% | Eco: ${state.meters.eco}% | Food: ${state.meters.food}%`);
  console.log(`Turn: ${state.turn}/${state.year} | Season: ${state.stage}`);
  console.log(`Leaders: ${state.leaders}`);
  
  if (!state.gameOver) {
    console.log('\n✅ Survived 1 year!');
  }
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Playtest Complete                     ║');
  console.log('╚════════════════════════════════════════╝\n');
}

try {
  runPlaytest();
} catch (error) {
  console.error('Playtest failed:', error);
  process.exit(1);
}

