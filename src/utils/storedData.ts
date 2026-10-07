import type { PickupLine, RizzReaction } from '../types';
import { CATALOG_BY_ID, CATALOG_BY_TEXT } from '../data/curatedLines';
import { isCorruptedText, sanitizePickupLine } from './textSanitizer';

export type ReactionCounts = { fire: number; cheesy: number; cringe: number };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function validateSaved(value: unknown): PickupLine[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: PickupLine[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.text !== 'string' || isCorruptedText(item.text)) continue;
    const clean = sanitizePickupLine({
      id: typeof item.id === 'string' ? item.id : `saved-${result.length}`,
      text: item.text, category: typeof item.category === 'string' ? item.category as PickupLine['category'] : 'smooth',
      source: typeof item.source === 'string' ? item.source : 'Saved',
      deliveryTip: typeof item.deliveryTip === 'string' ? item.deliveryTip : undefined,
    });
    const canonical = CATALOG_BY_TEXT.get(clean.text) || clean;
    if (!seen.has(canonical.text)) { seen.add(canonical.text); result.push(canonical); }
  }
  return result;
}

function canonicalId(id: string): string {
  return CATALOG_BY_ID.has(id) ? id : id.replace(/-\d{13}$/, '');
}

export function validateReactions(value: unknown): Record<string, RizzReaction> {
  if (!isRecord(value)) return {};
  const result: Record<string, RizzReaction> = {};
  for (const [id, reaction] of Object.entries(value)) {
    const key = canonicalId(id);
    if (CATALOG_BY_ID.has(key) && ['fire', 'cheesy', 'cringe'].includes(String(reaction))) {
      result[key] = reaction as RizzReaction;
    }
  }
  return result;
}

export function validateCounts(value: unknown): Record<string, ReactionCounts> {
  if (!isRecord(value)) return {};
  const result: Record<string, ReactionCounts> = {};
  for (const [id, counts] of Object.entries(value)) {
    const key = canonicalId(id);
    if (!CATALOG_BY_ID.has(key) || !isRecord(counts)) continue;
    const valid = ['fire', 'cheesy', 'cringe'].every(key =>
      typeof counts[key] === 'number' && Number.isSafeInteger(counts[key]) && (counts[key] as number) >= 0
    );
    if (valid) result[key] = counts as ReactionCounts;
  }
  return result;
}
