# Daily Applied Wisdom

One book. Three ideas. Better thinking.

This is a dependency-free static site intended for GitHub Pages. It includes an inaugural lesson based on Donella H. Meadows' *Thinking in Systems*, native sharing support, per-browser helpful buttons, and a prepared anonymous-comment integration.

## Publish on GitHub Pages

1. Create an empty GitHub repository called `daily-applied-wisdom`.
2. Push this folder's `main` branch to GitHub.
3. In **Settings → Pages**, select **Deploy from a branch**, then choose `main` and `/ (root)`.
4. Add the eventual public site URL to `og:url` and replace the relative `og:image` with its absolute URL in `index.html` for the best social-card previews.

## Anonymous comments and reaction counts

GitHub Pages has no server-side database, so its built-in files cannot store site-wide anonymous votes or comments securely.

- **Comments:** create a free site at [Cusdis](https://cusdis.com/), then replace `YOUR_CUSDIS_APP_ID` in `index.html`. It supports anonymous comments and moderation.
- **Helpful buttons:** the current buttons deliberately use each visitor's `localStorage`, so they provide a no-setup personal bookmark-style reaction. For public aggregate counts, connect a small hosted endpoint (for example Supabase or Firebase) and add spam/rate limiting before accepting anonymous votes.

The share button uses the device's native share sheet where available and copies the link as a fallback.
