/* Run in agent-browser before a mouse drag; inspect window.__swipeCheck afterward. */
window.__swipeObserver?.disconnect();
window.__swipeCheck = { before: document.querySelector('.rizz-card-surface p').textContent, entries: [] };
window.__swipeObserver = new MutationObserver(records => {
  for (const record of records) for (const node of record.addedNodes) {
    if (!(node instanceof HTMLElement)) continue;
    const card = node.querySelector('.rizz-card-surface');
    if (card) window.__swipeCheck.entries.push({ text: card.querySelector('p').textContent, transform: node.style.transform });
  }
});
window.__swipeObserver.observe(document.querySelector('.card-stage'), { childList: true });
'Swipe capture ready';
