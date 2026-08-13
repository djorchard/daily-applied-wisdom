# Daily Applied Wisdom

One book. Three ideas. Better thinking.

This is a dependency-free static GitHub Pages site containing five evidence-aware learning sessions, an archive, per-lesson sharing, device-local useful markers, RSS, a sitemap, and a prepared anonymous-comments integration.

Live site: <https://djorchard.github.io/daily-applied-wisdom/>

## Add or edit a lesson

Lesson content lives in `content/lessons.json`. After editing it, rebuild the static pages:

```powershell
node tools/build-site.mjs
node tools/check-content.mjs
```

The builder creates `index.html`, one page per lesson under `lessons/`, `feed.xml`, and `sitemap.xml`. The checker enforces the five-lesson, three-idea learning structure and verifies the source notes and visuals. Commit the generated files together with the source data.

## Comments and reactions

GitHub Pages cannot securely store anonymous visitor data by itself.

- Anonymous comments are prepared for [Cusdis](https://cusdis.com/). Create a moderated site and replace `YOUR_CUSDIS_APP_ID` in the generated lesson template inside `tools/build-site.mjs`, then rebuild.
- The current heart buttons are explicitly device-local bookmarks. They do not claim to be public counts.
- Public aggregate reactions need a small endpoint with a stable lesson/idea ID, anonymous session token, uniqueness guard, rate limiting and no privileged browser key. Supabase Edge Functions or Cloudflare Workers are suitable options.

The share control uses the device share sheet where available and provides a copy-link fallback.

## Imported source material

The four dated Daily Book Learning Lab lessons and their twelve concept visuals were imported from the owner's Gmail archive. Private email headers, attachment URLs and delivery notes are not published. The launch-bonus *Thinking in Systems* lesson was expanded to the same learning standard.
