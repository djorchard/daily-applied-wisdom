function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Private browsing may block storage. */ }
}

document.querySelectorAll('[data-reaction]').forEach((button) => {
  const key = `daw-reaction-${button.dataset.reaction}`;
  const active = safeStorageGet(key) === 'true';
  button.setAttribute('aria-pressed', String(active));
  button.innerHTML = active ? '<span aria-hidden="true">♥</span> Saved as useful' : '<span aria-hidden="true">♡</span> Save as useful';

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', String(next));
    button.innerHTML = next ? '<span aria-hidden="true">♥</span> Saved as useful' : '<span aria-hidden="true">♡</span> Save as useful';
    safeStorageSet(key, String(next));
  });
});

document.querySelectorAll('[data-share]').forEach((button) => {
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.share-status');
    const shareData = {
      title: button.dataset.shareTitle || document.title,
      text: button.dataset.shareText || document.querySelector('meta[name="description"]')?.content || '',
      url: button.dataset.shareUrl || document.querySelector('link[rel="canonical"]')?.href || location.href
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(shareData.url);
        if (status) status.textContent = 'Link copied.';
      }
    } catch (error) {
      if (error.name !== 'AbortError' && status) status.textContent = 'Sharing was unavailable.';
    }
  });
});

document.querySelectorAll('[data-copy-url]').forEach((button) => {
  button.addEventListener('click', async () => {
    const status = button.parentElement.querySelector('.share-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copyUrl);
      if (status) status.textContent = 'Link copied.';
    } catch {
      if (status) status.textContent = 'Copy was unavailable.';
    }
  });
});

const comments = document.querySelector('#cusdis_thread');
if (comments) {
  const prepareCommentsFrame = (frame) => {
    if (frame.dataset.dawPrepared === 'true') return;
    frame.dataset.dawPrepared = 'true';
    frame.title = `Comments for ${comments.dataset.pageTitle || document.title}`;

    const observedDocuments = new WeakSet();
    const observeContent = () => {
      try {
        const frameDocument = frame.contentDocument;
        const frameRoot = frameDocument?.documentElement;
        if (!frameDocument || !frameRoot || observedDocuments.has(frameDocument)) return;
        observedDocuments.add(frameDocument);

        const syncHeight = () => {
          const contentHeight = Math.max(
            frameDocument.documentElement?.scrollHeight || 0,
            frameDocument.body?.scrollHeight || 0
          );
          if (contentHeight > 0 && Math.abs(frame.getBoundingClientRect().height - contentHeight) > 1) {
            frame.style.height = `${Math.ceil(contentHeight)}px`;
          }
        };

        syncHeight();
        new MutationObserver(syncHeight).observe(frameRoot, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true
        });
        if ('ResizeObserver' in window) new ResizeObserver(syncHeight).observe(frameRoot);
      } catch {
        // The CSS minimum height remains a safe fallback if Cusdis changes iframe isolation.
      }
    };

    frame.addEventListener('load', observeContent);
    observeContent();
    setTimeout(observeContent, 500);
  };

  const prepareCurrentFrame = () => {
    const frame = comments.querySelector('iframe');
    if (frame) prepareCommentsFrame(frame);
  };

  new MutationObserver(prepareCurrentFrame).observe(comments, { childList: true });
  prepareCurrentFrame();
}
