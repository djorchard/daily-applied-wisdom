# Daily Applied Wisdom

One book. Three ideas. Better thinking.

This is a dependency-free static GitHub Pages site containing evidence-aware learning sessions, interactive browser-local learning checks, an archive, per-lesson sharing, saved ideas, private owner analytics for useful reactions, RSS, a sitemap, moderated account-free comments, and a linked anonymous-contact form.

Live site: <https://djorchard.github.io/daily-applied-wisdom/>

## Add or edit a lesson

Lesson content lives in `content/lessons.json`. After editing it, rebuild the static pages:

```powershell
node tools/build-site.mjs
node tools/check-content.mjs
```

The builder deterministically creates `404.html`, `robots.txt`, `index.html`, `saved.html`, `privacy.html`, one page per lesson under `lessons/`, `feed.xml`, and `sitemap.xml`. A normal build also removes obsolete lesson HTML whose slug is no longer in the content file. Commit every generated file together with its source data.

For a read-only release check, run:

```powershell
node tools/build-site.mjs --check
node tools/check-content.mjs
```

`--check` reports missing, stale or different generated files without changing the working tree. The content checker invokes that same generated-output check and also validates the three-idea learning structure, stable IDs, learning checks, service configuration, source notes, visuals, local fonts, internal links, assets, anchors and duplicate HTML IDs. CI runs the syntax and full release-integrity checks on every pull request and push to `main`.

## Library browsing

The homepage library progressively enhances the complete lesson archive. With JavaScript available, it shows the 10 newest matching lessons, supports text search across titles, authors, topics, summaries and idea names, filters by the category tags currently used by lessons, and paginates every result set. Without JavaScript, every lesson remains available in the page.

## Learning checks

Each book has a six-question learning check after its three ideas: one concept question and one application scenario per idea. Questions are interleaved so one answer does not cue its paired scenario. The reader answers all six before receiving immediate corrective feedback. The first attempt is retained as a low-stakes browser-local result; **Practice again** clears only the displayed practice round and preserves that first attempt.

From the next local calendar day, the homepage can offer one **Quick review** of up to three questions per day. Questions missed on the first attempt are prioritised, choices are shown in a stable shuffled order for that day, missed review questions remain eligible for a later visit, and remembered questions leave the queue. This is intentionally a small spaced-retrieval loop rather than a notification or account-based scheduler.

Quiz data requires a stable `quizRevision`, stable `q1`/`q2` IDs, exactly four plausible options, one correct index, an overall explanation and an explanation for every selected option. Scores, answers and review state do not sync across browsers or devices. The privacy page can clear all learning history without removing saved ideas or useful markers. Daily Applied Wisdom does not deliberately send an answer or score as a Clarity event or tag, and it masks learning content from Clarity's recording. Allowed analytics can still record ordinary page interactions, and browser-local storage is not technical isolation from third-party scripts running on the page; the privacy page explains that boundary.

## Book selection

The canonical criteria are in [BOOK_SELECTION_POLICY.md](BOOK_SELECTION_POLICY.md). Software development, product, AI and technical leadership remain the centre of gravity, while a rolling portfolio guarantees regular coverage of career growth, personal finance, thinking, memory, applied mathematics, game design and a better, more fulfilling life.

`content/topic-catalog.json` is the machine-readable discovery catalog behind the homepage topic chart and `tools/randomize-topic.mjs`. It contains 29 categories and their full subtopic lists, grouped into eight weighted topic families. Run `node tools/randomize-topic.mjs --seed YYYY-MM-DD` for a reproducible candidate-discovery prompt. The result never overrides rolling deficits, repetition safeguards or the 9/12 quality gate.

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

## Contact and anonymous feedback

The navigation and footer link to the hosted Tally form at <https://tally.so/r/RGelGj>. A message is required; reason, name and email are optional. Tally sends the owner an email notification for each submission. The form is linked rather than embedded so it does not load while someone is simply browsing Daily Applied Wisdom. Preserve the Tally disclosure and external-service link in `privacy.html` whenever the contact workflow changes.

## Imported source material

The four dated Daily Book Learning Lab lessons were imported from the owner's Gmail archive. Their visual concepts were redrawn as a consistent, accessible SVG system; the original email raster files are not published. Private email headers, attachment URLs and delivery notes are not published. *Thinking in Systems* was expanded to the same learning standard as every other daily lesson.
