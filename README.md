# Daily Applied Wisdom

One book. Three ideas. Better thinking.

This is a dependency-free static GitHub Pages site containing evidence-aware learning sessions, interactive browser-local learning checks, an archive, per-lesson sharing, saved ideas, private owner analytics for useful reactions, RSS, a sitemap, and moderated account-free comments.

Live site: <https://djorchard.github.io/daily-applied-wisdom/>

## Add or edit a lesson

Lesson content lives in `content/lessons.json`. After editing it, rebuild the static pages:

```powershell
node tools/build-site.mjs
node tools/check-content.mjs
```

The builder creates `index.html`, `saved.html`, `privacy.html`, one page per lesson under `lessons/`, `feed.xml`, and `sitemap.xml`. The checker enforces the three-idea learning structure, stable idea and question IDs, two learning-check questions per idea, four unique options, option-specific feedback, service configuration, source notes and visuals. Commit the generated files together with the source data.

## Learning checks

Each book has a six-question learning check after its three ideas: one concept question and one application scenario per idea. Questions are interleaved so one answer does not cue its paired scenario. The reader answers all six before receiving immediate corrective feedback. The first attempt is retained as a low-stakes browser-local result; **Practice again** clears only the displayed practice round and preserves that first attempt.

From the next local calendar day, the homepage can offer one **Quick review** of up to three questions per day. Questions missed on the first attempt are prioritised, choices are shown in a stable shuffled order for that day, missed review questions remain eligible for a later visit, and remembered questions leave the queue. This is intentionally a small spaced-retrieval loop rather than a notification or account-based scheduler.

Quiz data requires a stable `quizRevision`, stable `q1`/`q2` IDs, exactly four plausible options, one correct index, an overall explanation and an explanation for every selected option. Scores, answers and review state do not sync across browsers or devices. The privacy page can clear all learning history without removing saved ideas or useful markers. Daily Applied Wisdom does not deliberately send an answer or score as a Clarity event or tag, and it masks learning content from Clarity's recording. Allowed analytics can still record ordinary page interactions, and browser-local storage is not technical isolation from third-party scripts running on the page; the privacy page explains that boundary.

## Book selection

The canonical criteria are in [BOOK_SELECTION_POLICY.md](BOOK_SELECTION_POLICY.md). Software development, product, AI and technical leadership remain the centre of gravity, while a rolling portfolio guarantees regular coverage of career growth, personal finance, thinking, memory, applied mathematics, game design and a better, more fulfilling life.

Books must pass an attribution, evidence, distinctiveness, usefulness, depth and teachability gate. Popularity alone is never a reason to select one.

## Visual quality standard

Lesson diagrams are deterministic SVGs rather than generated text-heavy images. Every visual must use the shared `1200 × 760` canvas, accessible title and description, readable typography, consistent strokes and the site palette. On small screens the diagram stays at a legible scale inside a labelled horizontal exploration window.

`node tools/check-content.mjs` rejects referenced raster images, embedded rasters, missing accessibility metadata, inconsistent canvases and diagram text below the agreed minimum. Browser review at desktop, 390px and 320px remains required to catch spatial problems such as crossed labels or crowded arrows.

## Comments and reactions

GitHub Pages cannot securely store anonymous visitor data by itself.

- Account-free comments are connected to the site's moderated [Cusdis](https://cusdis.com/) application. Each book has an explicit immutable `discussionId`, canonical URL and title so its discussion remains separate even if its URL changes. The lesson UI discloses that Cusdis receives standard connection data; email is optional.
- Cusdis is currently operational, but its upstream project was deprecated and archived in July 2026. Treat it as a continuity risk and preserve the existing discussion IDs when exporting or migrating comments.
- **Save idea for later** is a reversible browser-local bookmark. The Saved ideas page reads those markers from the same browser profile, never loads Clarity, and saves do not sync across browsers or devices. Existing `daw-reaction-*` bookmarks are migrated automatically. When analytics is allowed on a lesson page, Clarity may still record use of its Save control.
- **Mark idea useful** is separate, one-way feedback sent as a stable per-idea custom event to the owner's personal Microsoft Clarity project `y1mr2l6g3q`. No Clarity Identify call is used. A local marker reduces repeats from the same browser profile, but this is best-effort owner analytics rather than a tamper-proof voting backend or a public count.
- General Clarity analytics starts only after the visitor allows it and is never loaded on the Saved ideas page. Advertising storage remains denied. Rejecting after an earlier grant reloads the page into an unloaded state. If general analytics is rejected, explicitly marking an idea useful loads Clarity in no-consent mode to send that reaction without Clarity cookies. The site includes a plain-language privacy and data-use page.
- Publicly visible aggregate counts would still need a small endpoint with stable IDs, uniqueness and rate-limiting controls; Clarity is intentionally not used as a public counter.

The share control uses the device share sheet where available and provides a copy-link fallback.

## Imported source material

The four dated Daily Book Learning Lab lessons were imported from the owner's Gmail archive. Their visual concepts were redrawn as a consistent, accessible SVG system; the original email raster files are not published. Private email headers, attachment URLs and delivery notes are not published. *Thinking in Systems* was expanded to the same learning standard as every other daily lesson.
