import { ApiFetchResult, CategoryKey, PickupLine } from '../types';
import { CURATED_PICKUP_LINES, LINES_BY_CATEGORY } from '../data/curatedLines';

// Anti-repetition queue per category to ensure variety
const recentHistory: Record<string, string[]> = {};

function pickWithoutRepetition(pool: PickupLine[], catKey: string, excludeText?: string): PickupLine {
  if (!pool.length) throw new Error('Pickup line catalog is empty');
  if (pool.length <= 1) return pool[0];

  const recent = recentHistory[catKey] || [];
  // Filter out the last 30 seen lines in this category
  const excluded = new Set(recent);
  if (excludeText) excluded.add(excludeText);
  let chosen: PickupLine | undefined;
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (!excluded.has(candidate.text)) { chosen = candidate; break; }
  }
  chosen ||= pool.find(line => !excluded.has(line.text)) || pool.find(line => line.text !== excludeText) || pool[0];

  // Update recent queue
  recentHistory[catKey] = [chosen.text, ...recent].slice(0, Math.min(30, pool.length - 1));
  return chosen;
}

/**
 * Pure 100% offline master catalog engine.
 * No external API endpoints, no third-party HTTP calls, zero unvetted web data.
 */
export function getRandomPickupLine(
  category: CategoryKey = 'all',
  excludeText?: string,
): ApiFetchResult {
  const startTime = performance.now();

  const pool = category !== 'all' 
    ? (LINES_BY_CATEGORY[category]?.length ? LINES_BY_CATEGORY[category] : CURATED_PICKUP_LINES)
    : CURATED_PICKUP_LINES;

  const chosen = pickWithoutRepetition(pool, category, excludeText);
  const latencyMs = Math.max(4, Math.round(performance.now() - startTime));

  return {
    line: chosen,
    apiSource: 'Curated Master Catalog',
    latencyMs,
    isFallback: false,
  };
}

export async function fetchRandomPickupLine(category: CategoryKey = 'all'): Promise<ApiFetchResult> {
  return getRandomPickupLine(category);
}
