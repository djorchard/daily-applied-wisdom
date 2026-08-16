const CLARITY_PROJECT_ID = 'y1mr2l6g3q';
const ANALYTICS_CONSENT_KEY = 'daw-clarity-consent';
const clarityDisabledOnPage = document.body.classList.contains('saved-page');

const libraryControls = document.querySelector('[data-library-controls]');
if (libraryControls) {
  const PAGE_SIZE = 10;
  const cards = [...document.querySelectorAll('[data-library-card]')];
  const searchInput = libraryControls.querySelector('[data-library-search]');
  const categorySelect = libraryControls.querySelector('[data-library-category]');
  const progressSelect = libraryControls.querySelector('[data-library-progress]');
  const clearButton = libraryControls.querySelector('[data-library-clear]');
  const resultsBar = document.querySelector('[data-library-results-bar]');
  const status = document.querySelector('[data-library-status]');
  const empty = document.querySelector('[data-library-empty]');
  const emptyClear = document.querySelector('[data-library-empty-clear]');
  const pagination = document.querySelector('[data-library-pagination]');
  const previous = pagination?.querySelector('[data-library-previous]');
  const next = pagination?.querySelector('[data-library-next]');
  const pages = pagination?.querySelector('[data-library-pages]');
  let currentPage = 1;

  const normalizeLibraryText = (value) => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en');

  const libraryItems = cards.map((card) => {
    let categories = [];
    try { categories = JSON.parse(card.dataset.libraryCategories || '[]'); } catch { categories = []; }
    return {
      card,
      slug: card.dataset.librarySlug,
      categories: categories.map(normalizeLibraryText),
      search: normalizeLibraryText(card.dataset.librarySearch)
    };
  });

  const pageSequence = (totalPages) => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
    const numberedPages = [...new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages]
      .filter((page) => page >= 1 && page <= totalPages))]
      .sort((left, right) => left - right);
    const sequence = [];
    numberedPages.forEach((page, index) => {
      if (index > 0 && page - numberedPages[index - 1] > 1) sequence.push('ellipsis');
      sequence.push(page);
    });
    return sequence;
  };

  const renderPagination = (totalPages) => {
    if (!pagination || !pages || !previous || !next) return;
    pagination.hidden = totalPages <= 1;
    previous.disabled = currentPage === 1;
    next.disabled = currentPage === totalPages;
    pages.replaceChildren();

    pageSequence(totalPages).forEach((page) => {
      const item = document.createElement('li');
      if (page === 'ellipsis') {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '…';
        ellipsis.setAttribute('aria-hidden', 'true');
        item.append(ellipsis);
      } else {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = String(page);
        button.dataset.libraryPage = String(page);
        button.setAttribute('aria-label', `Page ${page}`);
        if (page === currentPage) button.setAttribute('aria-current', 'page');
        item.append(button);
      }
      pages.append(item);
    });
  };

  const renderLibrary = ({ focusResults = false } = {}) => {
    const query = normalizeLibraryText(searchInput?.value).trim();
    const queryTerms = query.split(/\s+/).filter(Boolean);
    const selectedCategory = normalizeLibraryText(categorySelect?.value);
    const selectedProgress = progressSelect?.value || '';
    const matches = libraryItems.filter((item) => (
      queryTerms.every((term) => item.search.includes(term)) &&
      (!selectedCategory || item.categories.includes(selectedCategory)) &&
      (!selectedProgress || (learnedBookState(item.slug) ? 'learned' : 'unlearned') === selectedProgress)
    ));
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    currentPage = Math.min(currentPage, totalPages);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const visibleItems = new Set(matches.slice(startIndex, startIndex + PAGE_SIZE));

    libraryItems.forEach((item) => { item.card.hidden = !visibleItems.has(item); });
    const hasResults = matches.length > 0;
    if (empty) empty.hidden = hasResults;
    if (clearButton) clearButton.disabled = !query && !selectedCategory && !selectedProgress;

    if (status) {
      status.textContent = hasResults
        ? `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, matches.length)} of ${matches.length} ${matches.length === 1 ? 'lesson' : 'lessons'}.`
        : 'No lessons found.';
    }
    renderPagination(hasResults ? totalPages : 0);
    if (focusResults && status) {
      status.focus({ preventScroll: true });
      requestAnimationFrame(() => status.scrollIntoView({ block: 'start' }));
    }
  };

  searchInput?.addEventListener('input', () => {
    currentPage = 1;
    renderLibrary();
  });
  categorySelect?.addEventListener('change', () => {
    currentPage = 1;
    renderLibrary();
  });
  progressSelect?.addEventListener('change', () => {
    currentPage = 1;
    renderLibrary();
  });
  libraryControls.addEventListener('reset', () => {
    requestAnimationFrame(() => {
      currentPage = 1;
      renderLibrary();
      searchInput?.focus();
    });
  });
  emptyClear?.addEventListener('click', () => libraryControls.reset());
  previous?.addEventListener('click', () => {
    if (currentPage === 1) return;
    currentPage -= 1;
    renderLibrary({ focusResults: true });
  });
  next?.addEventListener('click', () => {
    currentPage += 1;
    renderLibrary({ focusResults: true });
  });
  pages?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-library-page]');
    if (!button) return;
    currentPage = Number(button.dataset.libraryPage);
    renderLibrary({ focusResults: true });
  });

  libraryControls.hidden = false;
  if (resultsBar) resultsBar.hidden = false;
  document.addEventListener('daw:learned-change', () => renderLibrary());
  window.addEventListener('storage', (event) => {
    if (event.key === null || event.key?.startsWith('daw-learned-')) renderLibrary();
  });
  renderLibrary();
}

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

function safeStorageGetJson(key) {
  const value = safeStorageGet(key);
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function learnedBookState(slug) {
  return safeStorageGet(`daw-learned-book-${slug}`) === 'true';
}

function learnedIdeaState(id) {
  return safeStorageGet(`daw-learned-idea-${id}`) === 'true';
}

function readBookIdeaIds(progress) {
  try { return JSON.parse(progress?.dataset.bookIdeaIds || '[]'); } catch { return []; }
}

function bookIdeaIds(slug) {
  const progress = [...document.querySelectorAll('[data-book-progress]')]
    .find((item) => item.dataset.bookSlug === slug);
  return readBookIdeaIds(progress);
}

function writeBookLearned(slug, ideaIds, learned) {
  const writes = [
    learned ? safeStorageSet(`daw-learned-book-${slug}`, 'true') : safeStorageRemove(`daw-learned-book-${slug}`),
    ...ideaIds.map((id) => learned
      ? safeStorageSet(`daw-learned-idea-${id}`, 'true')
      : safeStorageRemove(`daw-learned-idea-${id}`))
  ];
  return writes.every(Boolean);
}

function writeIdeaLearned(id, learned) {
  return learned
    ? safeStorageSet(`daw-learned-idea-${id}`, 'true')
    : safeStorageRemove(`daw-learned-idea-${id}`);
}

function syncBookLearnedFromIdeas(slug, ideaIds) {
  const allIdeasLearned = ideaIds.length > 0 && ideaIds.every(learnedIdeaState);
  return allIdeasLearned
    ? safeStorageSet(`daw-learned-book-${slug}`, 'true')
    : safeStorageRemove(`daw-learned-book-${slug}`);
}

function renderBookProgress(progress) {
  const slug = progress.dataset.bookSlug;
  const ideaIds = readBookIdeaIds(progress);
  const learnedIdeas = ideaIds.filter(learnedIdeaState).length;
  const learned = learnedBookState(slug);
  const state = progress.querySelector('[data-learning-state]');
  const summary = progress.querySelector('[data-learning-summary]');
  const button = progress.querySelector('[data-book-learned]');

  progress.classList.toggle('is-learned', learned);
  if (state) state.textContent = learned ? 'Learned' : 'Not yet learned';
  if (summary) summary.textContent = `${learnedIdeas} of ${ideaIds.length} ideas learned`;
  if (button) {
    button.setAttribute('aria-pressed', String(learned));
    button.setAttribute('aria-label', learned
      ? 'Mark this book and its ideas as not learned in this browser'
      : 'Mark this book and all its ideas as learned in this browser');
    button.innerHTML = learned
      ? '<span aria-hidden="true">✓</span> Book learned'
      : '<span aria-hidden="true">○</span> Mark book learned';
  }
}

function renderIdeaLearnedButton(button) {
  const learned = learnedIdeaState(button.dataset.ideaLearnedId);
  const ideaNumber = button.dataset.ideaNumber;
  button.setAttribute('aria-pressed', String(learned));
  button.setAttribute('aria-label', learned
    ? `Mark Idea ${ideaNumber} as not learned in this browser`
    : `Mark Idea ${ideaNumber} as learned in this browser`);
  button.innerHTML = learned
    ? '<span aria-hidden="true">✓</span> Idea learned'
    : '<span aria-hidden="true">○</span> Mark idea learned';
}

function renderLearnedProgress() {
  document.querySelectorAll('[data-book-progress]').forEach(renderBookProgress);
  document.querySelectorAll('[data-idea-learned-id]').forEach(renderIdeaLearnedButton);
}

document.querySelectorAll('[data-book-learned]').forEach((button) => {
  button.addEventListener('click', () => {
    const progress = button.closest('[data-book-progress]');
    const slug = progress?.dataset.bookSlug;
    const ideaIds = readBookIdeaIds(progress);
    const next = !learnedBookState(slug);
    const status = progress?.querySelector('[data-learned-status]');
    if (!slug || !writeBookLearned(slug, ideaIds, next)) {
      if (status) status.textContent = 'Learning progress was not saved because browser storage is unavailable.';
      return;
    }
    renderLearnedProgress();
    if (status) status.textContent = next
      ? 'Book and all 3 ideas marked learned.'
      : 'Book and all 3 ideas marked not learned.';
    document.dispatchEvent(new CustomEvent('daw:learned-change'));
  });
});

document.querySelectorAll('[data-idea-learned-id]').forEach((button) => {
  button.addEventListener('click', () => {
    const id = button.dataset.ideaLearnedId;
    const slug = button.dataset.bookSlug;
    const next = !learnedIdeaState(id);
    if (!writeIdeaLearned(id, next) || !syncBookLearnedFromIdeas(slug, bookIdeaIds(slug))) {
      ideaActionStatus(button, 'Learning progress was not saved because browser storage is unavailable.');
      return;
    }
    renderLearnedProgress();
    ideaActionStatus(button, next ? 'Idea marked learned.' : 'Idea marked not learned.');
    document.dispatchEvent(new CustomEvent('daw:learned-change'));
  });
});

renderLearnedProgress();
window.addEventListener('storage', (event) => {
  if (event.key === null || event.key?.startsWith('daw-learned-')) renderLearnedProgress();
});

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

document.querySelectorAll('[data-learning-check]').forEach((learningCheck) => {
  const form = learningCheck.querySelector('[data-quiz-form]');
  const questions = [...learningCheck.querySelectorAll('[data-quiz-question]')];
  const summary = learningCheck.querySelector('[data-quiz-summary]');
  const actionStatus = learningCheck.querySelector('[data-quiz-action-status]');
  const submitButton = learningCheck.querySelector('.quiz-submit');
  const practiceAgainButton = learningCheck.querySelector('[data-practice-again]');
  const firstAttemptKey = `daw-quiz-first-${learningCheck.dataset.lessonSlug}-${learningCheck.dataset.quizRevision}`;
  let firstAttempt = safeStorageGetJson(firstAttemptKey);

  function setQuestionResult(question, selectedIndex, reveal) {
    const correctIndex = Number(question.dataset.correctIndex);
    const options = [...question.querySelectorAll('[data-quiz-option]')];
    const inputs = [...question.querySelectorAll('input[type="radio"]')];
    inputs.forEach((input, index) => {
      input.checked = index === selectedIndex;
      input.disabled = reveal;
    });
    options.forEach((option, index) => {
      option.classList.toggle('is-correct', reveal && index === correctIndex);
      option.classList.toggle('is-incorrect', reveal && index === selectedIndex && index !== correctIndex);
    });

    const feedback = question.querySelector('[data-quiz-feedback]');
    if (!feedback) return;
    feedback.hidden = !reveal;
    feedback.classList.toggle('is-correct', reveal && selectedIndex === correctIndex);
    feedback.classList.toggle('is-incorrect', reveal && selectedIndex !== correctIndex);
    const feedbackStatus = feedback.querySelector('[data-quiz-feedback-status]');
    if (feedbackStatus) feedbackStatus.textContent = !reveal ? '' : selectedIndex === correctIndex ? 'Correct' : 'Not quite';
    const correctAnswer = feedback.querySelector('[data-quiz-correct-answer]');
    if (correctAnswer) {
      correctAnswer.hidden = !reveal || selectedIndex === correctIndex;
      const answerText = options[correctIndex]?.querySelector('span:last-child')?.textContent?.trim() || '';
      correctAnswer.textContent = reveal && selectedIndex !== correctIndex
        ? `Correct answer: ${String.fromCharCode(65 + correctIndex)}: ${answerText}`
        : '';
    }
    feedback.querySelectorAll('[data-feedback-for]').forEach((message) => {
      message.hidden = !reveal || Number(message.dataset.feedbackFor) !== selectedIndex;
    });
  }

  function showFirstAttempt(attempt, announce = false) {
    const answers = Array.isArray(attempt?.answers) ? attempt.answers : [];
    if (answers.length !== questions.length) return false;
    questions.forEach((question, index) => setQuestionResult(question, Number(answers[index]), true));
    const score = answers.reduce((total, answer, index) => total + (Number(answer) === Number(questions[index].dataset.correctIndex) ? 1 : 0), 0);
    if (summary) summary.textContent = `First attempt: ${score} of ${questions.length} remembered.`;
    if (submitButton) submitButton.hidden = true;
    if (practiceAgainButton) practiceAgainButton.hidden = false;
    learningCheck.classList.add('is-complete');
    if (announce && actionStatus) actionStatus.textContent = `Answers checked. You remembered ${score} of ${questions.length} on your first attempt.`;
    return true;
  }

  function startPracticeAgain() {
    questions.forEach((question) => {
      setQuestionResult(question, -1, false);
      const validation = question.querySelector('[data-quiz-validation]');
      if (validation) validation.textContent = '';
    });
    if (summary && firstAttempt) {
      const score = firstAttempt.answers.reduce((total, answer, index) => total + (Number(answer) === Number(questions[index].dataset.correctIndex) ? 1 : 0), 0);
      summary.textContent = `First attempt stays ${score} of ${questions.length}. Practice all 6 again.`;
    }
    if (submitButton) {
      submitButton.hidden = false;
      submitButton.textContent = 'Check practice answers';
    }
    if (practiceAgainButton) practiceAgainButton.hidden = true;
    if (actionStatus) actionStatus.textContent = firstAttempt
      ? 'Practice answers cleared. Your first attempt is preserved.'
      : 'Practice answers cleared. No first attempt is saved in this browser.';
    learningCheck.classList.remove('is-complete');
    questions[0]?.querySelector('input')?.focus();
  }

  function checkAnswers(event) {
    event.preventDefault();
    const answers = questions.map((question) => {
      const selected = question.querySelector('input[type="radio"]:checked');
      return selected ? Number(selected.value) : null;
    });
    const firstMissing = answers.findIndex((answer) => answer === null);
    questions.forEach((question, index) => {
      const validation = question.querySelector('[data-quiz-validation]');
      const missing = answers[index] === null;
      if (validation) validation.textContent = missing ? `Select an answer for Question ${index + 1}.` : '';
      question.querySelectorAll('input[type="radio"]').forEach((input) => {
        if (missing) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
    });
    if (firstMissing >= 0) {
      if (actionStatus) actionStatus.textContent = `Answer all 6 questions before checking. Question ${firstMissing + 1} needs an answer.`;
      questions[firstMissing].querySelector('input')?.focus();
      return;
    }

    const persistedFirstAttempt = safeStorageGetJson(firstAttemptKey);
    if (Array.isArray(persistedFirstAttempt?.answers) && persistedFirstAttempt.answers.length === questions.length) {
      firstAttempt = persistedFirstAttempt;
    }
    const isFirstSubmission = !firstAttempt;
    let firstAttemptSaveFailed = false;
    if (isFirstSubmission) {
      const attempt = { revision: learningCheck.dataset.quizRevision, answers, completedAt: new Date().toISOString() };
      if (safeStorageSet(firstAttemptKey, JSON.stringify(attempt))) firstAttempt = attempt;
      else firstAttemptSaveFailed = true;
    }

    questions.forEach((question, index) => setQuestionResult(question, answers[index], true));
    const score = answers.reduce((total, answer, index) => total + (answer === Number(questions[index].dataset.correctIndex) ? 1 : 0), 0);
    if (summary) summary.textContent = firstAttemptSaveFailed
      ? `Result: ${score} of ${questions.length}. First attempt was not saved.`
      : isFirstSubmission
        ? `First attempt: ${score} of ${questions.length} remembered.`
        : `Practice result: ${score} of ${questions.length}. Your first attempt is preserved.`;
    if (submitButton) submitButton.hidden = true;
    if (practiceAgainButton) practiceAgainButton.hidden = false;
    learningCheck.classList.add('is-complete');
    if (actionStatus) actionStatus.textContent = firstAttemptSaveFailed
      ? `Answers checked: ${score} of ${questions.length}. Browser storage is unavailable, so no first attempt or next-day review was saved.`
      : `Answers checked. You remembered ${score} of ${questions.length}${isFirstSubmission ? ' on your first attempt' : ' in this practice round'}.`;
    questions[0]?.querySelector('[data-quiz-feedback]')?.focus();
  }

  if (!showFirstAttempt(firstAttempt)) {
    if (summary) summary.textContent = `${questions.length} questions not yet answered.`;
  }
  form?.addEventListener('submit', checkAnswers);
  form?.addEventListener('change', (event) => {
    const question = event.target.closest('[data-quiz-question]');
    if (!question) return;
    const validation = question.querySelector('[data-quiz-validation]');
    if (validation) validation.textContent = '';
    question.querySelectorAll('input[type="radio"]').forEach((input) => input.removeAttribute('aria-invalid'));
  });
  practiceAgainButton?.addEventListener('click', startPracticeAgain);
  window.addEventListener('storage', (event) => {
    if (event.key !== firstAttemptKey) return;
    const incomingAttempt = safeStorageGetJson(firstAttemptKey);
    if (Array.isArray(incomingAttempt?.answers) && incomingAttempt.answers.length === questions.length) {
      firstAttempt = incomingAttempt;
      const hasInProgressAnswers = questions.some((question) => question.querySelector('input:checked')) && !learningCheck.classList.contains('is-complete');
      if (hasInProgressAnswers) {
        if (summary) summary.textContent = 'A first attempt was completed in another tab. Current answers will count as practice.';
        if (actionStatus) actionStatus.textContent = 'Your selections are unchanged.';
      } else {
        showFirstAttempt(incomingAttempt);
      }
      return;
    }

    firstAttempt = null;
    if (learningCheck.classList.contains('is-complete')) {
      questions.forEach((question) => {
        setQuestionResult(question, -1, false);
        const validation = question.querySelector('[data-quiz-validation]');
        if (validation) validation.textContent = '';
      });
      if (submitButton) {
        submitButton.hidden = false;
        submitButton.textContent = 'Check answers';
      }
      if (practiceAgainButton) practiceAgainButton.hidden = true;
      learningCheck.classList.remove('is-complete');
    }
    if (summary) summary.textContent = `${questions.length} questions not yet answered.`;
    if (actionStatus) actionStatus.textContent = 'Learning history was cleared in another tab. Any current selections remain.';
  });
});

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shuffledOptionIndices(key, count) {
  let seed = 2166136261;
  for (const character of key) {
    seed ^= character.charCodeAt(0);
    seed = Math.imul(seed, 16777619) >>> 0;
  }
  const indices = Array.from({ length: count }, (_, index) => index);
  for (let index = indices.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
  }
  return indices;
}

const quickReview = document.querySelector('[data-quick-review]');
const quickReviewData = document.querySelector('#daw-quick-review-data');
if (quickReview && quickReviewData) {
  let reviewLibrary;
  try { reviewLibrary = JSON.parse(quickReviewData.textContent); } catch { reviewLibrary = null; }
  const today = localDateKey();
  const dailyReviewKey = 'daw-quiz-review-day';
  const candidates = [];

  if (safeStorageGet(dailyReviewKey) !== today) reviewLibrary?.lessons?.forEach((lesson) => {
    const firstAttempt = safeStorageGetJson(`daw-quiz-first-${lesson.slug}-${lesson.revision}`);
    if (!Array.isArray(firstAttempt?.answers) || firstAttempt.answers.length !== lesson.questions.length) return;
    const completedDate = localDateKey(firstAttempt.completedAt);
    if (!completedDate || completedDate >= today) return;

    lesson.questions.forEach((question, index) => {
      const reviewKey = `daw-quiz-review-${lesson.revision}-${question.id}`;
      const reviewState = safeStorageGetJson(reviewKey);
      if (reviewState?.mastered || reviewState?.lastReviewedDate === today) return;
      candidates.push({
        lesson,
        question,
        reviewKey,
        firstAttemptCorrect: Number(firstAttempt.answers[index]) === Number(question.correctIndex),
        reviewCount: Number(reviewState?.reviewCount) || 0,
        completedAt: firstAttempt.completedAt
      });
    });
  });

  candidates.sort((left, right) =>
    Number(left.firstAttemptCorrect) - Number(right.firstAttemptCorrect) ||
    left.reviewCount - right.reviewCount ||
    String(left.completedAt).localeCompare(String(right.completedAt)) ||
    left.question.id.localeCompare(right.question.id));

  const reviewItems = candidates.slice(0, 3);
  if (reviewItems.length) {
    const list = quickReview.querySelector('[data-quick-review-questions]');
    const summary = quickReview.querySelector('[data-quick-review-summary]');
    const status = quickReview.querySelector('[data-quick-review-status]');
    const form = quickReview.querySelector('[data-quick-review-form]');
    const count = quickReview.querySelector('[data-quick-review-count]');
    if (count) count.textContent = `${reviewItems.length} ${reviewItems.length === 1 ? 'question' : 'questions'}`;
    if (summary) summary.textContent = `${reviewItems.length} ${reviewItems.length === 1 ? 'idea is' : 'ideas are'} ready to review.`;

    reviewItems.forEach((item, itemIndex) => {
      const { lesson, question } = item;
      const validationId = `quick-review-question-${itemIndex + 1}-validation`;
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'quiz-question';
      fieldset.dataset.quickReviewQuestion = question.id;
      fieldset.dataset.correctIndex = question.correctIndex;

      const legend = document.createElement('legend');
      const meta = document.createElement('span');
      meta.className = 'quiz-question-meta';
      meta.textContent = `Question ${itemIndex + 1} of ${reviewItems.length} · ${lesson.title} · Idea ${question.ideaNumber}`;
      legend.append(meta, document.createTextNode(question.question));
      fieldset.append(legend);

      const options = document.createElement('div');
      options.className = 'quiz-options';
      shuffledOptionIndices(`${today}-${question.id}`, question.options.length).forEach((originalIndex, displayIndex) => {
        const label = document.createElement('label');
        label.className = 'quiz-option';
        label.dataset.quizOption = '';
        label.dataset.optionIndex = originalIndex;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `quick-review-${question.id}`;
        input.value = originalIndex;
        input.required = true;
        input.setAttribute('aria-describedby', validationId);
        const letter = document.createElement('span');
        letter.className = 'quiz-option-letter';
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = String.fromCharCode(65 + displayIndex);
        const optionText = document.createElement('span');
        optionText.textContent = question.options[originalIndex];
        label.append(input, letter, optionText);
        options.append(label);
      });
      fieldset.append(options);

      const validation = document.createElement('p');
      validation.className = 'quiz-validation';
      validation.id = validationId;
      validation.dataset.quizValidation = '';
      fieldset.append(validation);

      const feedback = document.createElement('div');
      feedback.className = 'quiz-feedback';
      feedback.dataset.quizFeedback = '';
      feedback.tabIndex = -1;
      feedback.hidden = true;
      const feedbackStatus = document.createElement('p');
      feedbackStatus.className = 'quiz-feedback-status';
      const correctAnswer = document.createElement('p');
      correctAnswer.className = 'quiz-correct-answer';
      correctAnswer.dataset.quizCorrectAnswer = '';
      correctAnswer.hidden = true;
      const selectedFeedback = document.createElement('p');
      selectedFeedback.dataset.selectedFeedback = '';
      const context = document.createElement('p');
      context.className = 'quiz-feedback-context';
      context.textContent = question.feedback;
      feedback.append(feedbackStatus, correctAnswer, selectedFeedback, context);
      fieldset.append(feedback);
      list?.append(fieldset);
    });

    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const fieldsets = [...quickReview.querySelectorAll('[data-quick-review-question]')];
      const answers = fieldsets.map((fieldset) => fieldset.querySelector('input:checked'));
      const firstMissing = answers.findIndex((answer) => !answer);
      fieldsets.forEach((fieldset, index) => {
        const validation = fieldset.querySelector('[data-quiz-validation]');
        const missing = !answers[index];
        if (validation) validation.textContent = missing ? `Select an answer for Question ${index + 1}.` : '';
        fieldset.querySelectorAll('input[type="radio"]').forEach((input) => {
          if (missing) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        });
      });
      if (firstMissing >= 0) {
        if (status) status.textContent = `Answer all ${reviewItems.length} review questions before checking.`;
        fieldsets[firstMissing].querySelector('input')?.focus();
        return;
      }

      let score = 0;
      let storageAvailable = true;
      fieldsets.forEach((fieldset, index) => {
        const item = reviewItems[index];
        const selectedIndex = Number(answers[index].value);
        const isCorrect = selectedIndex === Number(item.question.correctIndex);
        if (isCorrect) score += 1;
        fieldset.querySelectorAll('input').forEach((input) => { input.disabled = true; });
        fieldset.querySelectorAll('[data-quiz-option]').forEach((option) => {
          const optionIndex = Number(option.dataset.optionIndex);
          option.classList.toggle('is-correct', optionIndex === Number(item.question.correctIndex));
          option.classList.toggle('is-incorrect', optionIndex === selectedIndex && !isCorrect);
        });
        const feedback = fieldset.querySelector('[data-quiz-feedback]');
        feedback.hidden = false;
        feedback.classList.toggle('is-correct', isCorrect);
        feedback.classList.toggle('is-incorrect', !isCorrect);
        feedback.querySelector('.quiz-feedback-status').textContent = isCorrect ? 'Correct' : 'Not quite';
        const correctAnswer = feedback.querySelector('[data-quiz-correct-answer]');
        if (correctAnswer) {
          correctAnswer.hidden = isCorrect;
          correctAnswer.textContent = isCorrect
            ? ''
            : `Correct answer: ${item.question.options[item.question.correctIndex]}`;
        }
        feedback.querySelector('[data-selected-feedback]').textContent = isCorrect
          ? item.question.feedbackByOption[selectedIndex].replace(/^Correct\.\s*/, '')
          : item.question.feedbackByOption[selectedIndex];
        const previous = safeStorageGetJson(item.reviewKey);
        const nextState = {
          lastReviewedDate: today,
          reviewCount: (Number(previous?.reviewCount) || 0) + 1,
          mastered: isCorrect
        };
        if (!safeStorageSet(item.reviewKey, JSON.stringify(nextState))) storageAvailable = false;
      });
      if (storageAvailable && !safeStorageSet(dailyReviewKey, today)) storageAvailable = false;

      if (summary) summary.textContent = `${score} of ${reviewItems.length} remembered today.`;
      form.querySelector('.quiz-submit').hidden = true;
      if (status) status.textContent = storageAvailable
        ? `Review saved for today. ${score === reviewItems.length ? 'All remembered questions leave the queue.' : 'Missed questions can return on a later visit.'}`
        : 'Answers are checked, but review progress could not be saved because browser storage is unavailable.';
      fieldsets[0]?.querySelector('[data-quiz-feedback]')?.focus();
    });
    form?.addEventListener('change', (event) => {
      const fieldset = event.target.closest('[data-quick-review-question]');
      if (!fieldset) return;
      const validation = fieldset.querySelector('[data-quiz-validation]');
      if (validation) validation.textContent = '';
      fieldset.querySelectorAll('input[type="radio"]').forEach((input) => input.removeAttribute('aria-invalid'));
    });
    window.addEventListener('storage', (event) => {
      const learningKeyChanged = event.key === null || event.key?.startsWith('daw-quiz-first-') || event.key?.startsWith('daw-quiz-review-');
      if (learningKeyChanged && (event.newValue === null || safeStorageGet(dailyReviewKey) === today)) {
        quickReview.hidden = true;
      }
    });

    quickReview.hidden = false;
  }
}

const learningHistoryDialog = document.querySelector('[data-learning-history-dialog]');
document.querySelector('[data-learning-history-open]')?.addEventListener('click', () => learningHistoryDialog?.showModal());
document.querySelector('[data-clear-learning-history]')?.addEventListener('click', () => {
  let cleared = true;
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('daw-quiz-first-') || key.startsWith('daw-quiz-review-') || key.startsWith('daw-learned-'))
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    cleared = false;
  }
  learningHistoryDialog?.close();
  const status = document.querySelector('[data-learning-history-status]');
  if (status) status.textContent = cleared
    ? 'Learning history cleared from this browser.'
    : 'Learning history was not cleared because browser storage is unavailable.';
});

const analyticsBanner = document.querySelector('[data-analytics-consent]');
const analyticsStatus = document.querySelector('[data-analytics-status]');
const storedAnalyticsChoice = safeStorageGet(ANALYTICS_CONSENT_KEY);
if (storedAnalyticsChoice === 'granted' && !clarityDisabledOnPage) loadClarity('granted').catch(() => {});
else if (!['granted', 'denied'].includes(storedAnalyticsChoice) && analyticsBanner) analyticsBanner.hidden = false;

function chooseAnalytics(choice) {
  if (!safeStorageSet(ANALYTICS_CONSENT_KEY, choice)) {
    if (analyticsStatus) analyticsStatus.textContent = "We couldn't save your analytics choice. Check your browser's site data settings, then choose again.";
    return;
  }
  if (analyticsStatus) analyticsStatus.textContent = '';
  if (analyticsBanner) analyticsBanner.hidden = true;
  if (choice === 'granted') loadClarity('granted').catch(() => {});
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

const visualScrollRegions = [...document.querySelectorAll('[data-visual-scroll]')];
if (visualScrollRegions.length) {
  const updateVisualScrollRegion = (region) => {
    const isScrollable = region.scrollWidth - region.clientWidth > 1;
    region.dataset.scrollable = String(isScrollable);

    if (isScrollable) {
      region.tabIndex = 0;
      region.setAttribute('role', 'group');
      region.setAttribute('aria-label', 'Scrollable lesson diagram');
    } else {
      region.removeAttribute('tabindex');
      region.removeAttribute('role');
      region.removeAttribute('aria-label');
    }

    const hint = region.parentElement?.querySelector('[data-visual-scroll-hint]');
    if (hint) hint.hidden = !isScrollable;
  };

  let visualScrollFrame;
  const updateVisualScrollRegions = () => {
    if (visualScrollFrame) cancelAnimationFrame(visualScrollFrame);
    visualScrollFrame = requestAnimationFrame(() => {
      visualScrollRegions.forEach(updateVisualScrollRegion);
      visualScrollFrame = null;
    });
  };

  visualScrollRegions.forEach((region) => {
    region.querySelectorAll('img').forEach((image) => {
      if (!image.complete) {
        image.addEventListener('load', updateVisualScrollRegions, { once: true });
        image.addEventListener('error', updateVisualScrollRegions, { once: true });
      }
    });
  });
  if ('ResizeObserver' in window) {
    const visualScrollResizeObserver = new ResizeObserver(updateVisualScrollRegions);
    visualScrollRegions.forEach((region) => visualScrollResizeObserver.observe(region));
  }
  window.addEventListener('resize', updateVisualScrollRegions);
  updateVisualScrollRegions();
}

const comments = document.querySelector('#cusdis_thread');
if (comments) {
  const commentsPanel = comments.closest('[data-cusdis-comments]');
  const commentsStatus = commentsPanel?.querySelector('[data-cusdis-status]');
  const commentsRetry = commentsPanel?.querySelector('[data-cusdis-retry]');
  const CUSDIS_LOAD_TIMEOUT_MS = 12000;
  let cusdisLoadTimeout;
  let cusdisLoadAttempt = 0;

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

  const showCommentsLoading = () => {
    comments.setAttribute('aria-busy', 'true');
    if (commentsStatus) {
      commentsStatus.hidden = false;
      commentsStatus.textContent = 'Loading discussion…';
    }
    if (commentsRetry) commentsRetry.hidden = true;
  };

  const showCommentsFailure = (message) => {
    clearTimeout(cusdisLoadTimeout);
    comments.removeAttribute('aria-busy');
    if (commentsStatus) {
      commentsStatus.hidden = false;
      commentsStatus.textContent = message;
    }
    if (commentsRetry) commentsRetry.hidden = false;
  };

  const showCommentsSuccess = (frame) => {
    clearTimeout(cusdisLoadTimeout);
    prepareCommentsFrame(frame);
    comments.removeAttribute('aria-busy');
    if (commentsStatus) {
      commentsStatus.textContent = '';
      commentsStatus.hidden = true;
    }
    if (commentsRetry) commentsRetry.hidden = true;
  };

  const prepareCurrentFrame = () => {
    const frame = comments.querySelector('iframe');
    if (frame) showCommentsSuccess(frame);
    return frame;
  };

  new MutationObserver(prepareCurrentFrame).observe(comments, { childList: true, subtree: true });
  const loadComments = ({ retry = false } = {}) => {
    if (prepareCurrentFrame()) return;

    const existingScript = document.querySelector('script[data-daw-cusdis-script]');
    if (existingScript && !retry) return;
    if (existingScript) existingScript.remove();

    const host = comments.dataset.host?.replace(/\/$/, '');
    let scriptUrl;
    try {
      scriptUrl = new URL(`${host}/js/cusdis.es.js`);
      if (!['http:', 'https:'].includes(scriptUrl.protocol)) throw new Error('Unsupported Cusdis URL.');
    } catch {
      showCommentsFailure('The discussion is unavailable because its service address is invalid.');
      return;
    }

    const attempt = ++cusdisLoadAttempt;
    showCommentsLoading();
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.dataset.dawCusdisScript = 'true';
    script.src = scriptUrl.href;
    script.addEventListener('error', () => {
      if (attempt !== cusdisLoadAttempt || prepareCurrentFrame()) return;
      showCommentsFailure('The discussion could not load. Check your connection or privacy blocker, then retry.');
    }, { once: true });
    document.head.append(script);

    clearTimeout(cusdisLoadTimeout);
    cusdisLoadTimeout = setTimeout(() => {
      if (attempt !== cusdisLoadAttempt || prepareCurrentFrame()) return;
      showCommentsFailure('The discussion took too long to load. Check your connection or privacy blocker, then retry.');
    }, CUSDIS_LOAD_TIMEOUT_MS);
  };

  commentsRetry?.addEventListener('click', () => loadComments({ retry: true }));
  loadComments();
}
