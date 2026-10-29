// Projects section content. Strings marked HTML may contain <b> and <code>.
// Empty strings hide what they feed.

export interface Link {
  label: string;
  href: string;
}

export interface Project {
  id: string;
  /** Small line above the meta row, e.g. "Where it all started". */
  kicker?: string;
  meta: string;
  status: string;
  /** Highlighted status pill (accent) vs a quiet one. */
  statusLive?: boolean;
  title: string;
  /** HTML */
  lede: string;
  metrics?: { value: string; label: string }[];
  /** Small print under the metrics (method, caveats). */
  metricsNote?: string;
  /** HTML */
  bullets?: string[];
  chips: string[];
  links: Link[];
}

// Interim harness (bench/lob_benchmark.cpp), median of 11 runs. Also shown in the hero terminal.
export const lobBench = {
  command: './lob_benchmark',
  build: 'clang++ -O3 -march=native',
  machine: 'MacBook Air (M3), single thread',
  warmup: '100,000 orders',
  ops: '500,000',
  levels: '5,000 / side',
  runs: '11 · median',
  throughput: '6.1M ops/s',
  mean: '163 ns/op',
  p99: '≤ 542 ns',
};

export const lob: Project = {
  id: 'lob',
  meta: 'C++20 · systems',
  status: 'Matching core complete',
  statusLive: true,
  title: 'Limit Order Book Engine',
  lede: 'A C++20 limit order book and matching engine with strict price-time priority, fixed-point prices and data structures chosen for predictable, cache-friendly latency.',
  metrics: [
    { value: '6.1M', label: 'ops / sec' },
    { value: '163 ns', label: 'mean per op' },
    { value: '≤ 542 ns', label: 'p99 per op' },
  ],
  metricsNote:
    'Median of 11 runs: 500K mixed ops on a 100K-order book over 5,000 levels per side, single thread on an Apple M3. p99 includes timer overhead, so it is an upper bound.',
  bullets: [
    'Strict price-time priority: crossing limits sweep the book and rest the remainder, market orders fill IOC, and modifies follow exchange rules (size cuts keep queue position, reprices re-queue)',
    'Each <code>PriceLevel</code> is both an AVL tree node and the head of an intrusive FIFO order queue, so a hash-mapped cancel is a pointer splice: O(1) average, O(log L) only when a level empties',
    '64-byte <code>Order</code> and <code>PriceLevel</code> records, pinned by <code>static_assert</code>, come from fixed-capacity memory pools and are never individually heap-allocated',
    'Fail-safe API: <code>[[nodiscard]]</code> status codes reject duplicate IDs, unknown IDs and zero quantities before any state changes; fills append to a caller-owned buffer; runs clean under ASan/UBSan',
  ],
  chips: ['C++20', 'CMake', 'Intrusive AVL', 'Memory pools', 'ASan/UBSan'],
  links: [
    { label: 'Source on GitHub', href: 'https://github.com/kraditya23/Limit-Order-Book' },
    { label: 'Benchmark method', href: 'https://github.com/kraditya23/Limit-Order-Book/blob/main/bench/lob_benchmark.cpp' },
  ],
};

export const connecta: Project & { screenshot: { src360: string; src738: string; alt: string } } = {
  id: 'connecta',
  meta: 'Flutter · Supabase',
  status: 'Shipped v1.0.0',
  statusLive: true,
  title: 'Connecta',
  lede: 'Digital business cards for people who still hand out paper ones. Show your QR, scan theirs, and you’re connected.',
  bullets: [
    'Built end to end: the Flutter app (Material 3, Riverpod 2) and the backend behind it',
    'Migrated Firebase → Supabase: Postgres with row-level security, <code>SECURITY DEFINER</code> RPCs for the contact exchange, a Deno Edge Function for account deletion',
    'Google sign-in via Supabase Auth, driven by a five-state reactive auth gate',
    'Released as an Android APK on GitHub; hardened with 7–8 early testers',
  ],
  chips: ['Flutter', 'Dart', 'Supabase', 'PostgreSQL', 'Riverpod'],
  links: [
    { label: 'Download APK', href: 'https://github.com/kraditya23/Connecta/releases/tag/v1.0.0' },
    { label: 'Source', href: 'https://github.com/kraditya23/Connecta' },
  ],
  screenshot: {
    src360: '/projects/connecta/share-qr-360.webp',
    src738: '/projects/connecta/share-qr-738.webp',
    alt: 'Connecta’s share screen: a QR code with the Connecta logo, the caption “Scan with Connecta to view my card”, an Offline QR (vCard) toggle and a Share QR image button.',
  },
};

export const game: Project & { repoName: string; year: string; playUrl: string } = {
  id: 'game',
  kicker: 'Where it all started',
  meta: 'Unity · C# · 2021',
  status: 'Remaster in progress',
  title: 'Bringing a Gun to a Sword Fight',
  lede: 'A boss-fight game I built in Unity back in Class 10, rough edges and all. It’s getting a Unity 6 remaster so you can play it right here in the browser.',
  chips: ['Unity', 'C#', 'WebGL (planned)'],
  // Empty hides the link.
  links: [{ label: 'Source', href: 'https://github.com/kraditya23/bringing-gun-to-a-sword-fight' }],
  repoName: 'bringing-gun-to-a-sword-fight',
  year: '2021',
  // Set to the hosted WebGL build to turn "coming soon" into a Play link.
  playUrl: '',
};
