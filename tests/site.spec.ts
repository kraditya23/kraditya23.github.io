import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import { site } from '../src/data/site';
import { origin } from '../src/data/projects';

const headline = site.hero.headline.map((line) => line.map((w) => w.text).join(' ')).join(' ');
const hasResume = fs.existsSync(new URL(`../public/${site.resumeFile}`, import.meta.url));

// Expected CP numbers come from the same snapshots the site renders.
const snap = (id: string) => JSON.parse(fs.readFileSync(new URL(`../src/data/cp/${id}.json`, import.meta.url), 'utf8'));
const shownRating = (id: string) => new Intl.NumberFormat('en-US').format(Math.round(snap(id).rating.current));

/** Scrolls top to bottom in steps (instantly, ignoring smooth scrolling) so reveals and lazy images fire. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y <= h; y += 300) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 30));
    }
    window.scrollTo({ top: h, behavior: 'instant' });
  });
}

async function fillForm(page: Page) {
  await page.getByLabel('Name', { exact: true }).fill('Test Recruiter');
  await page.getByLabel('Email', { exact: true }).fill('recruiter@example.com');
  await page.getByLabel('What’s it about?').selectOption('Collaboration');
  await page.getByLabel('Message', { exact: true }).fill('Hello from the end-to-end tests.');
}

test.describe('page basics', () => {
  test('renders the hero, metadata and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

    await page.goto('/');
    await expect(page).toHaveTitle(site.title);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(headline);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Delhi Technological University/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\.png$/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /^https:\/\//);
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);

    await scrollThrough(page);
    expect(errors).toEqual([]);
  });

  test('every in-page anchor points at an element that exists', async ({ page }) => {
    await page.goto('/');
    const missing = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')]
        .map((a) => a.getAttribute('href')!.slice(1))
        .filter((id) => id && !document.getElementById(id)),
    );
    expect(missing).toEqual([]);
  });

  test('static files and generated routes are served', async ({ request }) => {
    for (const path of ['/og.png', '/favicon.svg', '/apple-touch-icon.png', '/sitemap-index.xml']) {
      const res = await request.get(path);
      expect(res.status(), path).toBe(200);
    }
    if (hasResume) expect((await request.get(`/${site.resumeFile}`)).headers()['content-type']).toContain('pdf');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toMatch(/Sitemap: https:\/\/.+\/sitemap-index\.xml/);
  });

  test('404 page renders with a way home', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('isn’t in the book');
    await expect(page.getByRole('link', { name: /Back to the home page/ })).toHaveAttribute('href', '/');
  });

  test('the Connecta screenshot loads', async ({ page }) => {
    await page.goto('/');
    const img = page.getByRole('img', { name: /Connecta’s share screen/ });
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  });
});

test.describe('origin note', () => {
  test('links out to the playable build; the thumbnail is a decorative duplicate', async ({ page }) => {
    await page.goto('/#projects');
    const play = page.getByRole('link', { name: /Play in browser/ });
    await expect(play).toHaveAttribute('href', origin.playUrl);
    await expect(play).toHaveAttribute('target', '_blank');
    await expect(play).toHaveAttribute('rel', /noopener/);
    await expect(page.getByRole('heading', { level: 3, name: origin.title })).toBeVisible();

    const shot = page.locator('.origin .shot');
    await expect(shot).toHaveAttribute('href', origin.playUrl);
    await expect(shot).toHaveAttribute('aria-hidden', 'true');
    await expect(shot).toHaveAttribute('tabindex', '-1');
    const img = shot.locator('img');
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
  });
});

test.describe('navigation and keyboard', () => {
  for (const width of [1280, 390, 320]) {
    for (const [label, id] of [
      ['About', 'about'],
      ['Projects', 'projects'],
      ['CP', 'cp'],
      ['Skills', 'skills'],
      ['Contact', 'contact'],
    ]) {
      test(`${width}px: nav link "${label}" lands its section right below the sticky header`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('/');
        await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`#${id}$`));
        const header = (await page.locator('header.nav').boundingBox())!.height;
        // Wait for the smooth scroll to settle with the section starting just under the header.
        await expect
          .poll(
            async () => {
              const y = (await page.locator(`#${id}`).boundingBox())!.y;
              return y >= header - 1 && y <= header + 8 ? 'below header' : `at ${Math.round(y)} (header ${Math.round(header)})`;
            },
            { timeout: 8000 },
          )
          .toBe('below header');
        await expect(page.locator(`#${id} .sec-head`)).toBeInViewport();
      });
    }
  }

  test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('keyboard focus is always visible', async ({ page }) => {
    await page.goto('/');
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        const s = getComputedStyle(el);
        return { tag: el.tagName, style: s.outlineStyle, width: parseFloat(s.outlineWidth), shadow: s.boxShadow };
      });
      expect(outline.style !== 'none' && outline.width > 0 || outline.shadow !== 'none', JSON.stringify(outline)).toBe(true);
    }
  });

  test('Résumé links follow public/resume.pdf', async ({ page }) => {
    await page.goto('/');
    const links = page.getByRole('link', { name: /Résumé/ });
    if (!hasResume) {
      await expect(links).toHaveCount(0);
      return;
    }
    const nav = page.getByRole('link', { name: /Résumé.*PDF, opens in a new tab/ });
    await expect(nav).toHaveAttribute('href', `/${site.resumeFile}`);
    await expect(nav).toHaveAttribute('target', '_blank');
  });
});

test.describe('competitive programming tabs', () => {
  test('mouse: switching tabs swaps the panel and chart', async ({ page }) => {
    await page.goto('/#cp');
    const tablist = page.getByRole('tablist', { name: 'Platform' });
    await expect(tablist).toBeVisible();
    await expect(page.getByRole('tab', { name: 'LeetCode' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#cp-panel-leetcode .cp-num')).toHaveText(shownRating('leetcode'));

    await page.getByRole('tab', { name: 'Codeforces' }).click();
    await expect(page.getByRole('tab', { name: 'Codeforces' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'LeetCode' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.locator('#cp-panel-codeforces')).toBeVisible();
    await expect(page.locator('#cp-panel-leetcode')).toBeHidden();
    await expect(page.locator('#cp-panel-codeforces .cp-num')).toHaveText(shownRating('codeforces'));
    await expect(page.locator('.graph[data-panel="codeforces"]')).toBeVisible();
    await expect(page.locator('.graph[data-panel="leetcode"]')).toBeHidden();
    await expect(page.getByRole('img', { name: /^Codeforces rating over \d+ rated contests/ })).toBeVisible();
  });

  test('keyboard: arrows, Home and End move selection; Tab leaves the tablist', async ({ page }) => {
    await page.goto('/#cp');
    const tab = (name: string) => page.getByRole('tab', { name });
    await tab('LeetCode').focus();

    await page.keyboard.press('ArrowRight');
    await expect(tab('Codeforces')).toBeFocused();
    await expect(tab('Codeforces')).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('End');
    await expect(tab('CodeChef')).toBeFocused();
    await expect(page.locator('#cp-panel-codechef .cp-num')).toHaveText(shownRating('codechef'));

    await page.keyboard.press('ArrowRight');
    await expect(tab('LeetCode')).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(tab('CodeChef')).toBeFocused();

    await page.keyboard.press('Home');
    await expect(tab('LeetCode')).toBeFocused();

    // Only the selected tab is in the tab order.
    await expect(tab('Codeforces')).toHaveAttribute('tabindex', '-1');
    await page.keyboard.press('Tab');
    await expect(page.locator('#cp-panel-leetcode a')).toBeFocused();
  });
});

test.describe('motion', () => {
  test('sections reveal as they scroll into view', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('article.proj').first();
    await expect(card).not.toHaveClass(/is-visible/);
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe('0');

    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-visible/);
    await expect.poll(() => card.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');

    await scrollThrough(page);
    const hidden = await page.locator('.reveal:not(.is-visible)').count();
    expect(hidden).toBe(0);
  });

  test('jumping to a section never leaves content above it hidden', async ({ page }) => {
    await page.goto('/#contact');
    await page.waitForTimeout(400);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    const stuck = await page.evaluate(
      () => [...document.querySelectorAll('.reveal:not(.is-visible)')].filter((el) => el.getBoundingClientRect().bottom < 0).length,
    );
    expect(stuck).toBe(0);
  });

  test.describe('with prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('everything is visible immediately and nothing animates', async ({ page }) => {
      await page.goto('/');
      const states = await page.evaluate(() => ({
        hidden: [...document.querySelectorAll('.reveal')].filter((el) => getComputedStyle(el).opacity !== '1').length,
        wordAnimation: getComputedStyle(document.querySelector('.punch .w')!).animationName,
        typed: getComputedStyle(document.querySelector('.typed')!).animationName,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        progress: getComputedStyle(document.querySelector('.progress')!).animationName,
      }));
      expect(states).toEqual({ hidden: 0, wordAnimation: 'none', typed: 'none', scrollBehavior: 'auto', progress: 'none' });
    });
  });

  test('if the reveal script never runs, content still shows', async ({ page }) => {
    // Serve the page with its module scripts stripped out (Astro inlines small ones into the HTML).
    await page.route('**/', async (route) => {
      const res = await route.fetch();
      const html = (await res.text()).replace(/<script type="module"[\s\S]*?<\/script>/g, '');
      await route.fulfill({ response: res, body: html });
    });
    await page.goto('/');
    await page.waitForTimeout(3300);
    await expect(page.locator('html')).not.toHaveClass(/\bjs\b/);
    const card = page.locator('article.proj').first();
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('all content is visible and the form still posts to Formspree', async ({ page }) => {
    await page.goto('/');
    const hidden = await page.locator('.reveal').evaluateAll((els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
    expect(hidden).toBe(0);
    await expect(page.locator('[data-tablist]')).toBeHidden();
    for (const id of ['leetcode', 'codeforces', 'codechef']) {
      await expect(page.locator(`#cp-panel-${id}`)).toBeVisible();
    }
    const form = page.locator('form[data-contact-form]');
    await expect(form).toHaveAttribute('action', 'https://formspree.io/f/e2e-test-form');
    await expect(form).toHaveAttribute('method', 'POST');
  });
});

test.describe('contact form', () => {
  test('success: posts JSON-accepting request, confirms and clears the form', async ({ page }) => {
    let body = '';
    let accept = '';
    await page.route('https://formspree.io/**', async (route) => {
      body = route.request().postData() ?? '';
      accept = route.request().headers()['accept'] ?? '';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });
    await page.goto('/#contact');
    await fillForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();

    await expect(page.getByRole('status')).toContainText('Thanks');
    expect(accept).toContain('application/json');
    expect(body).toContain('Test Recruiter');
    expect(body).toContain('recruiter@example.com');
    expect(body).toContain('_gotcha');
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
  });

  test('server error: shows Formspree’s message and the email fallback', async ({ page }) => {
    await page.route('https://formspree.io/**', (route) =>
      route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'Email is invalid.' }] }) }),
    );
    await page.goto('/#contact');
    await fillForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('status')).toContainText('Email is invalid.');
    await expect(page.getByRole('status')).toContainText(site.email);
    await expect(page.getByLabel('Name', { exact: true })).toHaveValue('Test Recruiter');
  });

  test('network failure: explains and keeps the message', async ({ page }) => {
    await page.route('https://formspree.io/**', (route) => route.abort('internetdisconnected'));
    await page.goto('/#contact');
    await fillForm(page);
    await page.getByRole('button', { name: 'Send message' }).click();
    await expect(page.getByRole('status')).toContainText('Check your connection');
    await expect(page.getByLabel('Message', { exact: true })).toHaveValue('Hello from the end-to-end tests.');
  });

  test('empty required fields block submission', async ({ page }) => {
    let requests = 0;
    await page.route('https://formspree.io/**', (route) => {
      requests++;
      return route.fulfill({ status: 200, body: '{}' });
    });
    await page.goto('/#contact');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForTimeout(300);
    expect(requests).toBe(0);
    expect(await page.getByLabel('Name', { exact: true }).evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  });

  test('can be completed with the keyboard alone', async ({ page }) => {
    await page.route('https://formspree.io/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
    );
    await page.goto('/#contact');
    await page.getByLabel('Name', { exact: true }).focus();
    await page.keyboard.type('Keyboard User');
    await page.keyboard.press('Tab');
    await page.keyboard.type('kb@example.com');
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Typed without a mouse.');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Send message' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText('Thanks');
  });
});

test.describe('responsive layout', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const width of [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920]) {
    test(`${width}px: no sideways scroll, compact header, sensible columns`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      await scrollThrough(page);

      const m = await page.evaluate(() => {
        const cols = (sel: string) => getComputedStyle(document.querySelector(sel)!).gridTemplateColumns.split(' ').length;
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          header: document.querySelector('header.nav')!.getBoundingClientRect().height,
          proj: cols('article.proj'),
          cp: cols('.cp'),
          skills: cols('.skills-grid'),
          wide: [...document.querySelectorAll<HTMLElement>('main *')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1 && getComputedStyle(el).position !== 'fixed' && !el.closest('.hero .grid-bg, .hero .glow, .floor')).map((el) => el.className).slice(0, 5),
        };
      });

      expect(m.overflow).toBeLessThanOrEqual(0);
      expect(m.wide).toEqual([]);
      expect(m.header).toBeLessThanOrEqual(width <= 760 ? 120 : 80);
      expect(m.proj).toBe(width <= 960 ? 1 : 2);
      expect(m.cp).toBe(width <= 960 ? 1 : 2);
      expect(m.skills).toBe(width <= 600 ? 1 : width <= 960 ? 2 : 4);
    });
  }
});

test.describe('accessibility (axe)', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const [name, path] of [
    ['home', '/'],
    ['404', '/nope'],
  ]) {
    test(`${name} has no WCAG 2.2 AA violations`, async ({ page }) => {
      await page.goto(path);
      await scrollThrough(page);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
      const summary = results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
      expect(summary).toEqual([]);
    });
  }

  test('each CP tab panel passes axe once selected', async ({ page }) => {
    await page.goto('/#cp');
    for (const name of ['Codeforces', 'CodeChef']) {
      await page.getByRole('tab', { name }).click();
      const results = await new AxeBuilder({ page }).include('#cp').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    }
  });
});
