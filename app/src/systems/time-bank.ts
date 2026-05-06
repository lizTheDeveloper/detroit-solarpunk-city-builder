import type { GameState, MeterDelta } from '../state/types';

/**
 * Time Banking — counter-economics.
 *
 * High community trust generates "time credits" that can subsidize project costs.
 * This models real time banking: an hour of your plumbing = an hour of my tutoring.
 * No money changes hands. The city budget doesn't see it. It just... happens.
 *
 * Real Detroit precedent:
 * - TimeBanking Detroit (2009-present): 200+ members, 5000+ hours exchanged
 * - Detroit Time Exchange: skill sharing, eldercare, childcare, construction labor
 * - "An hour is an hour" — a lawyer's hour = a gardener's hour. Radical equality.
 *
 * Mechanically:
 * - Each turn, if communityTrust > 40, generate time credits
 * - Credits = (trust - 40) * 0.002 per turn (max ~0.12M equivalent at trust=100)
 * - Credits automatically reduce the cost of the NEXT project started
 * - Stored on GameState as `timeCredits: number`
 * - When a project starts, time credits offset up to 50% of cost
 * - Used credits are consumed
 * - Creates a visible "time bank" entry in the turn summary
 *
 * The punk angle: this is parallel infrastructure. The official budget says you're
 * broke, but the neighborhood knows different. Your neighbor rewired your solar
 * panel and you watched her kids — that's not in any spreadsheet.
 */

export interface TimeBankResult {
  creditsGenerated: number;
  deltas: MeterDelta[];
}

export function generateTimeCredits(state: GameState): TimeBankResult {
  const trust = state.meters.communityTrust;
  if (trust <= 40) {
    return { creditsGenerated: 0, deltas: [] };
  }

  const credits = (trust - 40) * 0.002;
  const deltas: MeterDelta[] = [{
    meter: 'budget',
    amount: credits,
    source: 'time_bank',
  }];

  return { creditsGenerated: credits, deltas };
}

/**
 * Calculate how much time banking reduces a project's cost.
 * Returns the discount (subtracted from cost) and remaining credits.
 */
export function applyTimeBankDiscount(
  availableCredits: number,
  projectCost: number,
): { discount: number; remainingCredits: number } {
  const maxDiscount = projectCost * 0.5; // can't cover more than 50%
  const discount = Math.min(availableCredits, maxDiscount);
  return {
    discount,
    remainingCredits: availableCredits - discount,
  };
}
