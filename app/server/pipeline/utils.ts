import { createHash } from 'crypto';

/**
 * Generate a stable ID from a URL by hashing it.
 * This ensures the same URL always produces the same ID for deduplication.
 */
export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/**
 * Get the ISO week number for a date. Used for weekly reset boundaries.
 */
export function getISOWeek(date: Date): number {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

/**
 * Get the ISO week identifier string (e.g., "2026-W19") for a date.
 */
export function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const week = getISOWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
export function getDateString(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Simple logger that prefixes messages with timestamps and component names.
 */
export function createLogger(component: string) {
  return {
    info(msg: string, data?: unknown) {
      console.log(`[${new Date().toISOString()}] [${component}] ${msg}`, data ?? '');
    },
    error(msg: string, data?: unknown) {
      console.error(`[${new Date().toISOString()}] [${component}] ERROR: ${msg}`, data ?? '');
    },
    warn(msg: string, data?: unknown) {
      console.warn(`[${new Date().toISOString()}] [${component}] WARN: ${msg}`, data ?? '');
    },
  };
}
