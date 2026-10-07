/* Dev-browser smoke test: Get-Content -Raw tests/browser-flows.js | agent-browser eval --stdin */
(async () => {
  const results = [];
  const pause = async (ms = 800) => {
    await new Promise(resolve => setTimeout(resolve, ms));
    // Do not read duplicated IDs/text while AnimatePresence retains an exit card.
    const deadline = performance.now() + 4000;
    while (document.querySelectorAll('.rizz-card-surface').length > 1 && performance.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };
  const check = (condition, label) => { if (!condition) throw new Error(label); results.push(label); };
  const click = selector => { const element = document.querySelector(selector); if (!element) throw new Error(`Missing ${selector}`); element.click(); };
  const cardText = () => document.querySelector('.rizz-card-surface p')?.textContent;
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  const catalog = await import('/src/data/curatedLines.ts');
  const nerdy = [...document.querySelectorAll('.app-shell-surface button')].find(button => button.textContent.includes('Nerdy'));
  nerdy.click(); await pause();
  check(catalog.CATALOG_BY_TEXT.get(cardText())?.category === 'nerdy', 'Category matches card');
  const first = cardText();
  const savedBefore = JSON.parse(localStorage.getItem('pickup_lines_saved_v1') || '[]');
  if (document.querySelector('#save-favorite-btn').getAttribute('aria-label') === 'Save line') click('#save-favorite-btn');
  await pause();
  check(JSON.parse(localStorage.getItem('pickup_lines_saved_v1')).some(line => line.text === first), 'Save persists');
  const beforeVotes = document.querySelector('#react-fire-btn').textContent;
  click('#react-fire-btn'); await pause();
  const voted = document.querySelector('#react-fire-btn').textContent;
  check(voted !== beforeVotes, 'Reaction updates');
  click('#next-line-btn'); await pause();
  check(cardText() !== first, 'Next changes line');
  click('#prev-line-btn'); await pause();
  check(cardText() === first && document.querySelector('#react-fire-btn').textContent === voted, 'Previous restores line and reaction');
  click('#react-fire-btn'); await pause();
  check(document.querySelector('#react-fire-btn').textContent === beforeVotes, 'Reaction toggles back');

  const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  let copied = null;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async value => { copied = value; } } });
  const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  try {
    click('#copy-line-btn'); await pause(100);
    check(copied === first, 'Copy uses correct line');
    copied = null; click('#share-line-btn'); await pause(100);
    check(copied?.includes(first), 'Text share clipboard fallback');
    copied = null;
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Dismissed', 'AbortError'); } });
    click('#share-line-btn'); await pause(100);
    check(copied === null, 'Share cancellation does not copy');
  } finally {
    if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor); else delete navigator.clipboard;
    if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor); else delete navigator.share;
  }
  click('#saved-lines-btn'); await pause();
  check(!!document.querySelector('[role=dialog]') && document.querySelector('[role=dialog]').contains(document.activeElement), 'Saved dialog focuses inside');
  click('#tab-catalog-btn'); await pause();
  check(document.querySelectorAll('.catalog-list-card').length === 60, 'Catalog renders bounded initial page');
  const search = document.querySelector('input[aria-label="Search pickup lines"]');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '60 FPS');
  search.dispatchEvent(new Event('input', { bubbles: true })); await pause();
  check([...document.querySelectorAll('.catalog-list-card')].every(element => element.textContent.includes('60 FPS')), 'Catalog search filters full collection');
  escape(); await pause();
  check(!document.querySelector('[role=dialog]'), 'Escape closes saved dialog');
  click('#icebreaker-preview-btn'); await pause();
  check(!!document.querySelector('#icebreaker-dialog-title'), 'Story dialog opens');
  const generator = await import('/src/utils/storyCardGenerator.ts');
  const line = catalog.CATALOG_BY_TEXT.get(first);
  const blob = await generator.generateStoryCardBlob(line, 'rose');
  const bitmap = await createImageBitmap(blob);
  check(blob.type === 'image/png' && bitmap.width === 1080 && bitmap.height === 1920, 'Story renders actual 1080x1920 PNG');
  bitmap.close();
  escape(); await pause();
  check(!document.querySelector('[role=dialog]') && !document.querySelector('.app-shell-surface').inert, 'Story closes and restores controls');
  check(document.documentElement.scrollWidth <= innerWidth, 'No horizontal page overflow');
  check(document.querySelector('#banner-ad-slot').getBoundingClientRect().height === 50, 'Banner slot remains 50px');
  check(document.fonts.check('600 16px "Plus Jakarta Sans Variable"'), 'Bundled font loaded');
  if (!savedBefore.some(line => line.text === first)) click('#save-favorite-btn');
  return { passed: results.length, checks: results, viewport: [innerWidth, innerHeight], catalogSize: catalog.CURATED_PICKUP_LINES.length };
})()
