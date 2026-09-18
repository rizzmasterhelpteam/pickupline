import { ApiFetchResult, CategoryKey, PickupLine } from '../types';
import { CURATED_PICKUP_LINES, LINES_BY_CATEGORY } from '../data/curatedLines';
import { sanitizePickupLine } from '../utils/textSanitizer';

// Anti-repetition queue per category to ensure variety
const recentHistory: Record<string, string[]> = {};

function pickWithoutRepetition(pool: PickupLine[], catKey: string): PickupLine {
  if (pool.length <= 1) return pool[0];

  const recent = recentHistory[catKey] || [];
  // Filter out the last 30 seen lines in this category
  const available = pool.filter(l => !recent.includes(l.text));
  const candidatePool = available.length > 5 ? available : pool;

  const chosen = candidatePool[Math.floor(Math.random() * candidatePool.length)];

  // Update recent queue
  recentHistory[catKey] = [chosen.text, ...recent.slice(0, 30)];
  return chosen;
}

/**
 * Pure 100% offline master catalog engine.
 * No external API endpoints, no third-party HTTP calls, zero unvetted web data.
 */
export async function fetchRandomPickupLine(
  category: CategoryKey = 'all'
): Promise<ApiFetchResult> {
  const startTime = performance.now();

  const pool = category !== 'all' 
    ? (LINES_BY_CATEGORY[category] || CURATED_PICKUP_LINES)
    : CURATED_PICKUP_LINES;

  const chosen = sanitizePickupLine(pickWithoutRepetition(pool, category));
  const latencyMs = Math.max(4, Math.round(performance.now() - startTime));

  return {
    line: {
      ...chosen,
      id: `${chosen.id}-${Date.now()}`,
      timestamp: Date.now(),
    },
    apiSource: 'Curated Master Catalog',
    latencyMs,
    isFallback: false,
  };
}
