const CLARITY_PROJECT_ID = 'y1mr2l6g3q';
const ANALYTICS_CONSENT_KEY = 'daw-clarity-consent';
const clarityDisabledOnPage = document.body.classList.contains('saved-page');

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return localStorage.getItem(key) === value;
  } catch {
    return false;
  }
}

function safeStorageRemove(key) {
  try {
    localStorage.removeItem(key);
    return localStorage.getItem(key) === null;
  } catch {
    return false;
  }
}

function savedIdeaState(id) {
  const key = `daw-saved-${id}`;
  const current = safeStorageGet(key);
  if (current === 'true') return true;
  if (current === 'false') safeStorageRemove(key);

  const legacyKey = `daw-reaction-${id}`;
  const legacySaved = safeStorageGet(legacyKey) === 'true';
  if (legacySaved && safeStorageSet(key, 'true')) safeStorageRemove(legacyKey);
  return legacySaved;
}

function writeSavedIdea(id, saved) {
  const key = `daw-saved-${id}`;
  const legacyKey = `daw-reaction-${id}`;
  if (saved) {
    const stored = safeStorageSet(key, 'true');
    if (stored) safeStorageRemove(legacyKey);
    return stored;
  }
  return safeStorageRemove(key) && safeStorageRemove(legacyKey);
}

function ideaActionStatus(button, message) {
  const status = button.closest('.idea-actions')?.querySelector('.idea-action-status');
  if (status) status.textContent = message;
}

function renderSaveButton(button, saved) {
  const ideaNumber = button.dataset.ideaNumber;
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', saved
    ? `Remove Idea ${ideaNumber} from saved ideas in this browser`
    : `Save Idea ${ideaNumber} for later in this browser`);
  button.innerHTML = saved
    ? '<span aria-hidden="true">♥</span> Remove saved idea'
    : '<span aria-hidden="true">♡</span> Save idea for later';
}

document.querySelectorAll('[data-save-id]').forEach((button) => {
  const id = button.dataset.saveId;
  renderSaveButton(button, savedIdeaState(id));

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    if (!writeSavedIdea(id, next)) {
      ideaActionStatus(button, next
        ? 'Idea was not saved because browser storage is unavailable.'
        : 'Saved idea was not removed because browser storage is unavailable.');
      return;
    }
    renderSaveButton(button, next);
    ideaActionStatus(button, next ? 'Idea saved for later.' : 'Idea removed from saved ideas.');
  });
});

function ensureClarityQueue() {
  window.clarity = window.clarity || function clarityQueue() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
}

function sendClarityConsent(choice) {
  ensureClarityQueue();
  window.clarity('consentv2', {
    ad_Storage: 'denied',
    analytics_Storage: choice === 'granted' ? 'granted' : 'denied'
  });
}

let clarityLoadPromise;
function loadClarity(choice) {
  if (clarityDisabledOnPage) return Promise.reject(new Error('Analytics is disabled on the Saved ideas page.'));
  ensureClarityQueue();
  sendClarityConsent(choice);
  if (document.querySelector('script[data-daw-clarity]')) return clarityLoadPromise || Promise.resolve();

  clarityLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.dataset.dawClarity = 'true';
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`;
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', () => {
      script.remove();
      clarityLoadPromise = null;
      reject(new Error('Microsoft Clarity did not load.'));
    }, { once: true });
    document.head.append(script);
  });
  return clarityLoadPromise;
}

function renderUsefulButton(button, marked) {
  const ideaNumber = button.dataset.ideaNumber;
  button.disabled = marked;
  button.setAttribute('aria-label', marked
    ? `Idea ${ideaNumber} marked useful`
    : `Mark Idea ${ideaNumber} as useful`);
  button.removeAttribute('aria-pressed');
  button.innerHTML = marked
    ? '<span aria-hidden="true">✓</span> Marked useful'
    : '<span aria-hidden="true">👍</span> Mark idea useful';
}

document.querySelectorAll('[data-useful-id]').forEach((button) => {
  const id = button.dataset.usefulId;
  const key = `daw-useful-${id}`;
  renderUsefulButton(button, safeStorageGet(key) === 'true');

  button.addEventListener('click', async () => {
    if (safeStorageGet(key) === 'true') return;
    if (!safeStorageSet(key, 'true')) {
      ideaActionStatus(button, 'Reaction was not sent because browser storage is unavailable.');
      return;
    }

    button.disabled = true;
    button.setAttribute('aria-label', `Sending useful reaction for Idea ${button.dataset.ideaNumber}`);
    button.innerHTML = '<span aria-hidden="true">…</span> Sending reaction';
    try {
      const consent = safeStorageGet(ANALYTICS_CONSENT_KEY) === 'granted' ? 'granted' : 'denied';
      await loadClarity(consent);
      window.clarity('set', 'dawBook', button.dataset.lessonSlug);
      window.clarity('set', 'dawIdea', id);
      window.clarity('event', button.dataset.clarityEvent);
      renderUsefulButton(button, true);
      ideaActionStatus(button, 'Thanks. This idea is marked useful.');
    } catch {
      safeStorageRemove(key);
      renderUsefulButton(button, false);
      ideaActionStatus(button, 'Reaction was not sent. Check your connection and try again.');
    }
  });
});

function refreshSavedIdeas(statusMessage = '') {
  const cards = [...document.querySelectorAll('[data-saved-card]')];
  if (!cards.length) return;
  let count = 0;
  cards.forEach((card) => {
    const saved = savedIdeaState(card.dataset.savedId);
    card.hidden = !saved;
    if (saved) count += 1;
  });
  const grid = document.querySelector('[data-saved-grid]');
  const empty = document.querySelector('[data-saved-empty]');
  const countLabel = document.querySelector('[data-saved-count]');
  if (grid) grid.hidden = count === 0;
  if (empty) empty.hidden = count !== 0;
  if (countLabel) {
    const countMessage = `${count} saved ${count === 1 ? 'idea' : 'ideas'} in this browser.`;
    countLabel.textContent = statusMessage ? `${statusMessage} ${countMessage}` : countMessage;
  }
}

document.querySelectorAll('[data-remove-saved]').forEach((button) => {
  button.addEventListener('click', () => {
    const card = button.closest('[data-saved-card]');
    const visibleCards = [...document.querySelectorAll('[data-saved-card]:not([hidden])')];
    const removedIndex = visibleCards.indexOf(card);
    const ideaTitle = card?.querySelector('h2')?.textContent?.trim() || 'Saved idea';
    if (!writeSavedIdea(button.dataset.removeSaved, false)) {
      const countLabel = document.querySelector('[data-saved-count]');
      if (countLabel) countLabel.textContent = 'Saved idea was not removed because browser storage is unavailable.';
      return;
    }
    refreshSavedIdeas(`${ideaTitle} removed.`);
    const remainingCards = [...document.querySelectorAll('[data-saved-card]:not([hidden])')];
    const nextCard = remainingCards[Math.min(Math.max(removedIndex, 0), remainingCards.length - 1)];
    if (nextCard) nextCard.querySelector('[data-remove-saved], a')?.focus();
    else document.querySelector('[data-saved-empty]')?.focus();
  });
});

refreshSavedIdeas();
window.addEventListener('storage', () => refreshSavedIdeas());

const analyticsBanner = document.querySelector('[data-analytics-consent]');
const storedAnalyticsChoice = safeStorageGet(ANALYTICS_CONSENT_KEY);
if (storedAnalyticsChoice === 'granted' && !clarityDisabledOnPage) loadClarity('granted').catch(() => {});
else if (!['granted', 'denied'].includes(storedAnalyticsChoice) && analyticsBanner) analyticsBanner.hidden = false;

function chooseAnalytics(choice) {
  safeStorageSet(ANALYTICS_CONSENT_KEY, choice);
  if (analyticsBanner) analyticsBanner.hidden = true;
  if (choice === 'granted') loadClarity('granted').catch(() => {
    if (analyticsBanner) analyticsBanner.hidden = false;
  });
  else if (window.clarity) {
    sendClarityConsent('denied');
    location.reload();
  }
}

document.querySelector('[data-analytics-allow]')?.addEventListener('click', () => chooseAnalytics('granted'));
document.querySelector('[data-analytics-reject]')?.addEventListener('click', () => chooseAnalytics('denied'));
document.querySelector('[data-analytics-reset]')?.addEventListener('click', () => {
  safeStorageRemove(ANALYTICS_CONSENT_KEY);
  if (window.clarity) {
    sendClarityConsent('denied');
    location.reload();
  } else if (analyticsBanner) analyticsBanner.hidden = false;
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
  const cusdisTheme = `
    :root { color-scheme: light; }
    *, *::before, *::after { box-sizing: border-box; }
    body { color: #18211d !important; font-family: Manrope, Arial, sans-serif !important; }
    input[type="text"], input[type="email"], textarea {
      min-height: 48px;
      background: #fffdf8 !important;
      border: 2px solid #53615a !important;
      border-radius: 6px !important;
      color: #18211d !important;
      caret-color: #18211d;
      box-shadow: none !important;
    }
    textarea { min-height: 128px; }
    input[type="text"]:hover, input[type="email"]:hover, textarea:hover {
      border-color: #18211d !important;
    }
    input[type="text"]:focus, input[type="email"]:focus, textarea:focus {
      border-color: #b54424 !important;
      outline: 3px solid #b54424 !important;
      outline-offset: 2px !important;
    }
    input::placeholder, textarea::placeholder { color: #53615a !important; opacity: 1; }
    button {
      min-height: 44px;
      padding: 10px 18px !important;
      background: #18211d !important;
      border: 2px solid #18211d !important;
      border-radius: 6px !important;
      color: #fffdf8 !important;
      cursor: pointer;
      font: 700 14px Manrope, Arial, sans-serif !important;
    }
    button:hover { background: #b54424 !important; border-color: #b54424 !important; }
    button:focus-visible {
      outline: 3px solid #b54424 !important;
      outline-offset: 3px !important;
    }
    a { color: #79301d !important; text-underline-offset: 3px; }
  `;

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

        const applyTheme = () => {
          if (frameDocument.getElementById('daw-cusdis-theme')) return;
          const style = frameDocument.createElement('style');
          style.id = 'daw-cusdis-theme';
          style.textContent = cusdisTheme;
          (frameDocument.head || frameRoot).append(style);
        };

        const syncHeight = () => {
          const contentHeight = Math.max(
            frameDocument.documentElement?.scrollHeight || 0,
            frameDocument.body?.scrollHeight || 0
          );
          if (contentHeight > 0 && Math.abs(frame.getBoundingClientRect().height - contentHeight) > 1) {
            frame.style.height = `${Math.ceil(contentHeight)}px`;
          }
        };

        applyTheme();
        syncHeight();
        new MutationObserver(() => {
          applyTheme();
          syncHeight();
        }).observe(frameRoot, {
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
