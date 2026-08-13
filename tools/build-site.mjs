import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const { lessons } = JSON.parse(await readFile(path.join(root, 'content', 'lessons.json'), 'utf8'));
const siteUrl = 'https://djorchard.github.io/daily-applied-wisdom';
const cusdisAppId = '714bda94-6019-4858-968f-91b3b5bb1c13';

const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const paragraphList = (items) => items.map((item) => `<p>${esc(item)}</p>`).join('\n');
const lessonUrl = (lesson) => `${siteUrl}/lessons/${lesson.slug}.html`;

function head({ title, description, url, article = false, published }) {
  const assetPrefix = article ? '../' : '';
  return `
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:type" content="${article ? 'article' : 'website'}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${siteUrl}/assets/social-card.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="Daily Applied Wisdom — One book. Three ideas. Better thinking." />
${published ? `    <meta property="article:published_time" content="${published}" />\n` : ''}    <meta name="twitter:card" content="summary_large_image" />
    <meta name="theme-color" content="#f5f1e8" />
    <link rel="icon" href="${assetPrefix}assets/favicon.svg" type="image/svg+xml" />
    <title>${esc(title)}</title>`;
}

function header(prefix = '') {
  return `<a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <a class="brand" href="${prefix}index.html" aria-label="Daily Applied Wisdom home">Daily Applied Wisdom</a>
      <nav aria-label="Main navigation">
        <a href="${prefix}index.html#latest">Latest</a>
        <a href="${prefix}index.html#library">Library</a>
        <a href="${prefix}index.html#about">About</a>
      </nav>
    </header>`;
}

function footer(prefix = '') {
  return `<footer id="about">
      <span>Daily Applied Wisdom</span>
      <span>One book. Three ideas. Better thinking.</span>
      <a href="${prefix}feed.xml">RSS</a>
      <span>© 2026</span>
    </footer>`;
}

function renderIdea(lesson, idea, index) {
  const ideaNumber = index + 1;
  return `<section class="lesson-idea accent-${lesson.accent}" id="idea-${ideaNumber}" aria-labelledby="idea-${ideaNumber}-title">
      <div class="idea-marker" aria-hidden="true">0${ideaNumber}</div>
      <div class="idea-main">
        <p class="eyebrow">Idea ${ideaNumber}</p>
        <h2 id="idea-${ideaNumber}-title">${esc(idea.title)} <a class="anchor-link" href="#idea-${ideaNumber}" aria-label="Link to Idea ${ideaNumber}">#</a></h2>
        <h3>The idea</h3>
        ${paragraphList(idea.argument)}
        <aside class="interpretation"><strong>Applied interpretation.</strong> ${esc(idea.extension)}</aside>
        <figure class="lesson-visual">
          <div class="visual-scroll" tabindex="0" aria-label="Scrollable lesson diagram">
            <img src="${esc(idea.image)}" alt="${esc(idea.imageAlt)}" width="1200" height="760" loading="lazy" decoding="async" />
          </div>
          <span class="visual-scroll-hint" aria-hidden="true">Swipe to explore the diagram →</span>
          <figcaption>${esc(idea.imageCaption)}</figcaption>
        </figure>
        <div class="practice-grid">
          <section><h3>Why it matters</h3><p>${esc(idea.why)}</p></section>
          <section><h3>Apply it today</h3>${paragraphList(idea.apply)}</section>
          <section class="caveat"><h3>Caveat or failure mode</h3><p>${esc(idea.caveat)}</p></section>
        </div>
        <section class="questions" aria-labelledby="idea-${ideaNumber}-questions">
          <h3 id="idea-${ideaNumber}-questions">Reinforcement questions</h3>
          <ol>${idea.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
        </section>
        <button class="idea-reaction" type="button" data-reaction="${esc(lesson.slug)}-idea-${ideaNumber}" aria-pressed="false" aria-label="Save Idea ${ideaNumber} as useful on this device">
          <span aria-hidden="true">♡</span> Save as useful
        </button>
      </div>
    </section>`;
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
    author: lesson.authors.split(/, | and /).map((name) => ({ '@type': 'Person', name })),
    isPartOf: { '@type': 'WebSite', name: 'Daily Applied Wisdom', url: siteUrl },
    url: lessonUrl(lesson),
    educationalUse: 'Active recall and practical application'
  }).replaceAll('<', '\\u003c');

  return `<!doctype html>
<html lang="en">
  <head>${head({ title: `${lesson.title} — Daily Applied Wisdom`, description: lesson.summary, url: lessonUrl(lesson), article: true, published: lesson.date })}
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
          <div class="share-row">
            <button class="share-button" type="button" data-share data-share-title="${esc(lesson.title)} — Daily Applied Wisdom" data-share-text="${esc(lesson.summary)}" data-share-url="${lessonUrl(lesson)}">Share this lesson <span aria-hidden="true">↗</span></button>
            <button class="copy-button" type="button" data-copy-url="${lessonUrl(lesson)}">Copy link</button>
            <span class="share-status" aria-live="polite"></span>
          </div>
          <nav class="idea-jump" aria-label="Ideas in this lesson">
            ${lesson.ideas.map((idea, ideaIndex) => `<a href="#idea-${ideaIndex + 1}"><span>0${ideaIndex + 1}</span>${esc(idea.title)}</a>`).join('')}
          </nav>
        </header>

        ${lesson.ideas.map((idea, ideaIndex) => renderIdea(lesson, idea, ideaIndex)).join('\n')}

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

      <aside class="reader-feedback" aria-labelledby="feedback-title">
        <p class="eyebrow">The reading room</p>
        <h2 id="feedback-title">What did this change for you?</h2>
        <p class="comments-note">This form is provided by Cusdis, so loading it shares standard connection data with that service. You can post without an account; email is optional, and comments may be held for moderation.</p>
        <div id="cusdis_thread" data-host="https://cusdis.com" data-app-id="${cusdisAppId}" data-page-id="${esc(lesson.slug)}" data-page-url="${esc(lessonUrl(lesson))}" data-page-title="${esc(lesson.title)} — Daily Applied Wisdom"></div>
        <noscript><p>Enable JavaScript to read or join the discussion.</p></noscript>
        <script async defer src="https://cusdis.com/js/cusdis.es.js"></script>
      </aside>

      <nav class="lesson-pagination" aria-label="Lesson navigation">
        ${older ? `<a href="${older.slug}.html"><span>Previous</span>${esc(older.title)}</a>` : '<span></span>'}
        ${newer ? `<a class="next" href="${newer.slug}.html"><span>Next</span>${esc(newer.title)}</a>` : '<span></span>'}
      </nav>
    </main>
    ${footer('../')}
    <script src="../script.js"></script>
  </body>
</html>`;
}

function archiveCard(lesson, featured = false) {
  return `<article class="library-card accent-${lesson.accent}${featured ? ' featured-card' : ''}">
      <p class="eyebrow">${esc(lesson.edition)} · <time datetime="${lesson.date}">${esc(lesson.dateLabel)}</time></p>
      <p class="category">${esc(lesson.category)}</p>
      <h3><a href="lessons/${lesson.slug}.html">${esc(lesson.title)}</a></h3>
      <p class="card-author">${esc(lesson.authors)} · ${esc(lesson.year)}</p>
      <p>${esc(lesson.summary)}</p>
      <ol>${lesson.ideas.map((idea) => `<li>${esc(idea.title)}</li>`).join('')}</ol>
      <a class="text-link" href="lessons/${lesson.slug}.html">Read the lesson <span aria-hidden="true">→</span></a>
    </article>`;
}

function renderIndex() {
  const latest = lessons[0];
  return `<!doctype html>
<html lang="en">
  <head>${head({ title: 'Daily Applied Wisdom', description: 'One excellent book, three practical ideas, and a better way to think.', url: `${siteUrl}/` })}
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    ${header('')}
    <main id="main">
      <section class="hero" aria-labelledby="hero-title">
        <p class="eyebrow">A daily learning practice</p>
        <h1 id="hero-title">One book.<br />Three ideas.<br /><em>Better thinking.</em></h1>
        <p class="hero-copy">A small, rigorous reading room for ideas worth carrying into your work and life—designed for application, recall and healthy scepticism.</p>
        <a class="button" href="#latest">Start with today's lesson <span aria-hidden="true">↓</span></a>
      </section>

      <section class="latest" id="latest" aria-labelledby="latest-title">
        <div class="section-heading"><p class="eyebrow">Latest lesson</p><h2 id="latest-title">Today's book</h2></div>
        ${archiveCard(latest, true)}
      </section>

      <section class="library" id="library" aria-labelledby="library-title">
        <div class="library-heading"><p class="eyebrow">The library · ${lessons.length} lessons</p><h2 id="library-title">Ideas to revisit,<br />not summaries to collect.</h2><p>Every lesson separates the author's argument from practical extension, includes a failure mode, and ends with active recall and a small experiment.</p></div>
        <div class="library-grid">${lessons.map((lesson) => archiveCard(lesson)).join('')}</div>
      </section>

      <section class="about" id="about" aria-labelledby="about-title">
        <p class="eyebrow">Why this exists</p>
        <h2 id="about-title">Reading becomes useful when an idea survives contact with a real decision.</h2>
        <div><p>Daily Applied Wisdom is built around three carefully chosen ideas rather than a whole-book summary. Each idea is explained, challenged, visualised and turned into something testable today.</p><p>The goal is not passive inspiration. It is a growing library of mental models you can retrieve, question and use.</p></div>
      </section>
    </main>
    ${footer('')}
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

await mkdir(path.join(root, 'lessons'), { recursive: true });
await Promise.all([
  writeFile(path.join(root, 'index.html'), renderIndex()),
  writeFile(path.join(root, 'feed.xml'), renderFeed()),
  writeFile(path.join(root, 'sitemap.xml'), renderSitemap()),
  ...lessons.map((lesson, index) => writeFile(path.join(root, 'lessons', `${lesson.slug}.html`), renderLesson(lesson, index)))
]);

console.log(`Built ${lessons.length} lesson pages, index, feed and sitemap.`);
