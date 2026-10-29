// Site content and settings. Strings marked HTML may contain <b>, <code> and <span class="hl">.
// Empty strings hide what they feed.
// Also loaded by scripts/fetch-cp.mjs via Node type stripping: no imports, erasable TS syntax only.

export interface Word {
  text: string;
  /** 'accent' colours the word, 'underline' draws the accent rule under it. */
  style?: 'accent' | 'underline';
}

export const site = {
  name: 'Aditya Kumar',
  handle: 'kraditya23',
  // Canonical origin: canonical URLs, sitemap, robots.txt, preview-image URLs.
  url: 'https://kraditya23.github.io',
  title: 'Aditya Kumar — C++ and low-latency systems',
  description:
    'Third-year IT student at Delhi Technological University building low-latency systems in C++, including a limit order book engine written from scratch.',

  // Empty hides the email row; the contact card falls back to LinkedIn.
  email: 'kraditya2310@gmail.com',

  // File in public/. Résumé links render only if it exists.
  resumeFile: 'resume.pdf',

  // Formspree form ID (formspree.io/f/<id>). Empty shows an email card instead of the form.
  formspreeId: '',

  // Profile links. An empty string hides a link.
  links: {
    github: 'https://github.com/kraditya23',
    linkedin: 'https://www.linkedin.com/in/kraditya23/',
    leetcode: 'https://leetcode.com/u/kraditya23/',
    codeforces: 'https://codeforces.com/profile/kraditya23',
    codechef: 'https://www.codechef.com/users/kraditya23',
  },

  hero: {
    tags: ['systems & C++', 'DTU ’28'],
    // Empty hides the availability pill.
    availability: 'Open to SWE & quant-dev internships · 2027',
    // One inner array per line of the headline.
    headline: [
      [{ text: 'I' }, { text: 'build' }, { text: 'fast,', style: 'accent' }],
      [{ text: 'correct', style: 'underline' }, { text: 'systems' }],
      [{ text: 'in' }, { text: 'C++' }],
    ] as Word[][],
    // HTML
    lede: 'Third-year IT undergrad at <b>Delhi Technological University</b>. I write low-latency C++, ship full-stack apps, and solve contest problems for fun.',
  },

  about: {
    // HTML
    statement:
      'I started out making games in Class 10, stayed for the algorithms, and now spend my time <span class="hl">shaving nanoseconds</span> off an order book.',
    // HTML
    paragraphs: [
      'C++ has been my main language since well before college — <b>two-plus years before my B.Tech started</b> — and competitive programming taught me to care about two things at once: speed and correctness.',
      'These days I’m building a <b>low-latency limit order book engine</b> and aiming at trading-systems engineering — where a few hundred nanoseconds actually matter.',
      'Hardware counts too: <b>second prize at a micromouse competition</b>, after a sensor broke on competition day and I had to adapt on the spot.',
    ],
    education: [
      { when: '2024 — 2028', what: 'B.Tech, Information Technology', detail: 'Delhi Technological University · CGPA 8.65' },
      { when: 'JEE', what: 'Main — 99.6 percentile', detail: 'Advanced — top 9%' },
      { when: 'Certifications', what: 'Machine Learning & Deep Learning Specializations', detail: 'Andrew Ng · Coursera' },
      { when: 'Certifications', what: 'Discrete Mathematics for Computer Science', detail: 'UC San Diego' },
    ],
    facts: [
      { value: '2+ yrs', label: 'of C++ before college' },
      { value: '8.65', label: 'CGPA at DTU' },
      { value: '99.6', label: 'JEE Main percentile' },
      { value: '2nd', label: 'Micromouse competition' },
    ],
  },

  skills: [
    { title: 'Languages', blurb: 'What I think in', items: ['C++20/23', 'Python', 'Dart', 'SQL', 'C#'] },
    {
      title: 'Algorithms & systems',
      blurb: 'Where the nanoseconds go',
      items: ['Algorithms & DS', 'Memory pools', 'Intrusive containers', 'Benchmarking'],
    },
    {
      title: 'Apps & backend',
      blurb: 'Shipping real products',
      items: ['Flutter', 'Riverpod', 'Supabase', 'PostgreSQL + RLS', 'Firebase', 'Google OAuth'],
    },
    {
      title: 'Tools & foundations',
      blurb: 'Everything around the code',
      items: ['Git', 'Linux / macOS', 'VS Code', 'Unity', 'ML / DL', 'Discrete math'],
    },
  ],

  // Strip under the skills. Empty list hides it.
  now: {
    label: 'Up next',
    items: ['GoogleTest', 'Google Benchmark', 'Compiler Design'],
  },
};

// CP platforms to fetch and show, in tab order. Disabling one deletes its snapshot and tab.
export const cpPlatforms: Record<'leetcode' | 'codeforces' | 'codechef', { enabled: boolean }> = {
  leetcode: { enabled: true },
  codeforces: { enabled: true },
  codechef: { enabled: true },
};

// Ratings and counts come from src/data/cp/ (npm run fetch:cp). Only extras live here.
export const cp = {
  // HTML
  intro: 'Competitive programming since school — it’s where I learned to think in constraints and edge cases.',
  // Tiles next to the solved count. Empty list leaves just the solved count.
  extras: [
    { value: 'All-Kill', label: 'LeetCode Biweekly 185 · rank ~1,747 of 39K+' },
  ],
};
