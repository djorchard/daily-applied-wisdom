import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const catalog = JSON.parse(await readFile(path.join(root, 'content', 'topic-catalog.json'), 'utf8'));
const args = process.argv.slice(2);
const seedIndex = args.indexOf('--seed');
const seedText = seedIndex >= 0 ? args[seedIndex + 1] : randomBytes(8).toString('hex');
if (seedIndex >= 0 && !seedText) throw new Error('--seed needs a value.');
const unsupported = args.filter((argument, index) => argument !== '--seed' && index !== seedIndex + 1);
if (unsupported.length) throw new Error(`Unsupported argument${unsupported.length === 1 ? '' : 's'}: ${unsupported.join(', ')}`);

let state = 2166136261;
for (const character of seedText) {
  state ^= character.charCodeAt(0);
  state = Math.imul(state, 16777619) >>> 0;
}
const next = () => {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 0x100000000;
};

const totalShare = catalog.families.reduce((sum, family) => sum + family.share, 0);
let familyDraw = next() * totalShare;
const family = catalog.families.find((candidate) => {
  familyDraw -= candidate.share;
  return familyDraw < 0;
}) ?? catalog.families.at(-1);
const category = family.categories[Math.floor(next() * family.categories.length)];
const subtopic = category.subtopics[Math.floor(next() * category.subtopics.length)];

console.log(JSON.stringify({
  seed: seedText,
  family: family.label,
  familyShare: family.share,
  category: category.label,
  subtopic,
  note: 'Candidate-discovery prompt only. The rolling deficit, repetition safeguards and 9/12 quality gate still decide publication.'
}, null, 2));
