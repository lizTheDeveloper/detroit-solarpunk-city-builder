/**
 * Format a budget value (stored as millions internally) as thousands for display.
 * $0.14M internal → "$140K" display
 * $1.5M internal → "$1,500K" display
 * This matches real Detroit grant/project scale.
 */
export function formatBudget(amount: number): string {
  const k = Math.round(amount * 1000);
  if (k >= 1000) {
    return `$${(k / 1000).toFixed(1)}M`;
  }
  return `$${k.toLocaleString()}K`;
}

/**
 * Format a budget delta (change) for display.
 * +0.14M internal → "+$140K"
 * -0.08M internal → "-$80K"
 */
export function formatBudgetDelta(amount: number): string {
  const k = Math.round(Math.abs(amount) * 1000);
  const sign = amount >= 0 ? '+' : '-';
  if (k >= 1000) {
    return `${sign}$${(k / 1000).toFixed(1)}M`;
  }
  return `${sign}$${k.toLocaleString()}K`;
}

/**
 * Format a project/policy cost for display.
 */
export function formatCost(amount: number): string {
  const k = Math.round(amount * 1000);
  if (k >= 1000) {
    return `$${(k / 1000).toFixed(1)}M`;
  }
  return `$${k}K`;
}
