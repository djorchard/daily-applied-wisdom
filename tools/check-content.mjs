import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.cwd());
const siteUrl = 'https://djorchard.github.io/daily-applied-wisdom';
const contactFormUrl = 'https://tally.so/r/RGelGj';
const siteBasePath = `${new URL(siteUrl).pathname}/`;
const cusdisAppId = '714bda94-6019-4858-968f-91b3b5bb1c13';
const clarityProjectId = 'y1mr2l6g3q';
const fail = (message) => { throw new Error(message); };
const present = (value) => typeof value === 'string' && value.trim().length > 0;
const missingFiles = [];
const pathIsInside = (candidate, parent = root) => {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
const displayPath = (candidate) => path.relative(root, candidate).split(path.sep).join('/');
const readRequiredFile = async (candidate, context) => {
  try {
    return await readFile(candidate, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      missingFiles.push(`${context}: ${displayPath(candidate)}`);
      return null;
    }
    throw error;
  }
};
const requireFile = async (candidate, context) => {
  try {
    await readFile(candidate);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      missingFiles.push(`${context}: ${displayPath(candidate)}`);
      return false;
    }
    throw error;
  }
};
const assertWellFormedXml = (source, label, expectedRoot) => {
  if (!source.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    fail(`${label} needs its UTF-8 XML declaration.`);
  }

  const withoutCdata = source.replaceAll(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(withoutCdata)) {
    fail(`${label} contains an unescaped or invalid XML entity.`);
  }

  const tokenPattern = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[\s\S]*?>|<\/?[A-Za-z_][A-Za-z0-9_.:-]*(?:\s[^<>]*?)?\/?>/g;
  const stack = [];
  let cursor = 0;
  let root = null;
  let rootCount = 0;
  let match;

  while ((match = tokenPattern.exec(source)) !== null) {
    const text = source.slice(cursor, match.index);
    if (/[<>]/.test(text) || (stack.length === 0 && text.trim())) fail(`${label} is not well-formed XML.`);
    cursor = tokenPattern.lastIndex;

    const token = match[0];
    if (token.startsWith('<?') || token.startsWith('<!--') || token.startsWith('<![CDATA[')) continue;
    if (token.startsWith('<!DOCTYPE')) fail(`${label} must not contain a document type declaration.`);

    const name = token.match(/^<\/?([A-Za-z_][A-Za-z0-9_.:-]*)/)?.[1];
    if (!name) fail(`${label} contains an invalid XML tag.`);
    if (token.startsWith('</')) {
      if (stack.pop() !== name) fail(`${label} has mismatched XML tags near </${name}>.`);
      continue;
    }

    if (stack.length === 0) {
      rootCount += 1;
      root ??= name;
    }
    if (!token.endsWith('/>')) stack.push(name);
  }

  const trailingText = source.slice(cursor);
  if (/[<>]/.test(trailingText) || (stack.length === 0 && trailingText.trim())) fail(`${label} is not well-formed XML.`);
  if (stack.length) fail(`${label} has an unclosed <${stack.at(-1)}> element.`);
  if (rootCount !== 1 || root !== expectedRoot) fail(`${label} must have one <${expectedRoot}> root element.`);
};
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const { lessons } = JSON.parse(await readFile(path.join(root, 'content', 'lessons.json'), 'utf8'));
const topicCatalog = JSON.parse(await readFile(path.join(root, 'content', 'topic-catalog.json'), 'utf8'));

const expectedTopicCategories = [
  'Product Design & UX', 'Software Engineering', 'AI & Emerging Technology', 'Product Management',
  'Systems Thinking', 'Decision Making & Rationality', 'Psychology', 'Human Behaviour', 'Strategy',
  'Problem Solving', 'Leadership & Management', 'Workplace Politics & Organisations', 'Economics',
  'Finance & Investing', 'Entrepreneurship', 'Automation & Productivity',
  'Cybersecurity & Adversarial Thinking', 'History', 'Military Strategy & Warfare', 'Geopolitics',
  'Science & Technology History', 'Future & Forecasting', 'Game Design', 'Simulation & Complex Systems',
  'Music & Creativity', 'Philosophy', 'Science of Learning', 'Biographies', 'Narrative Non-Fiction'
];

if (!Array.isArray(topicCatalog.families) || topicCatalog.families.length !== 8) {
  fail('The topic catalog must contain eight public chart families.');
}
if (topicCatalog.families.reduce((sum, family) => sum + family.share, 0) !== 100) {
  fail('Topic family discovery shares must total 100.');
}
const topicFamilyIds = new Set();
const topicCategoryIds = new Set();
const topicCategoryLabels = [];
for (const family of topicCatalog.families) {
  if (!present(family.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(family.id) || topicFamilyIds.has(family.id)) {
    fail(`Invalid or duplicate topic family ID: ${family.id ?? '(missing)'}.`);
  }
  topicFamilyIds.add(family.id);
  if (!present(family.label) || !Number.isFinite(family.share) || family.share <= 0 || !/^#[0-9a-f]{6}$/i.test(family.color)) {
    fail(`${family.id} has invalid chart metadata.`);
  }
  if (!Array.isArray(family.categories) || !family.categories.length) fail(`${family.id} needs topic categories.`);
  for (const category of family.categories) {
    if (!present(category.id) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category.id) || topicCategoryIds.has(category.id)) {
      fail(`Invalid or duplicate topic category ID: ${category.id ?? '(missing)'}.`);
    }
    topicCategoryIds.add(category.id);
    if (!present(category.label)) fail(`${category.id} needs a display label.`);
    topicCategoryLabels.push(category.label);
    if (!Array.isArray(category.subtopics) || !category.subtopics.length || category.subtopics.some((subtopic) => !present(subtopic))) {
      fail(`${category.label} needs non-empty subtopics.`);
    }
    if (new Set(category.subtopics).size !== category.subtopics.length) fail(`${category.label} has duplicate subtopics.`);
  }
}
if (
  topicCategoryLabels.length !== expectedTopicCategories.length ||
  expectedTopicCategories.some((label) => !topicCategoryLabels.includes(label))
) fail('The topic catalog does not contain the complete required 29-category randomizer.');

if (!Array.isArray(lessons) || lessons.length < 1) {
  fail('Expected at least one lesson.');
}

const slugs = new Set();
const discussionIds = new Set();
const lessonDates = new Set();
const lessonVisuals = new Set();
const stableIdeaKeys = new Set();
const clarityEventNames = new Set();
const stableQuestionKeys = new Set();
const allowedAccents = new Set(['green', 'blue', 'orange', 'gold', 'purple']);
let quizQuestionCount = 0;
let uniquelyLongestCorrectCount = 0;
const clarityEventName = (lesson, idea) => `dawUseful${`${lesson.slug}-${idea.id}`
  .split(/[^a-zA-Z0-9]+/)
  .filter(Boolean)
  .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
  .join('')}`;
for (const lesson of lessons) {
  for (const field of ['slug', 'discussionId', 'date', 'dateLabel', 'edition', 'title', 'authors', 'summary', 'evidenceNote', 'takeaway', 'quizRevision', 'accent']) {
    if (!present(lesson[field])) fail(`${lesson.slug ?? 'Unknown lesson'} is missing ${field}.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug)) fail(`${lesson.slug} is not a URL-safe lesson slug.`);
  if (!allowedAccents.has(lesson.accent)) fail(`${lesson.slug} has an unsupported accent token.`);
  if (slugs.has(lesson.slug)) fail(`Duplicate lesson slug: ${lesson.slug}.`);
  slugs.add(lesson.slug);
  const parsedDate = new Date(`${lesson.date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(lesson.date) ||
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== lesson.date
  ) fail(`${lesson.slug} has an invalid lesson date.`);
  if (lessonDates.has(lesson.date)) fail(`Duplicate lesson date: ${lesson.date}. Every lesson needs its own day.`);
  lessonDates.add(lesson.date);
  if (lesson.edition !== 'Daily lesson') fail(`${lesson.slug} must be labelled Daily lesson.`);
  const expectedDateLabel = new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
  }).format(parsedDate);
  if (lesson.dateLabel !== expectedDateLabel) fail(`${lesson.slug} has a date label that does not match ${lesson.date}.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.discussionId)) fail(`${lesson.discussionId} is not a safe discussion ID.`);
  if (discussionIds.has(lesson.discussionId)) fail(`Duplicate book discussion ID: ${lesson.discussionId}.`);
  discussionIds.add(lesson.discussionId);

  if (!Array.isArray(lesson.ideas) || lesson.ideas.length !== 3) {
    fail(`${lesson.title} must contain exactly three ideas.`);
  }
  let lessonUniquelyLongestCorrectCount = 0;

  for (const [index, idea] of lesson.ideas.entries()) {
    const label = `${lesson.title}, idea ${index + 1}`;
    for (const field of ['id', 'title', 'extension', 'image', 'imageAlt', 'imageCaption', 'why', 'caveat']) {
      if (!present(idea[field])) fail(`${label} is missing ${field}.`);
    }
    if (!/^idea-[1-9][0-9]*$/.test(idea.id)) fail(`${label} needs a stable ID such as idea-1.`);
    const stableIdeaKey = `${lesson.slug}-${idea.id}`;
    if (stableIdeaKeys.has(stableIdeaKey)) fail(`Duplicate stable idea ID: ${stableIdeaKey}.`);
    stableIdeaKeys.add(stableIdeaKey);
    const eventName = clarityEventName(lesson, idea);
    if (clarityEventNames.has(eventName)) fail(`Duplicate Clarity event name: ${eventName}.`);
    clarityEventNames.add(eventName);
    if (!Array.isArray(idea.argument) || idea.argument.length < 1) fail(`${label} needs an attributed explanation.`);
    if (!Array.isArray(idea.apply) || idea.apply.length < 1) fail(`${label} needs an application step.`);
    if (!Array.isArray(idea.quiz) || idea.quiz.length !== 2) fail(`${label} must have exactly two learning-check questions.`);
    const questionTypes = new Set();
    for (const [questionIndex, question] of idea.quiz.entries()) {
      const questionLabel = `${label}, question ${questionIndex + 1}`;
      for (const field of ['id', 'type', 'question', 'feedback']) {
        if (!present(question[field])) fail(`${questionLabel} is missing ${field}.`);
      }
      if (!/^q[1-9][0-9]*$/.test(question.id)) fail(`${questionLabel} needs a stable ID such as q1.`);
      const stableQuestionKey = `${lesson.slug}-${idea.id}-${question.id}`;
      if (stableQuestionKeys.has(stableQuestionKey)) fail(`Duplicate stable question ID: ${stableQuestionKey}.`);
      stableQuestionKeys.add(stableQuestionKey);
      if (!['concept', 'application'].includes(question.type)) fail(`${questionLabel} must be a concept or application question.`);
      if (questionTypes.has(question.type)) fail(`${label} must have one concept and one application question.`);
      questionTypes.add(question.type);
      if (!Array.isArray(question.options) || question.options.length !== 4 || question.options.some((option) => !present(option))) {
        fail(`${questionLabel} must have exactly four non-empty options.`);
      }
      if (new Set(question.options.map((option) => option.trim())).size !== 4) fail(`${questionLabel} must have four unique options.`);
      if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
        fail(`${questionLabel} needs one valid correct option.`);
      }
      const optionLengths = question.options.map((option) => option.trim().length);
      if (Math.max(...optionLengths) - Math.min(...optionLengths) > 40) {
        fail(`${questionLabel} has an option-length spread that can reveal the answer.`);
      }
      const longestLength = Math.max(...optionLengths);
      if (optionLengths[question.correctIndex] === longestLength && optionLengths.filter((length) => length === longestLength).length === 1) {
        uniquelyLongestCorrectCount += 1;
        lessonUniquelyLongestCorrectCount += 1;
      }
      quizQuestionCount += 1;
      if (!Array.isArray(question.feedbackByOption) || question.feedbackByOption.length !== 4 || question.feedbackByOption.some((feedback) => !present(feedback))) {
        fail(`${questionLabel} needs feedback for all four options.`);
      }
      if (!question.feedbackByOption[question.correctIndex].startsWith('Correct.')) {
        fail(`${questionLabel} must label the correct option feedback clearly.`);
      }
    }
    if (!idea.image.endsWith('.svg')) fail(`${label} must use a scalable SVG visual.`);
    const visualPath = path.resolve(root, 'lessons', idea.image);
    if (!pathIsInside(visualPath)) fail(`${label} references a visual outside the repository.`);
    const svg = await readRequiredFile(visualPath, `${label} is missing its visual`);
    if (svg === null) continue;
    if (!svg.includes('viewBox="0 0 1200 760"')) fail(`${label} must use the standard 1200 by 760 canvas.`);
    if (!svg.includes('role="img"') || !svg.includes('<title') || !svg.includes('<desc')) fail(`${label} needs accessible SVG metadata.`);
    if (/<image\b/i.test(svg)) fail(`${label} contains an embedded raster image.`);
    const fontSizes = [
      ...[...svg.matchAll(/font-size="([0-9.]+)"/g)].map((match) => Number(match[1])),
      ...[...svg.matchAll(/font-size:\s*([0-9.]+)px/g)].map((match) => Number(match[1]))
    ];
    if (!fontSizes.length || Math.min(...fontSizes) < 22) fail(`${label} contains text smaller than the 22px diagram minimum.`);
    lessonVisuals.add(path.normalize(visualPath).toLowerCase());
  }
  if (lessonUniquelyLongestCorrectCount > 3) {
    fail(`${lesson.title} makes the correct option uniquely longest too often.`);
  }

  const minutes = Number.parseInt(lesson.experiment?.duration, 10);
  if (!Number.isFinite(minutes) || minutes > 10) fail(`${lesson.title} needs an experiment of ten minutes or less.`);
  if (!Array.isArray(lesson.experiment.steps) || lesson.experiment.steps.length < 1) fail(`${lesson.title} needs experiment steps.`);
  if (!Array.isArray(lesson.sources) || lesson.sources.length < 2) fail(`${lesson.title} needs at least two source notes.`);
  for (const source of lesson.sources) {
    if (!present(source.label) || !URL.canParse(source.url) || !source.url.startsWith('https://')) {
      fail(`${lesson.title} has an invalid source note.`);
    }
  }

  const generatedLessonPath = path.join(root, 'lessons', `${lesson.slug}.html`);
  const generatedLesson = await readRequiredFile(generatedLessonPath, `${lesson.title} is missing its generated page`);
  if (generatedLesson === null) continue;
  const canonicalUrl = `${siteUrl}/lessons/${lesson.slug}.html`;
  if (generatedLesson.includes('YOUR_CUSDIS_APP_ID') || !generatedLesson.includes(`data-app-id="${cusdisAppId}"`)) {
    fail(`${lesson.title} is not connected to the configured Cusdis app.`);
  }
  if (
    !generatedLesson.includes('data-host="https://cusdis.com"') ||
    !generatedLesson.includes(`data-page-id="${lesson.discussionId}"`) ||
    !generatedLesson.includes(`data-page-url="${canonicalUrl}"`) ||
    !generatedLesson.includes(`data-page-title="${esc(lesson.title)} | Daily Applied Wisdom"`) ||
    !generatedLesson.includes(`<link rel="canonical" href="${canonicalUrl}" />`) ||
    !generatedLesson.includes('<link rel="alternate" type="application/rss+xml" title="Daily Applied Wisdom RSS" href="../feed.xml" />') ||
    !generatedLesson.includes('data-theme="light"') ||
    !/<aside class="reader-feedback"[^>]*data-cusdis-comments[^>]*data-clarity-mask="true"/.test(generatedLesson) ||
    !generatedLesson.includes('data-cusdis-status') ||
    !generatedLesson.includes('data-cusdis-retry hidden') ||
    !generatedLesson.includes('data-analytics-consent') ||
    !generatedLesson.includes('data-analytics-status') ||
    !generatedLesson.includes('What did this book change for you?') ||
    !generatedLesson.includes('Cusdis receives information such as your IP address and browser details.')
  ) {
    fail(`${lesson.title} has incomplete Cusdis page identity or script configuration.`);
  }
  if (generatedLesson.includes('reaction-note') || generatedLesson.includes('Saved markers stay in this browser')) {
    fail(`${lesson.title} repeats the Clarity disclosure below every idea instead of keeping it on the Privacy page.`);
  }
  if ((generatedLesson.match(/id="cusdis_thread"/g) || []).length !== 1 || /<script\b[^>]*\bcusdis\.es\.js/i.test(generatedLesson)) {
    fail(`${lesson.title} must contain one Cusdis container and leave script loading to the client loader.`);
  }
  if (
    (generatedLesson.match(/\bdata-visual-scroll(?:\s|>)/g) || []).length !== 3 ||
    (generatedLesson.match(/\bdata-visual-scroll-hint(?:\s|>)/g) || []).length !== 3 ||
    /<div class="visual-scroll"[^>]*(?:tabindex|role|aria-label)=/i.test(generatedLesson)
  ) {
    fail(`${lesson.title} must keep diagram regions inert until overflow is detected by the client script.`);
  }
  const schemaMatch = generatedLesson.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  let schema;
  try {
    schema = schemaMatch ? JSON.parse(schemaMatch[1]) : null;
  } catch {
    fail(`${lesson.title} has invalid JSON-LD.`);
  }
  const expectedAuthors = lesson.authors.split(/, | and /);
  if (
    !schema ||
    Object.hasOwn(schema, 'author') ||
    schema.about?.['@type'] !== 'Book' ||
    schema.about?.name !== lesson.title ||
    !Array.isArray(schema.about?.author) ||
    schema.about.author.map((author) => author.name).join('\n') !== expectedAuthors.join('\n')
  ) {
    fail(`${lesson.title} must attribute the book's authors under an about Book in its JSON-LD.`);
  }
  for (const [index, idea] of lesson.ideas.entries()) {
    const stableIdeaKey = `${lesson.slug}-${idea.id}`;
    if (
      !generatedLesson.includes(`id="${idea.id}"`) ||
      !generatedLesson.includes(`data-save-id="${stableIdeaKey}"`) ||
      !generatedLesson.includes(`data-idea-number="${index + 1}"`) ||
      !generatedLesson.includes(`data-useful-id="${stableIdeaKey}"`) ||
      !generatedLesson.includes(`data-clarity-event="${clarityEventName(lesson, idea)}"`)
    ) {
      fail(`${lesson.title}, idea ${index + 1} has incomplete save or useful-reaction controls.`);
    }
    for (const question of idea.quiz) {
      const stableQuestionKey = `${lesson.slug}-${idea.id}-${question.id}`;
      if (!generatedLesson.includes(`data-question-id="${stableQuestionKey}"`)) {
        fail(`${lesson.title} is missing learning-check question ${stableQuestionKey}.`);
      }
    }
  }
  if (
    !generatedLesson.includes('id="learning-check"') ||
    !generatedLesson.includes(`data-quiz-revision="${lesson.quizRevision}"`) ||
    !generatedLesson.includes('Answer all 6, then check your answers.') ||
    !generatedLesson.includes('Check answers') ||
    !generatedLesson.includes('Practice again') ||
    !/<section class="learning-check"[^>]*data-clarity-mask="true"/.test(generatedLesson) ||
    (generatedLesson.match(/data-quiz-question/g) || []).length !== 6 ||
    (generatedLesson.match(/data-quiz-option/g) || []).length !== 24 ||
    (generatedLesson.match(/ required aria-describedby=/g) || []).length !== 24 ||
    (generatedLesson.match(/data-quiz-correct-answer/g) || []).length !== 6
  ) fail(`${lesson.title} has incomplete learning-check markup.`);
}

const [clientScript, savedPage, indexPage, privacyPage, styles, feed, sitemap] = await Promise.all([
  readRequiredFile(path.join(root, 'script.js'), 'The client script is missing'),
  readRequiredFile(path.join(root, 'saved.html'), 'The Saved ideas page is missing'),
  readRequiredFile(path.join(root, 'index.html'), 'The homepage is missing'),
  readRequiredFile(path.join(root, 'privacy.html'), 'The privacy page is missing'),
  readRequiredFile(path.join(root, 'styles.css'), 'The site stylesheet is missing'),
  readRequiredFile(path.join(root, 'feed.xml'), 'The RSS feed is missing'),
  readRequiredFile(path.join(root, 'sitemap.xml'), 'The sitemap is missing')
]);

if (missingFiles.length) {
  fail(`Missing required site files:\n${missingFiles.map((message) => `- ${message}`).join('\n')}`);
}

assertWellFormedXml(feed, 'feed.xml', 'rss');
assertWellFormedXml(sitemap, 'sitemap.xml', 'urlset');

if (uniquelyLongestCorrectCount > Math.floor(quizQuestionCount / 3)) {
  fail('Correct options are uniquely longest too often across the quiz library.');
}

for (let index = 1; index < lessons.length; index += 1) {
  if (lessons[index - 1].date <= lessons[index].date) {
    fail('Lessons must remain in strictly descending date order with one lesson per date.');
  }
}

if (lessonVisuals.size !== lessons.length * 3) fail('Every idea must reference its own visual.');

if (
  !clientScript.includes(`const CLARITY_PROJECT_ID = '${clarityProjectId}'`) ||
  !clientScript.includes("window.clarity('event', button.dataset.clarityEvent)") ||
  !clientScript.includes("window.clarity('consentv2'") ||
  !clientScript.includes("if (!safeStorageSet(ANALYTICS_CONSENT_KEY, choice))") ||
  !clientScript.includes("if (choice === 'granted') loadClarity('granted').catch(() => {});") ||
  !clientScript.includes("ad_Storage: 'denied'") ||
  !clientScript.includes("style.id = 'daw-cusdis-theme'") ||
  !clientScript.includes('daw-saved-') ||
  !clientScript.includes('daw-useful-') ||
  !clientScript.includes('daw-quiz-first-') ||
  !clientScript.includes('daw-quiz-review-') ||
  !clientScript.includes('data-quiz-form') ||
  !clientScript.includes("document.querySelectorAll('[data-visual-scroll]')") ||
  !clientScript.includes("querySelector('[data-visual-scroll-hint]')") ||
  !clientScript.includes("closest('[data-cusdis-comments]')") ||
  !clientScript.includes('data-daw-cusdis-script')
) {
  fail('The client script has incomplete personal Clarity, consent, saved-idea or useful-reaction handling.');
}
if (clientScript.includes("if (choice === 'granted') loadClarity('granted').catch(() => {\n    if (analyticsBanner) analyticsBanner.hidden = false;")) {
  fail('A Clarity load failure must not reopen a consent choice that was already saved.');
}

if (!savedPage.includes('<meta name="robots" content="noindex,follow" />') || !savedPage.includes('data-saved-empty')) {
  fail('The Saved ideas page needs its noindex directive and empty state.');
}
if (savedPage.includes('data-analytics-consent')) fail('Microsoft Clarity must not be offered or loaded on the Saved ideas page.');
for (const stableIdeaKey of stableIdeaKeys) {
  if (!savedPage.includes(`data-saved-id="${stableIdeaKey}"`)) fail(`Saved ideas is missing ${stableIdeaKey}.`);
}
if ((savedPage.match(/data-saved-card/g) || []).length !== stableIdeaKeys.size) fail('Saved ideas must contain one card per idea.');

if (
  !indexPage.includes('data-quick-review') ||
  !indexPage.includes('id="daw-quick-review-data"') ||
  !indexPage.includes('Quick review') ||
  !indexPage.includes('progress stays in this browser') ||
  !/<section class="quick-review"[^>]*data-clarity-mask="true"/.test(indexPage) ||
  !/<script id="daw-quick-review-data"[^>]*data-clarity-mask="true"/.test(indexPage)
) fail('The homepage has incomplete browser-local quick-review markup or disclosure.');
const libraryCategories = [...new Set(lessons.flatMap((lesson) => lesson.category
  .split('·')
  .map((category) => category.trim())
  .filter(Boolean)))];
if (
  !indexPage.includes('data-library-controls') ||
  !indexPage.includes('data-library-search') ||
  !indexPage.includes('data-library-category') ||
  !indexPage.includes('data-library-status') ||
  !indexPage.includes('data-library-empty') ||
  !indexPage.includes('data-library-pagination') ||
  (indexPage.match(/data-library-card/g) || []).length !== lessons.length ||
  !clientScript.includes('const PAGE_SIZE = 10;') ||
  !clientScript.includes('data-library-page') ||
  !clientScript.includes('No lessons found.')
) fail('The homepage has incomplete library search, category filter or pagination support.');
for (const category of libraryCategories) {
  if (!indexPage.includes(`<option value="${esc(category)}">${esc(category)}</option>`)) {
    fail(`The library category filter is missing ${category}.`);
  }
}
if (
  !indexPage.includes('id="topics"') ||
  !indexPage.includes('id="topic-chart-title"') ||
  !indexPage.includes('role="img" aria-labelledby="topic-chart-title topic-chart-desc"') ||
  !indexPage.includes('29 TOPIC') ||
  !indexPage.includes('AREAS') ||
  !indexPage.includes('The chart shows the balance planned as the library grows.') ||
  indexPage.includes('candidate-discovery') ||
  indexPage.includes('quality gate') ||
  (indexPage.match(/class="topic-family-details"/g) || []).length !== topicCatalog.families.length ||
  (indexPage.match(/class="topic-swatch"/g) || []).length !== topicCatalog.families.length * 2
) fail('The homepage has incomplete topic chart, legend or family details.');
for (const family of topicCatalog.families) {
  if (!indexPage.includes(`<strong>${esc(family.label)}</strong>`) || !indexPage.includes(`<b>${family.share}%</b>`)) {
    fail(`The homepage topic chart is missing ${family.label}.`);
  }
  for (const category of family.categories) {
    if (!indexPage.includes(`<h3>${esc(category.label)}</h3>`)) fail(`The homepage is missing ${category.label}.`);
    for (const subtopic of category.subtopics) {
      if (!indexPage.includes(`<li>${esc(subtopic)}</li>`)) fail(`The homepage is missing ${category.label}: ${subtopic}.`);
    }
  }
}
await readRequiredFile(path.join(root, 'tools', 'randomize-topic.mjs'), 'The topic randomizer is missing');

if (
  !privacyPage.includes('Learning progress') ||
  !privacyPage.includes('does not intentionally send your answers or score to Clarity') ||
  !privacyPage.includes('Cusdis and Clarity run on some pages') ||
  !privacyPage.includes('Your progress stays until you clear learning history') ||
  !privacyPage.includes('data-learning-history-dialog') ||
  !privacyPage.includes('data-clear-learning-history') ||
  !privacyPage.includes('Microsoft Clarity') ||
  !privacyPage.includes('data-analytics-reset') ||
  !privacyPage.includes('Cusdis') ||
  !privacyPage.includes('Contact and anonymous feedback') ||
  !privacyPage.includes('form hosted by Tally in a new tab') ||
  !privacyPage.includes('the owner cannot reply') ||
  !privacyPage.includes('https://tally.so/help/terms-and-privacy') ||
  !privacyPage.includes('data-analytics-consent')
) {
  fail('The privacy page has incomplete visitor-facing Clarity, consent, Cusdis or Tally disclosure.');
}

if (/fonts\.(?:googleapis|gstatic)\.com/i.test(styles)) {
  fail('styles.css must not load fonts from Google; use repository-local font files.');
}
const fontReferences = [...styles.matchAll(/url\(\s*(['"]?)([^)'"?#]+\.(?:woff2?|ttf|otf))\1\s*\)/gi)]
  .map((match) => match[2]);
if (!fontReferences.length) fail('styles.css must reference repository-local font files.');
const expectedLocalFonts = [
  'dm-mono-400-latin-ext.woff2',
  'dm-mono-400-latin.woff2',
  'dm-mono-500-latin-ext.woff2',
  'dm-mono-500-latin.woff2',
  'dm-serif-display-400-italic-latin-ext.woff2',
  'dm-serif-display-400-italic-latin.woff2',
  'dm-serif-display-400-latin-ext.woff2',
  'dm-serif-display-400-latin.woff2',
  'manrope-400-700-latin-ext.woff2',
  'manrope-400-700-latin.woff2'
];
const referencedFontNames = new Set(fontReferences.map((fontReference) => path.basename(fontReference)));
for (const expectedFont of expectedLocalFonts) {
  if (!referencedFontNames.has(expectedFont)) fail(`styles.css must reference local font file ${expectedFont}.`);
}
for (const fontReference of new Set(fontReferences)) {
  if (/^[a-z][a-z0-9+.-]*:/i.test(fontReference) || fontReference.startsWith('//')) {
    fail(`styles.css must not reference a remote font: ${fontReference}`);
  }
  const fontPath = path.resolve(root, fontReference);
  if (!pathIsInside(fontPath)) fail(`styles.css references a font outside the repository: ${fontReference}`);
  await requireFile(fontPath, 'styles.css is missing a referenced font');
}
for (const supportFile of ['README.md', 'OFL-DM-Mono.txt', 'OFL-DM-Serif-Display.txt', 'OFL-Manrope.txt']) {
  await requireFile(
    path.join(root, 'assets', 'fonts', supportFile),
    `Self-hosted fonts are missing their documentation or licence (${supportFile})`
  );
}

const generatedHtmlPaths = [
  '404.html',
  'index.html',
  'saved.html',
  'privacy.html',
  ...lessons.map((lesson) => `lessons/${lesson.slug}.html`)
];
const contactLinkPages = generatedHtmlPaths.filter((relativePath) => relativePath !== '404.html');
const htmlCache = new Map();
const fileAvailability = new Map();
const integrityIssues = [];
const loadGeneratedHtml = async (relativePath, context) => {
  if (htmlCache.has(relativePath)) return htmlCache.get(relativePath);
  const contents = await readRequiredFile(path.join(root, ...relativePath.split('/')), context);
  htmlCache.set(relativePath, contents);
  return contents;
};
const ensureTargetExists = async (target, context) => {
  if (fileAvailability.has(target)) return fileAvailability.get(target);
  const available = await requireFile(target, context);
  fileAvailability.set(target, available);
  return available;
};
const localTargetFor = (rawReference, ownerRelativePath) => {
  let resolved;
  try {
    const ownerUrl = ownerRelativePath === 'index.html'
      ? `${siteUrl}/`
      : `${siteUrl}/${ownerRelativePath}`;
    resolved = new URL(rawReference.replaceAll('&amp;', '&'), ownerUrl);
  } catch {
    return { error: `invalid URL ${rawReference}` };
  }
  if (!['http:', 'https:'].includes(resolved.protocol) || resolved.origin !== new URL(siteUrl).origin) return null;
  if (!resolved.pathname.startsWith(siteBasePath)) return null;

  let relativePath;
  let fragment;
  try {
    relativePath = decodeURIComponent(resolved.pathname.slice(siteBasePath.length));
    fragment = decodeURIComponent(resolved.hash.slice(1));
  } catch {
    return { error: `invalid URL encoding in ${rawReference}` };
  }
  if (!relativePath || relativePath.endsWith('/')) relativePath += 'index.html';
  const target = path.resolve(root, ...relativePath.split('/'));
  if (!pathIsInside(target)) return { error: `URL escapes the repository: ${rawReference}` };
  return { target, relativePath: displayPath(target), fragment };
};

for (const relativePath of generatedHtmlPaths) {
  const html = await loadGeneratedHtml(relativePath, `Generated HTML is missing for integrity checking (${relativePath})`);
  if (html === null) continue;

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  for (const duplicateId of duplicateIds) integrityIssues.push(`${relativePath} contains duplicate id "${duplicateId}".`);

  const references = [...html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)].map((match) => match[2]);
  const socialImage = html.match(/<meta\b[^>]*property="og:image"[^>]*content="([^"]+)"[^>]*>/i)?.[1];
  if (socialImage) references.push(socialImage);

  for (const reference of references) {
    const resolved = localTargetFor(reference, relativePath);
    if (resolved === null) continue;
    if (resolved.error) {
      integrityIssues.push(`${relativePath} has ${resolved.error}.`);
      continue;
    }
    if (!await ensureTargetExists(resolved.target, `${relativePath} references a missing internal target (${reference})`)) continue;
    if (!resolved.fragment || !resolved.relativePath.endsWith('.html')) continue;

    const targetHtml = await loadGeneratedHtml(
      resolved.relativePath,
      `${relativePath} references a missing HTML target (${reference})`
    );
    if (targetHtml === null) continue;
    const targetIds = new Set([...targetHtml.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((match) => match[1]));
    if (!targetIds.has(resolved.fragment)) {
      integrityIssues.push(`${relativePath} references missing anchor "${resolved.fragment}" in ${resolved.relativePath}.`);
    }
  }
}

for (const relativePath of contactLinkPages) {
  const html = await loadGeneratedHtml(relativePath, `Generated HTML is missing for contact-link checking (${relativePath})`);
  if (html === null) continue;
  const contactLink = `href="${contactFormUrl}" target="_blank" rel="noreferrer"`;
  if ((html.match(new RegExp(contactLink, 'g')) || []).length !== 2) {
    integrityIssues.push(`${relativePath} must include the Tally contact form in both its navigation and footer.`);
  }
}

for (const match of styles.matchAll(/url\(\s*(['"]?)([^)'"?#]+)\1\s*\)/gi)) {
  const reference = match[2];
  if (/^(?:data:|https?:|\/\/)/i.test(reference)) continue;
  const target = path.resolve(root, reference);
  if (!pathIsInside(target)) {
    integrityIssues.push(`styles.css references a target outside the repository: ${reference}.`);
    continue;
  }
  await ensureTargetExists(target, `styles.css references a missing local asset (${reference})`);
}

if (integrityIssues.length) {
  fail(`Generated site integrity checks failed:\n${integrityIssues.map((message) => `- ${message}`).join('\n')}`);
}

if (missingFiles.length) {
  fail(`Missing required site files:\n${missingFiles.map((message) => `- ${message}`).join('\n')}`);
}

const forbiddenDash = String.fromCodePoint(0x2014);
const publicTextExtensions = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.svg', '.txt', '.xml', '.yaml', '.yml']);
const scanSkipDirectories = new Set(['.git', '.playwright-cli', 'output']);

async function findForbiddenDashes(directory = root) {
  const matches = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!scanSkipDirectories.has(entry.name)) matches.push(...await findForbiddenDashes(candidate));
      continue;
    }
    if (!entry.isFile()) continue;
    if (!publicTextExtensions.has(path.extname(entry.name).toLowerCase()) && entry.name !== '.gitignore') continue;
    if ((await readFile(candidate, 'utf8')).includes(forbiddenDash)) matches.push(displayPath(candidate));
  }
  return matches;
}

const filesWithForbiddenDashes = await findForbiddenDashes();
if (filesWithForbiddenDashes.length) {
  fail(`Em dashes are forbidden in site files:\n${filesWithForbiddenDashes.map((file) => `- ${file}`).join('\n')}`);
}

const generatedOutputCheck = spawnSync(
  process.execPath,
  [path.join(root, 'tools', 'build-site.mjs'), '--check'],
  { cwd: root, encoding: 'utf8' }
);
if (generatedOutputCheck.error) throw generatedOutputCheck.error;
if (generatedOutputCheck.status !== 0) {
  const details = [generatedOutputCheck.stdout, generatedOutputCheck.stderr].filter(Boolean).join('\n').trim();
  fail(`Generated output check failed.${details ? `\n${details}` : ''}`);
}

console.log(`Validated ${lessons.length} lessons, ${lessons.length * 3} ideas and all referenced visuals.`);
