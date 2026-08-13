# Daily Applied Wisdom

One book. Three ideas. Better thinking.

This is a dependency-free static GitHub Pages site containing five evidence-aware learning sessions, an archive, per-lesson sharing, device-local useful markers, RSS, a sitemap, and moderated account-free comments.

Live site: <https://djorchard.github.io/daily-applied-wisdom/>

## Add or edit a lesson

Lesson content lives in `content/lessons.json`. After editing it, rebuild the static pages:

```powershell
node tools/build-site.mjs
node tools/check-content.mjs
```

The builder creates `index.html`, one page per lesson under `lessons/`, `feed.xml`, and `sitemap.xml`. The checker enforces the five-lesson, three-idea learning structure and verifies the source notes and visuals. Commit the generated files together with the source data.

## Book selection

The canonical criteria are in [BOOK_SELECTION_POLICY.md](BOOK_SELECTION_POLICY.md). Software development, product, AI and technical leadership remain the centre of gravity, while a rolling portfolio guarantees regular coverage of career growth, personal finance, thinking, memory, applied mathematics, game design and a better, more fulfilling life.

Books must pass an attribution, evidence, distinctiveness, usefulness, depth and teachability gate. Popularity alone is never a reason to select one.

## Visual quality standard

Lesson diagrams are deterministic SVGs rather than generated text-heavy images. Every visual must use the shared `1200 × 760` canvas, accessible title and description, readable typography, consistent strokes and the site palette. On small screens the diagram stays at a legible scale inside a labelled horizontal exploration window.

`node tools/check-content.mjs` rejects referenced raster images, embedded rasters, missing accessibility metadata, inconsistent canvases and diagram text below the agreed minimum. Browser review at desktop, 390px and 320px remains required to catch spatial problems such as crossed labels or crowded arrows.

## Comments and reactions

GitHub Pages cannot securely store anonymous visitor data by itself.

- Account-free comments are connected to the site's moderated [Cusdis](https://cusdis.com/) application. Each lesson has a stable page ID, canonical URL and title so its discussion remains separate. The lesson UI discloses that Cusdis receives standard connection data; email is optional.
- The current heart buttons are explicitly device-local bookmarks. They do not claim to be public counts.
- Public aggregate reactions need a small endpoint with a stable lesson/idea ID, anonymous session token, uniqueness guard, rate limiting and no privileged browser key. Supabase Edge Functions or Cloudflare Workers are suitable options.

The share control uses the device share sheet where available and provides a copy-link fallback.

## Imported source material

The four dated Daily Book Learning Lab lessons were imported from the owner's Gmail archive. Their visual concepts were redrawn as a consistent, accessible SVG system; the original email raster files are not published. Private email headers, attachment URLs and delivery notes are not published. The launch-bonus *Thinking in Systems* lesson was expanded to the same learning standard.
