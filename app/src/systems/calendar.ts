import type { Season } from '../state/types';

/**
 * Monthly calendar system — derives season from month.
 *
 * Detroit calendar alignment:
 * - Winter (Jan-Mar): planning season, frozen ground, grant-writing
 * - Spring (Apr-Jun): planting, ground thaws May 10 (last frost)
 * - Summer (Jul-Sep): construction, block parties, peak growing
 * - Fall (Oct-Dec): harvest, organizing, first frost Oct 10
 */

export function getSeason(month: number): Season {
  if (month >= 1 && month <= 3) return 'winter';
  if (month >= 4 && month <= 6) return 'spring';
  if (month >= 7 && month <= 9) return 'summer';
  return 'fall'; // 10-12
}

export function isSeasonTransition(prevMonth: number, currentMonth: number): boolean {
  return getSeason(prevMonth) !== getSeason(currentMonth);
}

/**
 * Get the month name for display purposes.
 */
const MONTH_NAMES = [
  'January', 'February', 'March',
  'April', 'May', 'June',
  'July', 'August', 'September',
  'October', 'November', 'December',
];

export function getMonthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? 'Unknown';
}
