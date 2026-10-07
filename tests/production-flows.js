/* Run against Vite preview, after initial lazy prewarming; safe with browser offline mode. */
(async () => {
  const checks = [];
  const check = (condition, label) => { if (!condition) throw new Error(label); checks.push(label); };
  const pause = (ms = 1000) => new Promise(resolve => setTimeout(resolve, ms));
  const click = selector => { const node = document.querySelector(selector); if (!node) throw new Error(`Missing ${selector}`); node.click(); };
  const lineText = () => [...document.querySelectorAll('.rizz-card-surface')].at(-1)?.querySelector('p').textContent;
  const before = lineText();
  check(!!before, 'Production card renders');
  click('#next-line-btn'); await pause();
  check(lineText() !== before, 'Offline next line');
  click('#prev-line-btn'); await pause();
  check(lineText() === before, 'Offline previous line');
  if (document.querySelector('#save-favorite-btn').getAttribute('aria-label') === 'Save line') click('#save-favorite-btn');
  await pause(300);
  check(JSON.parse(localStorage.getItem('pickup_lines_saved_v1')).some(line => line.text === before), 'Offline save persists');
  click('#saved-lines-btn'); await pause();
  check(!!document.querySelector('[role=dialog]'), 'Offline saved dialog opens');
  click('#tab-catalog-btn'); await pause();
  check(document.querySelectorAll('.catalog-list-card').length === 60, 'Offline catalog loads');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await pause();
  check(!document.querySelector('[role=dialog]'), 'Escape works with non-element event target');
  let sharedImage;
  const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
  const originalCanShare = Object.getOwnPropertyDescriptor(navigator, 'canShare');
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { sharedImage = data.files[0]; } });
  try {
    click('#icebreaker-preview-btn'); await pause();
    check(!!document.querySelector('#icebreaker-dialog-title'), 'Offline story dialog opens');
    const shareButton = [...document.querySelectorAll('[role=dialog] button')].find(button => button.textContent.includes('Share Story Card'));
    if (!shareButton) throw new Error('Story share button missing');
    shareButton.click(); await pause(1800);
    const bitmap = sharedImage && await createImageBitmap(sharedImage);
    check(bitmap?.width === 1080 && bitmap.height === 1920 && sharedImage.type === 'image/png', 'Production offline share sends real 1080x1920 PNG');
    bitmap.close();
  } finally {
    if (originalShare) Object.defineProperty(navigator, 'share', originalShare); else delete navigator.share;
    if (originalCanShare) Object.defineProperty(navigator, 'canShare', originalCanShare); else delete navigator.canShare;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }
  await pause();
  check(document.documentElement.scrollWidth <= innerWidth, 'Production layout fits viewport');
  check(document.querySelector('#banner-ad-slot').getBoundingClientRect().height === 50, 'Production fixed banner space');
  check(document.fonts.check('600 16px "Plus Jakarta Sans Variable"'), 'Production bundled font available offline');
  check(performance.getEntriesByType('resource').every(resource => resource.name.startsWith(location.origin)), 'No remote fonts or content requests');
  return { passed: checks.length, checks, offline: !navigator.onLine };
})()
