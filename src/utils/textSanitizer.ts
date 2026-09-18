import { CategoryKey, PickupLine } from '../types';

/**
 * Intelligent keywords to accurately identify category and prevent mislabeling
 * (e.g. preventing tech/nerd jokes from ever being marked as "SMOOTH").
 */
const NERDY_PATTERNS = [
  /#([0-9a-fA-F]{3,6})/,
  /\b(base are belong|unzip|files?|bytes?|bits?|ram|cpu|gpu|algorithm|wifi|bluetooth|usb|sql|database|query|compiler|server|cache|git|root|linux|kernel|matrix|quantum|physics|enzyme|dna|helicase|derivative|integral|pi|tangent|sine|cosine|html|css|javascript|typescript|python|c\+\+|binary|ip address|firewall|router|syntax|variable|function|boolean|loop|debugger|404|ssh|terminal)\b/i,
];

const FOODIE_PATTERNS = [
  /\b(pizza|taco|burger|coffee|espresso|latte|tea|cheese|wine|beer|cocktail|donut|doughnut|cookie|cake|chocolate|sushi|pasta|noodle|spicy|sweet|flavor|cinnamon|honey|bread|bakery|snack|muffin|waffle|pancake|bacon|avocado|guacamole)\b/i,
];

const CHEESY_PATTERNS = [
  /\b(did it hurt|heaven|angel|map|lost|parking ticket|fine|bandaid|bruise|sugar|sweet|spark|lightbulb|gravity|sun|stars|constellation|shooting star|fineapple)\b/i,
];

const ROMANTIC_PATTERNS = [
  /\b(forever|soul|eyes|heart|breathe|breath away|fall in love|destiny|fate|dream|stars|universe|cherish|hold you|gorgeous|stunning|beautiful)\b/i,
];

const FUNNY_PATTERNS = [
  /\b(laugh|joke|warning|trouble|arrest|illegal|crime|weird|awkward|sorry|excuse me|parents|confused)\b/i,
];

/**
 * Detects if a line is corrupted, contains hex codes, unescaped entities,
 * or has merged unrelated sentences.
 */
export function isCorruptedText(text: string): boolean {
  if (!text || typeof text !== 'string') return true;
  const trimmed = text.trim();

  // Too short or too long
  if (trimmed.length < 12 || trimmed.length > 320) return true;

  // Hex color codes (e.g. #ff0000, #0000ff)
  if (/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/.test(trimmed)) return true;

  // HTML entities or tags
  if (/&[a-z]{2,8};/i.test(trimmed) || /<[^>]+>/.test(trimmed)) return true;

  // Unresolved placeholders (e.g. [name], <name>, {name})
  if (/\[name\]|\{name\}|<name>|\[insert\]/i.test(trimmed)) return true;

  // Glitched punctuation merging: e.g. "you.Need me to unzip"
  // If it contains "all my base are belong to you" or similar known scraper spam
  if (/all (my|your) base are belong/i.test(trimmed)) return true;

  return false;
}

/**
 * Clean and format any pickup line text to ensure pristine typography:
 * - Fixes missing spaces after sentence punctuation (. ? ! , ; :)
 * - Fixes quote typos (e.g. I”ll -> I'll)
 * - Fixes duplicate words (e.g. with with -> with)
 * - Ensures initial capitalization
 * - Ensures proper closing punctuation
 */
export function cleanLineText(rawText: string): string {
  if (!rawText) return '';

  let cleaned = rawText
    .replace(/\s+/g, ' ')
    .trim();

  // 1. Fix missing space after terminal punctuation (e.g. "you.Need" -> "you. Need")
  cleaned = cleaned.replace(/([.!?])([A-Za-z])/g, '$1 $2');

  // 2. Fix missing space after mid-sentence punctuation (e.g. "lonely,would" -> "lonely, would")
  cleaned = cleaned.replace(/([,;:])([A-Za-z])/g, '$1 $2');

  // 3. Fix misplaced closing quote typography: e.g. I”ll -> I'll
  cleaned = cleaned.replace(/([A-Za-z])”([A-Za-z])/g, "$1'$2");
  cleaned = cleaned.replace(/([A-Za-z])“([A-Za-z])/g, "$1'$2");

  // 4. Remove accidental duplicate words (e.g. "with with" -> "with")
  cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // 5. Remove lingering template brackets
  cleaned = cleaned.replace(/\[name\]/gi, '').replace(/\s{2,}/g, ' ');

  // 6. Ensure initial letter is capitalized
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // 7. Ensure clean ending punctuation if missing
  if (cleaned.length > 0 && !/[.!?”"]$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned.trim();
}

/**
 * Determines the true, accurate category for a line,
 * ensuring tech/code lines are NEVER falsely labeled as "SMOOTH".
 */
export function resolveAccurateCategory(
  text: string,
  suggestedCategory?: string
): CategoryKey {
  const normCat = (suggestedCategory || '').toLowerCase().trim();

  // Check Nerdy patterns first (strict guard against mislabeling)
  for (const pattern of NERDY_PATTERNS) {
    if (pattern.test(text)) return 'nerdy';
  }

  // Check Foodie patterns
  for (const pattern of FOODIE_PATTERNS) {
    if (pattern.test(text)) return 'foodie';
  }

  // If the suggested category is already valid and specific, keep it
  const validSpecific: CategoryKey[] = [
    'smooth',
    'cheesy',
    'nerdy',
    'romantic',
    'funny',
    'foodie',
    'clever',
  ];

  if (validSpecific.includes(normCat as CategoryKey) && normCat !== 'all') {
    return normCat as CategoryKey;
  }

  // Heuristic fallbacks for ambiguous inputs
  for (const pattern of CHEESY_PATTERNS) {
    if (pattern.test(text)) return 'cheesy';
  }

  for (const pattern of ROMANTIC_PATTERNS) {
    if (pattern.test(text)) return 'romantic';
  }

  for (const pattern of FUNNY_PATTERNS) {
    if (pattern.test(text)) return 'funny';
  }

  return 'smooth';
}

/**
 * Sanitizes a complete PickupLine object.
 */
export function sanitizePickupLine(line: PickupLine): PickupLine {
  const cleanedText = cleanLineText(line.text);
  const accurateCat = resolveAccurateCategory(cleanedText, line.category);

  return {
    ...line,
    text: cleanedText,
    category: accurateCat,
  };
}
