const lessonKey = 'daw-thinking-in-systems-2026-08-13';

document.querySelectorAll('[data-reaction]').forEach((reaction) => {
  const button = reaction.querySelector('.thumb');
  const count = reaction.querySelector('.count');
  const key = `${lessonKey}-${reaction.dataset.reaction}`;
  const active = localStorage.getItem(key) === 'true';
  button.setAttribute('aria-pressed', active);
  count.textContent = active ? '1' : '0';
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', next);
    count.textContent = next ? '1' : '0';
    localStorage.setItem(key, String(next));
  });
});

document.querySelector('[data-share]').addEventListener('click', async () => {
  const status = document.querySelector('#share-status');
  const share = { title: 'Daily Applied Wisdom', text: 'Three ideas from Thinking in Systems worth carrying into your work and life.', url: location.href };
  try {
    if (navigator.share) await navigator.share(share);
    else { await navigator.clipboard.writeText(location.href); status.textContent = 'Link copied.'; }
  } catch (error) { if (error.name !== 'AbortError') status.textContent = 'Could not open sharing.'; }
});
