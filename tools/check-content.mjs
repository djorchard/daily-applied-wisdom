import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const siteUrl = 'https://djorchard.github.io/daily-applied-wisdom';
const cusdisAppId = '714bda94-6019-4858-968f-91b3b5bb1c13';
const fail = (message) => { throw new Error(message); };
const present = (value) => typeof value === 'string' && value.trim().length > 0;
const esc = (value = '') => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');
const { lessons } = JSON.parse(await readFile(path.join(root, 'content', 'lessons.json'), 'utf8'));

if (!Array.isArray(lessons) || lessons.length !== 5) {
  fail(`Expected five lessons, found ${lessons?.length ?? 0}.`);
}

const slugs = new Set();
const lessonVisuals = new Set();
for (const lesson of lessons) {
  for (const field of ['slug', 'date', 'title', 'authors', 'summary', 'evidenceNote', 'takeaway']) {
    if (!present(lesson[field])) fail(`${lesson.slug ?? 'Unknown lesson'} is missing ${field}.`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug)) fail(`${lesson.slug} is not a URL-safe lesson slug.`);
  if (slugs.has(lesson.slug)) fail(`Duplicate lesson slug: ${lesson.slug}.`);
  slugs.add(lesson.slug);

  if (!Array.isArray(lesson.ideas) || lesson.ideas.length !== 3) {
    fail(`${lesson.title} must contain exactly three ideas.`);
  }

  for (const [index, idea] of lesson.ideas.entries()) {
    const label = `${lesson.title}, idea ${index + 1}`;
    for (const field of ['title', 'extension', 'image', 'imageAlt', 'imageCaption', 'why', 'caveat']) {
      if (!present(idea[field])) fail(`${label} is missing ${field}.`);
    }
    if (!Array.isArray(idea.argument) || idea.argument.length < 1) fail(`${label} needs an attributed explanation.`);
    if (!Array.isArray(idea.apply) || idea.apply.length < 1) fail(`${label} needs an application step.`);
    if (!Array.isArray(idea.questions) || idea.questions.length !== 2) fail(`${label} must have exactly two reinforcement questions.`);
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
    !generatedLesson.includes(`data-page-id="${lesson.slug}"`) ||
    !generatedLesson.includes(`data-page-url="${canonicalUrl}"`) ||
    !generatedLesson.includes(`data-page-title="${esc(lesson.title)} — Daily Applied Wisdom"`) ||
    !generatedLesson.includes(`<link rel="canonical" href="${canonicalUrl}" />`) ||
    !generatedLesson.includes('https://cusdis.com/js/cusdis.es.js')
  ) {
    fail(`${lesson.title} has incomplete Cusdis page identity or script configuration.`);
  }
  if ((generatedLesson.match(/id="cusdis_thread"/g) || []).length !== 1 || (generatedLesson.match(/https:\/\/cusdis\.com\/js\/cusdis\.es\.js/g) || []).length !== 1) {
    fail(`${lesson.title} must contain exactly one Cusdis container and script.`);
  }
}

if (lessonVisuals.size !== lessons.length * 3) fail('Every idea must reference its own visual.');

console.log(`Validated ${lessons.length} lessons, ${lessons.length * 3} ideas and all referenced visuals.`);
