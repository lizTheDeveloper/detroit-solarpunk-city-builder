/**
 * Format a budget value (stored in millions internally) for display.
 * Budget is the Detroit general fund: ~$1,576M ($1.576B).
 */
export function formatBudget(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}B`;
  }
  if (amount >= 1) {
    return `$${Math.round(amount)}M`;
  }
  const k = Math.round(amount * 1000);
  return `$${k.toLocaleString()}K`;
}

/**
 * Format a budget delta (change) for display.
 */
export function formatBudgetDelta(amount: number): string {
  const sign = amount >= 0 ? '+' : '-';
  const abs = Math.abs(amount);
  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(2)}B`;
  }
  if (abs >= 1) {
    return `${sign}$${Math.round(abs)}M`;
  }
  const k = Math.round(abs * 1000);
  return `${sign}$${k.toLocaleString()}K`;
}

/**
 * Format a project/policy cost for display.
 */
export function formatCost(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}B`;
  }
  if (amount >= 1) {
    return `$${amount.toFixed(1)}M`;
  }
  const k = Math.round(amount * 1000);
  return `$${k}K`;
}
