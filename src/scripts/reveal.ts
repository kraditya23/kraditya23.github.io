// Adds .is-visible to each .reveal element the first time it enters the viewport.
// Hidden states (global.css) apply only under html.js without reduced motion.

declare global {
  interface Window {
    __revealReady?: boolean;
  }
}

export function initReveal(): void {
  window.__revealReady = true;
  const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduce || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
  );

  items.forEach((el) => io.observe(el));

  // Anchor jumps can skip blocks entirely; reveal anything already above the viewport.
  const revealAbove = () => {
    for (const el of items) {
      if (!el.classList.contains('is-visible') && el.getBoundingClientRect().bottom < 0) {
        el.classList.add('is-visible');
        io.unobserve(el);
      }
    }
  };
  window.addEventListener('scroll', revealAbove, { passive: true });
  window.addEventListener('hashchange', revealAbove);
}
