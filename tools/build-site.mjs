import { lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd());
const { lessons } = JSON.parse(await readFile(path.join(root, 'content', 'lessons.json'), 'utf8'));
const { families: topicFamilies } = JSON.parse(await readFile(path.join(root, 'content', 'topic-catalog.json'), 'utf8'));
const siteUrl = 'https://djorchard.github.io/daily-applied-wisdom';
const contactFormUrl = 'https://tally.so/r/RGelGj';
const cusdisAppId = '714bda94-6019-4858-968f-91b3b5bb1c13';
const checkOnly = process.argv.slice(2).includes('--check');
const unsupportedArguments = process.argv.slice(2).filter((argument) => argument !== '--check');

if (unsupportedArguments.length) {
  throw new Error(`Unsupported build argument${unsupportedArguments.length === 1 ? '' : 's'}: ${unsupportedArguments.join(', ')}`);
}

if (!Array.isArray(lessons) || lessons.length < 1) {
  throw new Error('Expected content/lessons.json to contain at least one lesson.');
}

const lessonSlugs = new Set();
for (const lesson of lessons) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug)) {
    throw new Error(`Refusing to build an unsafe lesson slug: ${lesson.slug ?? '(missing slug)'}.`);
  }
  if (lessonSlugs.has(lesson.slug)) throw new Error(`Refusing to build duplicate lesson slug: ${lesson.slug}.`);
  lessonSlugs.add(lesson.slug);
}

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const paragraphList = (items) => items.map((item) => `<p>${esc(item)}</p>`).join('\n');
const lessonUrl = (lesson) => `${siteUrl}/lessons/${lesson.slug}.html`;
const ideaKey = (lesson, idea) => `${lesson.slug}-${idea.id}`;
const clarityEventName = (lesson, idea) => `dawUseful${`${lesson.slug}-${idea.id}`
  .split(/[^a-zA-Z0-9]+/)
  .filter(Boolean)
  .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
  .join('')}`;

function head({ title, description, url, article = false, published, noindex = false }) {
  const assetPrefix = article ? '../' : '';
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(description)}" />
${noindex ? '    <meta name="robots" content="noindex,follow" />\n' : ''}    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="${article ? 'article' : 'website'}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${siteUrl}/assets/social-card.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Daily Applied Wisdom: One book. Three ideas. Better thinking." />
${published ? `    <meta property="article:published_time" content="${published}" />\n` : ''}    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#f5f1e8" />
    <link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml" />
    <link rel="alternate" type="application/rss+xml" title="Daily Applied Wisdom RSS" href="${assetPrefix}feed.xml" />
    <title>${esc(title)}</title>`;
}

function header(prefix = '') {
  return `<a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <a class="brand" href="${prefix}index.html" aria-label="Daily Applied Wisdom home">Daily Applied Wisdom</a>
      <nav aria-label="Main navigation">
        <a href="${prefix}index.html#latest">Latest</a>
        <a href="${prefix}index.html#library">Library</a>
        <a href="${prefix}saved.html">Saved ideas</a>
        <a href="${contactFormUrl}" target="_blank" rel="noreferrer" aria-label="Contact or send anonymous feedback (opens Tally in a new tab)">Contact</a>
      </nav>
    </header>`;
}

function footer(prefix = '') {
  return `<footer>
      <span>Daily Applied Wisdom</span>
      <span>One book. Three ideas. Better thinking.</span>
      <a href="${prefix}feed.xml">RSS</a>
      <a href="${contactFormUrl}" target="_blank" rel="noreferrer">Contact or anonymous feedback <span aria-hidden="true">↗</span></a>
      <a href="${prefix}privacy.html">Privacy and data use</a>
      <span>© 2026 Daniel Barnes</span>
    </footer>`;
}

function analyticsConsent(prefix = '') {
  return `<aside class="analytics-consent" data-analytics-consent hidden aria-labelledby="analytics-consent-title">
      <div>
        <h2 id="analytics-consent-title">Choose analytics preferences</h2>
        <p>Microsoft Clarity can record page interactions to show which lessons help readers. Advertising storage stays off. <a href="${prefix}privacy.html">Read about privacy and data use</a>.</p>
      </div>
      <div class="analytics-consent-actions">
        <button type="button" data-analytics-allow>Allow analytics</button>
        <button type="button" data-analytics-reject>Reject analytics</button>
      </div>
      <p class="analytics-consent-status" data-analytics-status aria-live="polite"></p>
    </aside>`;
}

function renderIdea(lesson, idea, index) {
  const ideaNumber = index + 1;
  const stableIdeaKey = ideaKey(lesson, idea);
  return `<section class="lesson-idea accent-${esc(lesson.accent)}" id="${esc(idea.id)}" aria-labelledby="${esc(idea.id)}-title">
      <div class="idea-marker" aria-hidden="true">0${ideaNumber}</div>
      <div class="idea-main">
        <p class="eyebrow">Idea ${ideaNumber}</p>
        <h2 id="${esc(idea.id)}-title">${esc(idea.title)} <a class="anchor-link" href="#${esc(idea.id)}" aria-label="Link to Idea ${ideaNumber}">#</a></h2>
        <h3>The idea</h3>
        ${paragraphList(idea.argument)}
        <aside class="interpretation"><strong>Applied interpretation.</strong> ${esc(idea.extension)}</aside>
        <figure class="lesson-visual">
          <div class="visual-scroll" data-visual-scroll>
            <img src="${esc(idea.image)}" alt="${esc(idea.imageAlt)}" width="1200" height="760" loading="lazy" decoding="async" />
          </div>
          <span class="visual-scroll-hint" data-visual-scroll-hint hidden aria-hidden="true">Swipe to explore the diagram →</span>
          <figcaption>${esc(idea.imageCaption)}</figcaption>
        </figure>
        <div class="practice-grid">
          <section><h3>Why it matters</h3><p>${esc(idea.why)}</p></section>
          <section><h3>Apply it today</h3>${paragraphList(idea.apply)}</section>
          <section class="caveat"><h3>Caveat or failure mode</h3><p>${esc(idea.caveat)}</p></section>
        </div>
        <div class="idea-actions" data-clarity-mask="true">
          <button class="idea-learned" type="button" data-idea-learned-id="${esc(stableIdeaKey)}" data-book-slug="${esc(lesson.slug)}" data-idea-number="${ideaNumber}" aria-pressed="false" aria-label="Mark Idea ${ideaNumber} as learned in this browser">
            <span aria-hidden="true">○</span> Mark idea learned
          </button>
          <button class="idea-save" type="button" data-save-id="${esc(stableIdeaKey)}" data-idea-number="${ideaNumber}" aria-pressed="false" aria-label="Save Idea ${ideaNumber} for later in this browser">
            <span aria-hidden="true">♡</span> Save idea for later
          </button>
          <button class="idea-useful" type="button" data-useful-id="${esc(stableIdeaKey)}" data-lesson-slug="${esc(lesson.slug)}" data-idea-id="${esc(idea.id)}" data-idea-number="${ideaNumber}" data-clarity-event="${esc(clarityEventName(lesson, idea))}" aria-label="Mark Idea ${ideaNumber} as useful">
            <span aria-hidden="true">👍</span> Mark idea useful
          </button>
          <span class="idea-action-status" aria-live="polite"></span>
        </div>
      </div>
    </section>`;
}

function orderedQuizQuestions(lesson) {
  const conceptQuestions = lesson.ideas.map((idea) => ({ idea, question: idea.quiz.find((question) => question.type === 'concept') }));
  const applicationQuestions = lesson.ideas.map((idea) => ({ idea, question: idea.quiz.find((question) => question.type === 'application') }));
  return [...conceptQuestions, ...applicationQuestions];
}

function renderLearningCheck(lesson) {
  const questions = orderedQuizQuestions(lesson);
  const stableIdeaKeys = lesson.ideas.map((idea) => ideaKey(lesson, idea));

  return `<section class="learning-check" id="learning-check" aria-labelledby="learning-check-title" data-learning-check data-lesson-slug="${esc(lesson.slug)}" data-book-idea-ids="${esc(JSON.stringify(stableIdeaKeys))}" data-quiz-revision="${esc(lesson.quizRevision)}" data-clarity-mask="true">
          <div class="learning-check-intro">
          <p class="eyebrow">Knowledge check · 6 questions</p>
            <h2 id="learning-check-title">Learning check</h2>
            <p>Answer all 6, then check your answers. Your first result stays in this browser, and each explanation appears after you check. A 3-question review can appear on the homepage from tomorrow.</p>
            <p class="learning-check-summary" data-quiz-summary>6 questions not yet answered.</p>
          </div>
          <form data-quiz-form novalidate>
            <div class="quiz-question-list">
              ${questions.map(({ idea, question }, index) => {
                const ideaNumber = lesson.ideas.indexOf(idea) + 1;
                const stableQuestionKey = `${lesson.slug}-${idea.id}-${question.id}`;
                return `<fieldset class="quiz-question" data-quiz-question data-question-id="${esc(stableQuestionKey)}" data-question-type="${esc(question.type)}" data-correct-index="${question.correctIndex}">
                  <legend><span class="quiz-question-meta">Question ${index + 1} of 6 · Idea ${ideaNumber} · ${question.type === 'concept' ? 'Concept' : 'Application'}</span>${esc(question.question)}</legend>
                  <div class="quiz-options">
                    ${question.options.map((option, optionIndex) => `<label class="quiz-option" data-quiz-option data-option-index="${optionIndex}">
                      <input type="radio" name="${esc(stableQuestionKey)}" value="${optionIndex}" required aria-describedby="${esc(stableQuestionKey)}-validation" />
                      <span class="quiz-option-letter" aria-hidden="true">${String.fromCharCode(65 + optionIndex)}</span>
                      <span>${esc(option)}</span>
                    </label>`).join('')}
                  </div>
                  <p class="quiz-validation" id="${esc(stableQuestionKey)}-validation" data-quiz-validation></p>
                  <div class="quiz-feedback" data-quiz-feedback tabindex="-1" hidden>
                    <p class="quiz-feedback-status" data-quiz-feedback-status></p>
                    <p class="quiz-correct-answer" data-quiz-correct-answer hidden></p>
                    ${question.feedbackByOption.map((feedback, optionIndex) => `<p data-feedback-for="${optionIndex}" hidden>${esc(optionIndex === question.correctIndex ? feedback.replace(/^Correct\.\s*/, '') : feedback)}</p>`).join('')}
                    <p class="quiz-feedback-context">${esc(question.feedback)}</p>
                  </div>
                </fieldset>`;
              }).join('')}
            </div>
            <div class="learning-check-actions">
              <button class="quiz-submit" type="submit">Check answers</button>
              <button class="quiz-mark-book-learned" type="button" data-mark-book-learned aria-pressed="false" hidden>Mark book as learned</button>
              <button class="quiz-practice-again" type="button" data-practice-again hidden>Practice again</button>
              <span class="learning-check-action-status" data-quiz-action-status aria-live="polite"></span>
            </div>
          </form>
        </section>`;
}

function quickReviewData() {
  return JSON.stringify({
    lessons: lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      revision: lesson.quizRevision,
      questions: orderedQuizQuestions(lesson).map(({ idea, question }) => ({
        id: `${lesson.slug}-${idea.id}-${question.id}`,
        ideaNumber: lesson.ideas.indexOf(idea) + 1,
        type: question.type,
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        feedback: question.feedback,
        feedbackByOption: question.feedbackByOption
      }))
    }))
  }).replaceAll('<', '\\u003c');
}

function renderLesson(lesson, index) {
  const newer = index > 0 ? lessons[index - 1] : null;
  const older = index < lessons.length - 1 ? lessons[index + 1] : null;
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': ['Article', 'LearningResource'],
    headline: lesson.title,
    description: lesson.summary,
    datePublished: lesson.date,
    about: {
      '@type': 'Book',
      name: lesson.title,
      author: lesson.authors.split(/, | and /).map((name) => ({ '@type': 'Person', name }))
    },
    isPartOf: { '@type': 'WebSite', name: 'Daily Applied Wisdom', url: siteUrl },
    url: lessonUrl(lesson),
    educationalUse: 'Active recall and practical application'
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>${head({ title: `${lesson.title} | Daily Applied Wisdom`, description: lesson.summary, url: lessonUrl(lesson), article: true, published: lesson.date })}
    <link rel="stylesheet" href="../styles.css" />
    <script type="application/ld+json">${schema}</script>
  </head>
  <body class="lesson-page">
    ${header('../')}
    <main id="main">
      <article>
        <header class="lesson-hero">
          <a class="back-link" href="../index.html#library">← All lessons</a>
          <p class="eyebrow">${esc(lesson.edition)} · <time datetime="${lesson.date}">${esc(lesson.dateLabel)}</time></p>
          <h1>${esc(lesson.title)}</h1>
          <p class="lesson-author">${esc(lesson.authors)}</p>
          <div class="lesson-meta"><span>${esc(lesson.year)}</span><span>${esc(lesson.category)}</span><span>5–8 minute read</span></div>
          <p class="lesson-summary">${esc(lesson.summary)}</p>
          <aside class="evidence-note"><strong>Evidence lens.</strong> ${esc(lesson.evidenceNote)}</aside>
          <div class="lesson-progress" data-book-progress data-book-slug="${esc(lesson.slug)}" data-book-idea-ids="${esc(JSON.stringify(lesson.ideas.map((idea) => ideaKey(lesson, idea))))}" data-clarity-mask="true" hidden>
            <span class="learning-state" data-learning-state hidden>Learned</span>
            <span class="learning-summary" data-learning-summary hidden></span>
          </div>
          <div class="share-row">
            <button class="share-button" type="button" data-share data-share-title="${esc(lesson.title)} | Daily Applied Wisdom" data-share-text="${esc(lesson.summary)}" data-share-url="${lessonUrl(lesson)}">Share this lesson <span aria-hidden="true">↗</span></button>
            <button class="copy-button" type="button" data-copy-url="${lessonUrl(lesson)}">Copy link</button>
            <span class="share-status" aria-live="polite"></span>
          </div>
          <nav class="idea-jump" aria-label="Ideas in this lesson">
            ${lesson.ideas.map((idea, ideaIndex) => `<a href="#${esc(idea.id)}"><span>0${ideaIndex + 1}</span>${esc(idea.title)}</a>`).join('')}
          </nav>
        </header>

        ${lesson.ideas.map((idea, ideaIndex) => renderIdea(lesson, idea, ideaIndex)).join('\n')}

        ${renderLearningCheck(lesson)}

        <section class="experiment" aria-labelledby="experiment-title">
          <p class="eyebrow">Today's experiment · ${esc(lesson.experiment.duration)}</p>
          <h2 id="experiment-title">${esc(lesson.experiment.title)}</h2>
          <ol>${lesson.experiment.steps.map((step) => `<li>${esc(step)}</li>`).join('')}</ol>
          <p class="observable-result"><strong>Observable result:</strong> ${esc(lesson.experiment.result)}</p>
        </section>

${lesson.spacedRecall.length ? `        <section class="recall" aria-labelledby="recall-title"><p class="eyebrow">Retrieval practice</p><h2 id="recall-title">Spaced recall</h2><ol>${lesson.spacedRecall.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></section>` : ''}

        <section class="sources" aria-labelledby="sources-title">
          <p class="eyebrow">Verification</p>
          <h2 id="sources-title">Source notes</h2>
          <p>These links support the attributed claims and edition details; applications and extensions are labelled in the lesson.</p>
          <ul>${lesson.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul>
        </section>

        <section class="takeaway" aria-labelledby="takeaway-title">
          <p class="eyebrow">One-sentence takeaway</p>
          <h2 id="takeaway-title">${esc(lesson.takeaway)}</h2>
        </section>
      </article>

      <aside class="reader-feedback" aria-labelledby="feedback-title" data-cusdis-comments data-clarity-mask="true">
        <p class="eyebrow">The reading room</p>
        <h2 id="feedback-title">What did this book change for you?</h2>
        <p class="comments-note">Each book has its own discussion, hosted by Cusdis. When you open the comment form, Cusdis receives information such as your IP address and browser details. You can post without an account, email is optional, and comments may wait for approval before appearing.</p>
        <p class="comments-status" data-cusdis-status role="status" aria-live="polite">Loading discussion…</p>
        <button type="button" data-cusdis-retry hidden>Retry loading discussion</button>
        <div id="cusdis_thread" data-host="https://cusdis.com" data-app-id="${cusdisAppId}" data-page-id="${esc(lesson.discussionId)}" data-page-url="${esc(lessonUrl(lesson))}" data-page-title="${esc(lesson.title)} | Daily Applied Wisdom" data-theme="light"></div>
        <noscript><p>Enable JavaScript to read or join the discussion.</p></noscript>
      </aside>

      <nav class="lesson-pagination" aria-label="Lesson navigation">
        ${older ? `<a href="${older.slug}.html"><span>Previous</span>${esc(older.title)}</a>` : '<span></span>'}
        ${newer ? `<a class="next" href="${newer.slug}.html"><span>Next</span>${esc(newer.title)}</a>` : '<span></span>'}
      </nav>
    </main>
    ${footer('../')}
    ${analyticsConsent('../')}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function archiveCard(lesson, featured = false) {
  const categories = lesson.category.split('·').map((category) => category.trim()).filter(Boolean);
  const stableIdeaKeys = lesson.ideas.map((idea) => ideaKey(lesson, idea));
  const searchText = [
    lesson.title,
    lesson.authors,
    lesson.category,
    lesson.summary,
    ...lesson.ideas.map((idea) => idea.title)
  ].join(' ');
  const libraryAttributes = featured
    ? ''
    : ` data-library-card data-library-slug="${esc(lesson.slug)}" data-library-categories="${esc(JSON.stringify(categories))}" data-library-search="${esc(searchText)}"`;
  return `<article class="library-card accent-${esc(lesson.accent)}${featured ? ' featured-card' : ''}"${libraryAttributes} data-book-progress data-book-slug="${esc(lesson.slug)}" data-book-idea-ids="${esc(JSON.stringify(stableIdeaKeys))}">
      <p class="eyebrow">${esc(lesson.edition)} · <time datetime="${lesson.date}">${esc(lesson.dateLabel)}</time></p>
      <p class="category">${esc(lesson.category)}</p>
      <h3><a href="lessons/${lesson.slug}.html">${esc(lesson.title)}</a></h3>
      <p class="card-author">${esc(lesson.authors)} · ${esc(lesson.year)}</p>
      <p>${esc(lesson.summary)}</p>
      <ol>${lesson.ideas.map((idea) => `<li>${esc(idea.title)}</li>`).join('')}</ol>
      <div class="library-learning" data-clarity-mask="true" hidden>
        <span class="learning-state" data-learning-state hidden>Learned</span>
        <span class="learning-summary" data-learning-summary hidden></span>
      </div>
      <a class="text-link" href="lessons/${lesson.slug}.html">Read the lesson <span aria-hidden="true">→</span></a>
    </article>`;
}

function piePoint(percent, radius = 205) {
  const angle = (percent * 3.6 - 90) * Math.PI / 180;
  return { x: 260 + radius * Math.cos(angle), y: 260 + radius * Math.sin(angle) };
}

function topicPieSlices() {
  let offset = 0;
  return topicFamilies.map((family) => {
    const start = piePoint(offset);
    offset += family.share;
    const end = piePoint(offset);
    const largeArc = family.share > 50 ? 1 : 0;
    return `<path class="topic-chart-slice" d="M 260 260 L ${start.x.toFixed(3)} ${start.y.toFixed(3)} A 205 205 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)} Z" fill="${esc(family.color)}" stroke="#faf7f0" stroke-width="5" role="button" tabindex="0" aria-label="${esc(family.label)}: ${family.share}%. Show categories." aria-controls="topic-family-${esc(family.id)}" aria-expanded="false" data-topic-family="${esc(family.id)}"><title>${esc(family.label)}: ${family.share}%</title></path>`;
  }).join('');
}

function renderTopicCoverage() {
  return `<section class="topic-coverage" id="topics" aria-labelledby="topics-title">
        <div class="topic-coverage-heading">
          <h2 id="topics-title">Browse learning topics</h2>
        </div>
        <div class="topic-chart-layout">
          <figure class="topic-chart">
            <svg class="topic-chart-svg" viewBox="0 0 520 520" role="group" aria-labelledby="topic-chart-title topic-chart-desc">
              <title id="topic-chart-title">Planned balance of future lessons</title>
              <desc id="topic-chart-desc">A pie chart showing the planned balance of future lessons. Engineering, product and AI is 45 percent; thinking, behaviour and learning is 15 percent; strategy, leadership and organisations and economics, finance and entrepreneurship are 10 percent each; four other families are 5 percent each.</desc>
              ${topicPieSlices()}
              <path class="topic-chart-selection" data-topic-chart-selection aria-hidden="true" />
              <circle cx="260" cy="260" r="106" fill="#faf7f0" stroke="#18211d" stroke-width="4" />
              <text x="260" y="260" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#18211d">${topicFamilies.length} TOPICS</text>
            </svg>
          </figure>
          <div class="topic-legend" aria-label="Planned topic balance">
            ${topicFamilies.map((family) => `<details class="topic-family-details" id="topic-family-${esc(family.id)}" data-topic-family-details="${esc(family.id)}">
              <summary><span class="topic-swatch" style="--topic-color:${esc(family.color)}" aria-hidden="true"></span><span><strong>${esc(family.label)}</strong><small>${family.categories.length} ${family.categories.length === 1 ? 'category' : 'categories'}</small></span><b>${family.share}%</b></summary>
              <div class="topic-category-grid">
                ${family.categories.map((category) => `<section><h3>${esc(category.label)}</h3><ul>${category.subtopics.map((subtopic) => `<li>${esc(subtopic)}</li>`).join('')}</ul></section>`).join('')}
              </div>
            </details>`).join('')}
          </div>
        </div>
      </section>`;
}

function renderIndex() {
  const latest = lessons[0];
  const libraryCategories = [...new Set(lessons.flatMap((lesson) => lesson.category
    .split('·')
    .map((category) => category.trim())
    .filter(Boolean)))]
    .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }));
  return `<!doctype html>
<html lang="en">
  <head>${head({ title: 'Daily Applied Wisdom', description: 'One excellent book, three practical ideas, and a better way to think.', url: `${siteUrl}/` })}
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${header('')}
    <main id="main">
      <section class="hero" aria-labelledby="hero-title" data-home-intro>
        <p class="eyebrow">A daily learning practice</p>
        <h1 id="hero-title">One book.<br />Three ideas.<br /><em>Better thinking.</em></h1>
        <a class="button" href="#latest" data-dismiss-home-intro>Start with today's lesson <span aria-hidden="true">↓</span></a>
      </section>

      <section class="quick-review" data-quick-review data-clarity-mask="true" aria-labelledby="quick-review-title" hidden>
        <div class="quick-review-intro">
          <p class="eyebrow">Daily review · <span data-quick-review-count>3 questions</span></p>
          <h2 id="quick-review-title">Quick review</h2>
          <p>Answer a few questions from an earlier book. Questions you miss may return later. Your progress stays in this browser.</p>
          <p class="learning-check-summary" data-quick-review-summary></p>
        </div>
        <form data-quick-review-form novalidate>
          <div class="quiz-question-list" data-quick-review-questions></div>
          <div class="learning-check-actions">
            <button class="quiz-submit" type="submit">Check review answers</button>
            <span class="learning-check-action-status" data-quick-review-status aria-live="polite"></span>
          </div>
        </form>
      </section>
      <script id="daw-quick-review-data" type="application/json" data-clarity-mask="true">${quickReviewData()}</script>

      <section class="latest" id="latest" aria-labelledby="latest-title">
        <div class="section-heading"><p class="eyebrow">Latest lesson</p><h2 id="latest-title" tabindex="-1">Today's book</h2></div>
        ${archiveCard(latest, true)}
      </section>

      <section class="library" id="library" aria-labelledby="library-title">
        <div class="library-heading"><h2 id="library-title">Search the catalogue</h2></div>
        <form class="library-controls" data-library-controls role="search" hidden>
          <div class="library-field">
            <label for="library-search">Title, author, topic or idea</label>
            <input id="library-search" type="search" autocomplete="off" placeholder="Search" data-library-search />
          </div>
          <div class="library-field">
            <label for="library-category">Category</label>
            <select id="library-category" data-library-category>
              <option value="">All categories</option>
              ${libraryCategories.map((category) => `<option value="${esc(category)}">${esc(category)}</option>`).join('')}
            </select>
          </div>
          <div class="library-field">
            <label for="library-progress">Learning status</label>
            <select id="library-progress" data-library-progress>
              <option value="">All lessons</option>
              <option value="unlearned" selected>Not yet learned</option>
              <option value="learned">Learned</option>
            </select>
          </div>
          <button class="library-clear" type="reset" data-library-clear>Clear filters</button>
        </form>
        <div class="library-results-bar" data-library-results-bar hidden>
          <p class="library-status" data-library-status tabindex="-1" aria-live="polite"></p>
        </div>
        <div class="library-grid" data-library-grid>${lessons.map((lesson) => archiveCard(lesson)).join('')}</div>
        <div class="library-empty" data-library-empty tabindex="-1" hidden>
          <h3>No lessons found</h3>
          <p>Change your search, category or learning status.</p>
          <button type="button" data-library-empty-clear>Clear filters</button>
        </div>
        <nav class="library-pagination" data-library-pagination aria-label="Library pages" hidden>
          <button type="button" data-library-previous>Previous</button>
          <ol data-library-pages></ol>
          <button type="button" data-library-next>Next</button>
        </nav>
      </section>

      ${renderTopicCoverage()}

    </main>
    ${footer('')}
    ${analyticsConsent('')}
    <script src="script.js"></script>
  </body>
</html>`;
}

function savedIdeaCard(lesson, idea, ideaIndex) {
  const stableIdeaKey = ideaKey(lesson, idea);
  return `<article class="saved-idea-card accent-${esc(lesson.accent)}" data-saved-card data-saved-id="${esc(stableIdeaKey)}" hidden>
      <p class="eyebrow">${esc(lesson.title)} · Idea ${ideaIndex + 1}</p>
      <h2>${esc(idea.title)}</h2>
      <p>${esc(idea.why)}</p>
      <div class="saved-card-actions">
        <a class="text-link" href="lessons/${esc(lesson.slug)}.html#${esc(idea.id)}">Read this idea <span aria-hidden="true">→</span></a>
        <button type="button" data-remove-saved="${esc(stableIdeaKey)}" aria-label="Remove ${esc(idea.title)} from saved ideas">Remove saved idea</button>
      </div>
    </article>`;
}

function renderSaved() {
  const cards = lessons.flatMap((lesson) => lesson.ideas.map((idea, index) => savedIdeaCard(lesson, idea, index))).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>${head({ title: 'Saved ideas | Daily Applied Wisdom', description: 'Ideas saved for later in this browser.', url: `${siteUrl}/saved.html`, noindex: true })}
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="saved-page">
    ${header('')}
    <main id="main">
      <header class="saved-hero">
        <p class="eyebrow">Your reading list</p>
        <h1>Saved ideas</h1>
        <p>Ideas you save appear only in this browser. They are not connected to an account, so they will not appear in another browser or on another device.</p>
        <p class="saved-count" data-saved-count aria-live="polite"></p>
      </header>
      <section class="saved-content" aria-label="Saved ideas">
        <div class="saved-grid" data-saved-grid>${cards}</div>
        <div class="saved-empty" data-saved-empty tabindex="-1" hidden>
          <h2>No saved ideas yet</h2>
          <p>Save an idea from any lesson and it will appear here.</p>
          <a class="button" href="index.html#library">Explore the library</a>
        </div>
        <noscript><p>Turn on JavaScript to view ideas saved in this browser.</p></noscript>
      </section>
    </main>
    ${footer('')}
    <script src="script.js"></script>
  </body>
</html>`;
}

function renderPrivacy() {
  return `<!doctype html>
<html lang="en">
  <head>${head({ title: 'Privacy and data use | Daily Applied Wisdom', description: 'How Daily Applied Wisdom handles learning progress, saved ideas, contact messages, useful reactions, analytics and comments.', url: `${siteUrl}/privacy.html` })}
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body class="privacy-page">
    ${header('')}
    <main id="main" class="privacy-main">
      <header>
        <p class="eyebrow">Plain-language disclosure</p>
        <h1>Privacy and data use</h1>
        <p>This page explains what stays in your browser and what is sent to other services.</p>
      </header>
      <section>
        <h2>Saved ideas</h2>
        <p>“Save idea for later” keeps a small marker in this browser so the Saved ideas page can show it again. The site owner does not receive your saved list, and Microsoft Clarity does not run on the Saved ideas page. Your saved ideas stay in this browser and do not appear on other devices. If you allow analytics on lesson pages, Clarity may record that you selected Save. Removing an idea deletes its marker from this browser.</p>
      </section>
      <section>
        <h2>Learning progress</h2>
        <p>Idea learned markers, learning-check answers, scores and completion times stay in this browser. A book is shown as learned when all 3 of its ideas are learned. Starting the next day, the homepage may offer up to 3 review questions. Questions you miss can return later. The site does not intentionally send your learned list, answers or score to Clarity, and it masks learning content from Clarity recordings. If you allow analytics, Clarity can still record general actions such as clicks and scrolling. Cusdis and Clarity run on some pages, so they may be able to read information stored by this site while they are active. Your progress stays until you clear learning history or this site's data, and it does not appear in other browsers or on other devices.</p>
        <button class="privacy-choice-button" type="button" data-learning-history-open>Clear learning history</button>
        <p data-learning-history-status aria-live="polite"></p>
        <dialog class="confirmation-dialog" data-learning-history-dialog aria-labelledby="clear-learning-history-title">
          <form method="dialog">
            <h3 id="clear-learning-history-title">Clear learning history?</h3>
            <p>This removes learned markers, first attempts and quick-review progress from this browser. Saved ideas and useful markers remain.</p>
            <div class="confirmation-dialog-actions">
              <button type="submit" value="cancel">Cancel</button>
              <button class="destructive-button" type="button" data-clear-learning-history>Clear history</button>
            </div>
          </form>
        </dialog>
      </section>
      <section>
        <h2>Useful reactions and Microsoft Clarity</h2>
        <p>“Mark idea useful” sends the book and idea reference to the owner's Microsoft Clarity account. It does not ask for your name, email or an account. A marker in your browser helps prevent repeat reactions. Clearing this site's data removes that marker. Network problems or privacy tools may stop a reaction from being delivered.</p>
        <p>When Clarity runs, it receives standard information about your connection, device and page interactions. These reactions are private feedback, not a verified public vote. The site does not show public reaction counts or connect reactions to a named visitor.</p>
      </section>
      <section>
        <h2>Analytics preferences</h2>
        <p>If you allow analytics, Microsoft Clarity can connect your visits across pages, except on the Saved ideas page where Clarity never loads. Advertising remains off. If you reject analytics, ordinary browsing continues without Clarity. If you later choose “Mark idea useful,” the site can send that one reaction without setting Clarity cookies.</p>
        <button class="privacy-choice-button" type="button" data-analytics-reset>Change analytics choice</button>
      </section>
      <section>
        <h2>Comments</h2>
        <p>Each lesson's comments are hosted by Cusdis. When you open the comment form, Cusdis receives information such as your IP address and browser details. You can comment without an account. A nickname is requested, email is optional, and comments may wait for approval before appearing.</p>
      </section>
      <section>
        <h2>Contact and anonymous feedback</h2>
        <p>The Contact link opens a form hosted by Tally in a new tab. The form is not embedded in Daily Applied Wisdom pages and no form data is sent merely by browsing this site.</p>
        <p>A message is required. The reason, name and email fields are optional. If you submit without a name or email address, the message is anonymous to the site owner, but the owner cannot reply. When you submit, Tally processes and stores the message and any optional details you provide, then sends the owner an email notification.</p>
      </section>
      <section>
        <h2>Sharing</h2>
        <p>The lesson sharing control uses your device's share feature when available. If your device does not offer sharing, it copies the lesson link to your clipboard.</p>
      </section>
      <section>
        <h2>External services</h2>
        <ul>
          <li><a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">Microsoft privacy statement <span aria-hidden="true">↗</span></a></li>
          <li><a href="https://cusdis.com/" target="_blank" rel="noreferrer">Cusdis service information <span aria-hidden="true">↗</span></a></li>
          <li><a href="https://tally.so/help/terms-and-privacy" target="_blank" rel="noreferrer">Tally terms and privacy information <span aria-hidden="true">↗</span></a></li>
        </ul>
      </section>
    </main>
    ${footer('')}
    ${analyticsConsent('')}
    <script src="script.js"></script>
  </body>
</html>`;
}

function renderFeed() {
  const items = lessons.map((lesson) => `<item><title>${esc(lesson.title)}</title><link>${lessonUrl(lesson)}</link><guid>${lessonUrl(lesson)}</guid><pubDate>${new Date(`${lesson.date}T08:00:00+10:00`).toUTCString()}</pubDate><description>${esc(lesson.summary)}</description></item>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Daily Applied Wisdom</title><link>${siteUrl}/</link><description>One book. Three ideas. Better thinking.</description>${items}</channel></rss>`;
}

function renderSitemap() {
  const urls = [`${siteUrl}/`, ...lessons.map(lessonUrl)].map((url) => `<url><loc>${url}</loc></url>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

function renderNotFound() {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Daily Applied Wisdom</title><link rel="stylesheet" href="/daily-applied-wisdom/styles.css"></head><body><main class="hero"><p class="eyebrow">404 · Page not found</p><h1>That idea<br>isn't here.</h1><p class="hero-copy">The library may have moved. Return to the complete collection.</p><a class="button" href="/daily-applied-wisdom/">Browse all lessons →</a></main></body></html>\n`;
}

function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
}

const normalizeRelativePath = (relativePath) => relativePath.split('/').join(path.sep);
const outputEntries = new Map([
  ['404.html', renderNotFound()],
  ['index.html', renderIndex()],
  ['saved.html', renderSaved()],
  ['privacy.html', renderPrivacy()],
  ['feed.xml', renderFeed()],
  ['sitemap.xml', renderSitemap()],
  ['robots.txt', renderRobots()],
  ...lessons.map((lesson, index) => [`lessons/${lesson.slug}.html`, renderLesson(lesson, index)])
]);
const expectedLessonFiles = new Set(lessons.map((lesson) => `${lesson.slug}.html`));
const lessonsDirectory = path.resolve(root, 'lessons');

function assertContainedPath(candidate, parent, label) {
  const relative = path.relative(parent, candidate);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
    throw new Error(`Refusing to ${label} outside ${parent}: ${candidate}`);
  }
}

async function listObsoleteLessonPages() {
  let directoryInfo;
  try {
    directoryInfo = await lstat(lessonsDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  if (!directoryInfo.isDirectory() || directoryInfo.isSymbolicLink()) {
    throw new Error(`Refusing to manage lesson pages through a non-directory or symbolic link: ${lessonsDirectory}`);
  }

  let entries;
  try {
    entries = await readdir(lessonsDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && !expectedLessonFiles.has(entry.name))
    .map((entry) => {
      const target = path.resolve(lessonsDirectory, entry.name);
      assertContainedPath(target, lessonsDirectory, 'remove an obsolete lesson page');
      return { relativePath: `lessons/${entry.name}`, target };
    });
}

async function checkGeneratedOutputs() {
  const problems = [];
  const normalizeLineEndings = (value) => value.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
  for (const [relativePath, expected] of outputEntries) {
    const target = path.resolve(root, normalizeRelativePath(relativePath));
    assertContainedPath(target, root, 'read a generated output');
    try {
      const actual = await readFile(target, 'utf8');
      if (normalizeLineEndings(actual) !== normalizeLineEndings(expected)) problems.push(`different: ${relativePath}`);
    } catch (error) {
      if (error.code === 'ENOENT') problems.push(`missing: ${relativePath}`);
      else throw error;
    }
  }

  for (const { relativePath } of await listObsoleteLessonPages()) problems.push(`stale: ${relativePath}`);

  if (problems.length) {
    console.error('Generated site output is not current:');
    for (const problem of problems) console.error(`- ${problem}`);
    console.error('Run `node tools/build-site.mjs`, then commit every generated output.');
    process.exitCode = 1;
    return;
  }

  console.log(`Generated site output is current (${outputEntries.size} files).`);
}

async function writeGeneratedOutputs() {
  await mkdir(lessonsDirectory, { recursive: true });
  const obsoleteLessonPages = await listObsoleteLessonPages();

  await Promise.all([...outputEntries].map(([relativePath, contents]) => {
    const target = path.resolve(root, normalizeRelativePath(relativePath));
    assertContainedPath(target, root, 'write a generated output');
    return writeFile(target, contents);
  }));
  for (const { target } of obsoleteLessonPages) await rm(target);

  console.log(`Built ${lessons.length} lesson pages and ${outputEntries.size - lessons.length} shared site files.`);
  if (obsoleteLessonPages.length) {
    console.log(`Removed ${obsoleteLessonPages.length} obsolete lesson page${obsoleteLessonPages.length === 1 ? '' : 's'}.`);
  }
}

if (checkOnly) await checkGeneratedOutputs();
else await writeGeneratedOutputs();
