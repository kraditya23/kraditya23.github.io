# kraditya23 — portfolio

Personal portfolio of Aditya Kumar. A single scrolling page built with [Astro](https://astro.build) as a static
site and deployed to GitHub Pages.

## Requirements

Node 22.12 or newer (see `.nvmrc`).

## Commands

| Command | Action |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at `http://localhost:4321` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run fetch:cp` | Refresh competitive-programming snapshots in `src/data/cp/` |
| `npm run og` | Re-render `public/og.png` and `public/apple-touch-icon.png` |
| `npm test` | CP parser tests, `astro check` and Playwright end-to-end tests |

End-to-end tests need Chromium once: `npx playwright install chromium`. They build with a dummy Formspree ID
and overwrite `dist/`.

## Content

| What | Where |
| --- | --- |
| Profile, links, hero, about, education, skills, contact settings | `src/data/site.ts` |
| Projects and benchmark figures | `src/data/projects.ts` |
| CP platforms (on/off, tab order) and extra tiles | `src/data/site.ts` → `cpPlatforms`, `cp` |
| CP ratings, contests and charts | `src/data/cp/*.json`, written by `npm run fetch:cp` |
| Design tokens | `src/styles/global.css` |
| Static files (images, icons, optional `resume.pdf`) | `public/` |

Empty strings in the data files hide the element they feed.

## Structure

```
src/
  components/   page sections, shared pieces and visuals/
  data/         site.ts, projects.ts, cp/ snapshots
  layouts/      Base.astro (head, SEO, fonts)
  lib/          CP snapshot loading and chart geometry
  pages/        index, 404, robots.txt
  scripts/      scroll reveal, CP tabs, contact form
  styles/       global.css
scripts/        CP fetchers and their tests, preview-image renderer
tests/          Playwright end-to-end tests
.github/        deploy and test workflows
```

## Behaviour

- Animations run once and are disabled under `prefers-reduced-motion`. Without JavaScript all content is visible.
- The CP section uses ARIA tabs; without JavaScript the platforms are listed one after another.
- The contact form posts to Formspree with `fetch` and reports status inline; without JavaScript it posts normally.
  With no Formspree ID set, an email card replaces the form.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, daily at 02:23 UTC and on demand. It refreshes the
CP snapshots (committing them if they changed), type-checks, builds and deploys to GitHub Pages. A platform that
can't be reached keeps its last snapshot.

Setup: repository **Settings → Pages → Source: GitHub Actions**.

### Contact form

Create a form at [formspree.io](https://formspree.io) and set its ID in `src/data/site.ts` → `formspreeId`.

### Custom domain

1. Verify the domain under the GitHub account's Pages settings.
2. At the DNS provider, add A records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   and a `www` CNAME to `<user>.github.io`.
3. Set the domain under the repository's Pages settings and enable **Enforce HTTPS** once available.
4. Update `url` in `src/data/site.ts`.

No `CNAME` file is needed; GitHub ignores it for Actions deployments.

## Notes

- Astro 7 drops line breaks next to inline elements (`<b>`, `<code>`, `<a>`); keep them on the same line as the
  surrounding words.
- `playwright-core` is overridden to match `@playwright/test` so the axe integration shares one Playwright.
