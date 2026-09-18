import { PickupLine } from '../types';
import { CATEGORIES } from '../data/curatedLines';
import { cleanLineText, resolveAccurateCategory } from './textSanitizer';

export interface StoryThemeConfig {
  id: string;
  name: string;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  cardGradStart: string;
  cardGradEnd: string;
  cardBorder: string;
  badgeBg: string;
  badgeText: string;
  accentColor: string;
  glowColor: string;
}

export const STORY_THEMES: Record<string, StoryThemeConfig> = {
  rose: {
    id: 'rose',
    name: 'Rose',
    bgGradStart: '#200512',
    bgGradMid: '#12040d',
    bgGradEnd: '#09090b',
    cardGradStart: '#2d0819',
    cardGradEnd: '#13040e',
    cardBorder: 'rgba(244, 63, 94, 0.45)',
    badgeBg: 'rgba(244, 63, 94, 0.25)',
    badgeText: '#fda4af',
    accentColor: '#fb7185',
    glowColor: 'rgba(244, 63, 94, 0.35)',
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    bgGradStart: '#18042b',
    bgGradMid: '#0e021c',
    bgGradEnd: '#09090b',
    cardGradStart: '#260945',
    cardGradEnd: '#100320',
    cardBorder: 'rgba(168, 85, 247, 0.45)',
    badgeBg: 'rgba(168, 85, 247, 0.25)',
    badgeText: '#d8b4fe',
    accentColor: '#c084fc',
    glowColor: 'rgba(168, 85, 247, 0.35)',
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    bgGradStart: '#260d03',
    bgGradMid: '#170601',
    bgGradEnd: '#09090b',
    cardGradStart: '#3d1606',
    cardGradEnd: '#180702',
    cardBorder: 'rgba(245, 158, 11, 0.45)',
    badgeBg: 'rgba(245, 158, 11, 0.25)',
    badgeText: '#fde68a',
    accentColor: '#fbbf24',
    glowColor: 'rgba(245, 158, 11, 0.35)',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    bgGradStart: '#021f16',
    bgGradMid: '#02120d',
    bgGradEnd: '#09090b',
    cardGradStart: '#053023',
    cardGradEnd: '#02140e',
    cardBorder: 'rgba(16, 185, 129, 0.45)',
    badgeBg: 'rgba(16, 185, 129, 0.25)',
    badgeText: '#6ee7b7',
    accentColor: '#34d399',
    glowColor: 'rgba(16, 185, 129, 0.35)',
  },
};

const RIZZ_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" fill="none">
  <defs>
    <linearGradient id="rizzHeartMainGrad" x1="88" y1="15" x2="30" y2="82" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFA185" />
      <stop offset="25%" stop-color="#FF4B7E" />
      <stop offset="65%" stop-color="#E6007A" />
      <stop offset="100%" stop-color="#870068" />
    </linearGradient>
    <linearGradient id="rizzGlossHighlight" x1="36" y1="20" x2="46" y2="38" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.75" />
      <stop offset="40%" stop-color="#FFFFFF" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.0" />
    </linearGradient>
  </defs>
  <rect x="19" y="33" width="9" height="3.5" rx="1.75" fill="#FF3B7A" transform="rotate(-28 23.5 34.75)" />
  <rect x="21" y="43" width="8.5" height="3.5" rx="1.75" fill="#FF4F7E" transform="rotate(-38 25.25 44.75)" />
  <rect x="27" y="51" width="7.5" height="3.2" rx="1.6" fill="#D6186E" transform="rotate(-48 30.75 52.6)" />
  <path d="M 54 28.5 C 56.5 24 62.5 19 72 19 C 83 19 89 27 89 38 C 89 51 77 61 61.5 68.5 C 58 70.2 55 71 52.5 71.2 C 49.5 71 45 68.5 42.5 66.5 L 35.5 73.8 C 34.4 74.8 32.8 74.2 33 72.8 L 35.2 62.2 C 30 56.5 26.5 48 26.5 38 C 26.5 27 32.5 19 43.5 19 C 49.5 19 52.5 24 54 28.5 Z" fill="url(#rizzHeartMainGrad)" />
  <path d="M 32 37 C 30.5 30 34 22 43 21 C 47.5 21 50 23 51.5 26 C 47 23.5 41 24.5 37 28 C 34 30.8 32.8 34 32.5 37.5 Z" fill="url(#rizzGlossHighlight)" />
  <ellipse cx="40" cy="27" rx="7" ry="3.8" transform="rotate(-35 40 27)" fill="url(#rizzGlossHighlight)" />
  <circle cx="45" cy="44" r="3.6" fill="#FFFFFF" />
  <circle cx="54" cy="44" r="3.6" fill="#FFFFFF" />
  <circle cx="63" cy="44" r="3.6" fill="#FFFFFF" />
</svg>`;

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Generates a pristine 1080x1920 Instagram / WhatsApp Story card image as a PNG Blob.
 */
export async function generateStoryCardBlob(
  line: PickupLine,
  themeId: string = 'rose'
): Promise<Blob> {
  const theme = STORY_THEMES[themeId] || STORY_THEMES.rose;
  const cleanedText = cleanLineText(line.text);
  const accurateCategory = resolveAccurateCategory(cleanedText, line.category);

  const categoryObj = CATEGORIES.find(c => c.id === accurateCategory) || {
    label: accurateCategory.toUpperCase(),
    emoji: '🔥',
  };

  const width = 1080;
  const height = 1920;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  // Ensure fonts are ready
  try {
    if (document.fonts) {
      await document.fonts.ready;
    }
  } catch {
    // Continue with fallback font
  }

  // 1. Canvas Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgGradStart);
  bgGrad.addColorStop(0.5, theme.bgGradMid);
  bgGrad.addColorStop(1, theme.bgGradEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Atmosphere Glow Blobs
  const glow1 = ctx.createRadialGradient(260, 420, 10, 260, 420, 450);
  glow1.addColorStop(0, theme.glowColor);
  glow1.addColorStop(1, 'transparent');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, width, 1000);

  const glow2 = ctx.createRadialGradient(820, 1400, 10, 820, 1400, 500);
  glow2.addColorStop(0, theme.glowColor);
  glow2.addColorStop(1, 'transparent');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 900, width, 1000);

  // 3. Top Story Header
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '700 24px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText('RIZZLINE • DAILY STORY DECK', width / 2, 180);
  ctx.restore();

  // 4. Center Story Card Dimensions
  const cardX = 90;
  const cardY = 280;
  const cardW = 900;
  const cardH = 1320;
  const cardR = 56;

  // Card Outer Shadow / Glow
  ctx.save();
  ctx.shadowColor = theme.glowColor;
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;

  // Card Background Gradient
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  cardGrad.addColorStop(0, theme.cardGradStart);
  cardGrad.addColorStop(1, theme.cardGradEnd);
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.restore();

  // Card Inner Border
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = theme.cardBorder;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
  ctx.stroke();
  ctx.restore();

  // 5. Card Header: Category Badge + Sparkle
  const badgeY = cardY + 70;
  const badgeText = `${categoryObj.emoji} ${accurateCategory.toUpperCase()}`;
  ctx.font = '700 26px system-ui, -apple-system, sans-serif';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgeW = badgeMetrics.width + 50;
  const badgeH = 54;
  const badgeX = cardX + 70;

  // Badge background pill
  ctx.save();
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 27);
  ctx.fillStyle = theme.badgeBg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = theme.cardBorder;
  ctx.stroke();

  // Badge text
  ctx.fillStyle = theme.badgeText;
  ctx.font = '700 26px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, badgeX + 25, badgeY + badgeH / 2 + 1);
  ctx.restore();

  // Card top right accent symbol
  ctx.save();
  ctx.fillStyle = theme.accentColor;
  ctx.font = '28px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('✨', cardX + cardW - 70, badgeY + 36);
  ctx.restore();

  // 6. Decorative Giant Quotation Mark in Background
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.font = 'bold 360px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('“', cardX + 50, cardY + 440);
  ctx.restore();

  // 7. Dynamic Quotation Text Rendering (Wrapped & Centered)
  ctx.save();
  const maxTextWidth = cardW - 140;
  let fontSize = 54;
  if (cleanedText.length > 180) fontSize = 38;
  else if (cleanedText.length > 130) fontSize = 42;
  else if (cleanedText.length > 80) fontSize = 48;

  ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  let wrapped = wrapLines(ctx, `“${cleanedText}”`, maxTextWidth);

  // If still too long, scale down gracefully
  while (wrapped.length > 7 && fontSize > 32) {
    fontSize -= 4;
    ctx.font = `600 ${fontSize}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
    wrapped = wrapLines(ctx, `“${cleanedText}”`, maxTextWidth);
  }

  const lineHeight = Math.round(fontSize * 1.42);
  const totalTextHeight = wrapped.length * lineHeight;

  // Position vertically centered in card content zone
  const contentCenterY = cardY + 620;
  let startY = contentCenterY - totalTextHeight / 2 + fontSize / 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;

  for (let i = 0; i < wrapped.length; i++) {
    ctx.fillText(wrapped[i], cardX + cardW / 2, startY + i * lineHeight);
  }
  ctx.restore();

  // 8. Delivery Tip Card Box (if available)
  if (line.deliveryTip) {
    const tipBoxY = cardY + cardH - 240;
    const tipBoxH = 90;
    const tipBoxX = cardX + 70;
    const tipBoxW = cardW - 140;

    ctx.save();
    roundRect(ctx, tipBoxX, tipBoxY, tipBoxW, tipBoxH, 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    ctx.fillStyle = '#fcd34d'; // Amber tip icon
    ctx.font = '22px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💡', tipBoxX + 24, tipBoxY + 54);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '500 22px system-ui, -apple-system, sans-serif';
    const tipText = line.deliveryTip.length > 58
      ? line.deliveryTip.slice(0, 56) + '...'
      : line.deliveryTip;
    ctx.fillText(`Pro-Tip: ${tipText}`, tipBoxX + 64, tipBoxY + 52);
    ctx.restore();
  }

  // 9. Card Footer: Logo Emblem + Brand Lockup + Catalog Count
  const footerY = cardY + cardH - 95;

  // Divider Line inside card
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cardX + 70, cardY + cardH - 120);
  ctx.lineTo(cardX + cardW - 70, cardY + cardH - 120);
  ctx.stroke();
  ctx.restore();

  // Draw Logo SVG Emblem
  try {
    const logoImg = await loadSvgImage(RIZZ_LOGO_SVG);
    ctx.drawImage(logoImg, cardX + 70, footerY - 24, 48, 48);
  } catch {
    // Fallback: draw glowing heart symbol
    ctx.save();
    ctx.fillStyle = '#FF4B7E';
    ctx.font = '32px system-ui, sans-serif';
    ctx.fillText('❤️', cardX + 75, footerY + 12);
    ctx.restore();
  }

  // Wordmark "RizzLine"
  ctx.save();
  ctx.font = '800 32px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText('Rizz', cardX + 130, footerY + 12);
  const rizzWidth = ctx.measureText('Rizz').width;

  ctx.fillStyle = '#FB7185';
  ctx.fillText('Line', cardX + 130 + rizzWidth, footerY + 12);

  // Right side catalog badge
  ctx.font = '600 22px "JetBrains Mono", monospace, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.textAlign = 'right';
  ctx.fillText('1,460+ Master Catalog', cardX + cardW - 70, footerY + 10);
  ctx.restore();

  // 10. Bottom Story Callout
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '700 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('GET UNLIMITED VIBES ON RIZZLINE', width / 2, 1780);
  ctx.restore();

  // Convert to PNG Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export canvas image to PNG blob'));
    }, 'image/png');
  });
}

/**
 * Triggers a direct PNG download of the story card.
 */
export async function downloadStoryCard(
  line: PickupLine,
  themeId: string = 'rose'
): Promise<void> {
  const blob = await generateStoryCardBlob(line, themeId);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const safeFilename = `rizzline-${line.category}-${line.id.replace(/[^a-zA-Z0-9]/g, '')}-story.png`;
  anchor.href = url;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Shares the actual Story Card IMAGE file via Web Share API.
 * Falls back gracefully to downloading the PNG image if file sharing is unsupported.
 */
export async function shareStoryCard(
  line: PickupLine,
  themeId: string = 'rose'
): Promise<'shared' | 'downloaded'> {
  const blob = await generateStoryCardBlob(line, themeId);
  const safeFilename = `rizzline-${line.category}-story.png`;
  const file = new File([blob], safeFilename, { type: 'image/png' });

  // 1. Check if native file sharing is supported
  const nav = navigator as any;
  if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
    try {
      await nav.share({
        files: [file],
        title: 'RizzLine Story Card',
        text: `"${line.text}"\n\n— via RizzLine`,
      });
      return 'shared';
    } catch (err: any) {
      // If user aborted or dismissed the share dialog, do not force download
      if (err?.name === 'AbortError') {
        return 'shared';
      }
      // If sharing file failed (e.g. system rejected), fallback to direct download
      console.warn('File share rejected, downloading image fallback', err);
    }
  }

  // 2. Direct PNG Download Fallback
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = safeFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
