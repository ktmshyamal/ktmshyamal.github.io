# Gayan Shyamal — Portfolio

Personal portfolio of **Gayan Shyamal**, Visual & Motion Designer based in Horana, Sri Lanka.

**Live site:** https://ktmshyamal.github.io/

## Structure

```
index.html            The portfolio (single page, no build step needed)
404.html              "Page not found" page
sitemap.xml           Page list for search engines
robots.txt            Search engine rules
.nojekyll             Tells GitHub Pages to serve files as-is
data/projects.json    The projects shown in the Work section, in order
scripts/              sync_behance.py: keeps the Work section in step with Behance
.github/workflows/    Daily Behance sync
assets/
  brand/              Logo (white and ink) and profile photo
  films/              Films & stills section: full films, short previews, posters, photos
  media/              Hero film (desktop + phone), poster frame, contact image
  work/               Project thumbnails, one per Behance project
```

## Updating

The site is hosted on GitHub Pages from the `main` branch. Any change pushed
to `main` goes live within a minute or two.

- **New project:** nothing to do. Publish it on Behance and the
  "Sync Behance projects" action adds it to the site the next morning
  (06:47 Sri Lanka time). To add it straight away, open the **Actions** tab,
  choose **Sync Behance projects** and press **Run workflow**.
- **Change a project's title, subtitle, category or order:** edit
  `data/projects.json`, then run `python3 scripts/sync_behance.py --render`.
  Categories are `branding`, `motion`, `automotive` and `social`. The sync
  never overwrites your edits.
- **Hide a project:** set `"hidden": true` on it in `data/projects.json`.
- **New hero film:** replace `assets/media/hero.mp4` (desktop) and
  `assets/media/hero-540.mp4` (phone), plus `hero-poster.jpg`.

## Credits

Design and all work © Gayan Shyamal. Projects on
[Behance](https://www.behance.net/ktmshyamal).
