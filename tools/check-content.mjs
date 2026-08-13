import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const siteUrl = 'https://djorchard.github.io/daily-applied-wisdom';
const cusdisAppId = '714bda94-6019-4858-968f-91b3b5bb1c13';
const clarityProjectId = 'y1mr2l6g3q';
const fail = (message) => { throw new Error(message); };
const present = (value) => typeof value === 'string' && value.trim().length > 0;
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const { lessons } = JSON.parse(await readFile(path.join(root, 'content', 'lessons.json'), 'utf8'));

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
    await access(visualPath);
    const svg = await readFile(visualPath, 'utf8');
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
  await access(generatedLessonPath);
  const generatedLesson = await readFile(generatedLessonPath, 'utf8');
  const canonicalUrl = `${siteUrl}/lessons/${lesson.slug}.html`;
  if (generatedLesson.includes('YOUR_CUSDIS_APP_ID') || !generatedLesson.includes(`data-app-id="${cusdisAppId}"`)) {
    fail(`${lesson.title} is not connected to the configured Cusdis app.`);
  }
  if (
    !generatedLesson.includes('data-host="https://cusdis.com"') ||
    !generatedLesson.includes(`data-page-id="${lesson.discussionId}"`) ||
    !generatedLesson.includes(`data-page-url="${canonicalUrl}"`) ||
    !generatedLesson.includes(`data-page-title="${esc(lesson.title)} — Daily Applied Wisdom"`) ||
    !generatedLesson.includes(`<link rel="canonical" href="${canonicalUrl}" />`) ||
    !generatedLesson.includes('https://cusdis.com/js/cusdis.es.js') ||
    !generatedLesson.includes('data-theme="light"') ||
    !/<aside class="reader-feedback"[^>]*data-clarity-mask="true"/.test(generatedLesson) ||
    !generatedLesson.includes('data-analytics-consent') ||
    !generatedLesson.includes('data-analytics-status') ||
    !generatedLesson.includes('What did this book change for you?') ||
    !generatedLesson.includes('Each book has its own separate discussion.')
  ) {
    fail(`${lesson.title} has incomplete Cusdis page identity or script configuration.`);
  }
  if (generatedLesson.includes('reaction-note') || generatedLesson.includes('Saved markers stay in this browser')) {
    fail(`${lesson.title} repeats the Clarity disclosure below every idea instead of keeping it on the Privacy page.`);
  }
  if ((generatedLesson.match(/id="cusdis_thread"/g) || []).length !== 1 || (generatedLesson.match(/https:\/\/cusdis\.com\/js\/cusdis\.es\.js/g) || []).length !== 1) {
    fail(`${lesson.title} must contain exactly one Cusdis container and script.`);
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
    !generatedLesson.includes('Answer all 6 before checking.') ||
    !generatedLesson.includes('Check answers') ||
    !generatedLesson.includes('Practice again') ||
    !/<section class="learning-check"[^>]*data-clarity-mask="true"/.test(generatedLesson) ||
    (generatedLesson.match(/data-quiz-question/g) || []).length !== 6 ||
    (generatedLesson.match(/data-quiz-option/g) || []).length !== 24 ||
    (generatedLesson.match(/ required aria-describedby=/g) || []).length !== 24 ||
    (generatedLesson.match(/data-quiz-correct-answer/g) || []).length !== 6
  ) fail(`${lesson.title} has incomplete learning-check markup.`);
}

if (uniquelyLongestCorrectCount > Math.floor(quizQuestionCount / 3)) {
  fail('Correct options are uniquely longest too often across the quiz library.');
}

for (let index = 1; index < lessons.length; index += 1) {
  if (lessons[index - 1].date <= lessons[index].date) {
    fail('Lessons must remain in strictly descending date order with one lesson per date.');
  }
}

if (lessonVisuals.size !== lessons.length * 3) fail('Every idea must reference its own visual.');

const clientScript = await readFile(path.join(root, 'script.js'), 'utf8');
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
  !clientScript.includes('data-quiz-form')
) {
  fail('The client script has incomplete personal Clarity, consent, saved-idea or useful-reaction handling.');
}
if (clientScript.includes("if (choice === 'granted') loadClarity('granted').catch(() => {\n    if (analyticsBanner) analyticsBanner.hidden = false;")) {
  fail('A Clarity load failure must not reopen a consent choice that was already saved.');
}

const savedPage = await readFile(path.join(root, 'saved.html'), 'utf8');
if (!savedPage.includes('<meta name="robots" content="noindex,follow" />') || !savedPage.includes('data-saved-empty')) {
  fail('The Saved ideas page needs its noindex directive and empty state.');
}
if (savedPage.includes('data-analytics-consent')) fail('Microsoft Clarity must not be offered or loaded on the Saved ideas page.');
for (const stableIdeaKey of stableIdeaKeys) {
  if (!savedPage.includes(`data-saved-id="${stableIdeaKey}"`)) fail(`Saved ideas is missing ${stableIdeaKey}.`);
}
if ((savedPage.match(/data-saved-card/g) || []).length !== stableIdeaKeys.size) fail('Saved ideas must contain one card per idea.');

const indexPage = await readFile(path.join(root, 'index.html'), 'utf8');
if (
  !indexPage.includes('data-quick-review') ||
  !indexPage.includes('id="daw-quick-review-data"') ||
  !indexPage.includes('Quick review') ||
  !indexPage.includes('progress stays in this browser') ||
  !/<section class="quick-review"[^>]*data-clarity-mask="true"/.test(indexPage) ||
  !/<script id="daw-quick-review-data"[^>]*data-clarity-mask="true"/.test(indexPage)
) fail('The homepage has incomplete browser-local quick-review markup or disclosure.');

const privacyPage = await readFile(path.join(root, 'privacy.html'), 'utf8');
if (
  !privacyPage.includes('Learning progress') ||
  !privacyPage.includes('does not deliberately send answers or scores as Clarity events or tags') ||
  !privacyPage.includes('browser-local storage is not technical isolation') ||
  !privacyPage.includes('Progress remains until you clear learning history') ||
  !privacyPage.includes('data-learning-history-dialog') ||
  !privacyPage.includes('data-clear-learning-history') ||
  !privacyPage.includes('Microsoft Clarity') ||
  !privacyPage.includes('data-analytics-reset') ||
  !privacyPage.includes('Cusdis') ||
  !privacyPage.includes('data-analytics-consent')
) {
  fail('The privacy page has incomplete Clarity, consent or Cusdis disclosure.');
}

console.log(`Validated ${lessons.length} lessons, ${lessons.length * 3} ideas and all referenced visuals.`);
