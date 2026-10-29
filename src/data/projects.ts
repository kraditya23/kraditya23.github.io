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
  /** HTML */
  bullets?: string[];
  chips: string[];
  links: Link[];
}

// Benchmark run 1 (one wall-clock timer around all operations). Also shown in the hero terminal.
export const lobBench = {
  command: './lob_benchmark',
  build: 'g++ -O3 -march=native',
  machine: 'MacBook Air (M3), single thread',
  warmup: '100,000 orders',
  ops: '500,000',
  levels: '5,000 / side',
  throughput: '6.8M ops/s',
  perOp: '~147 ns/op',
};

export const lob: Project = {
  id: 'lob',
  meta: 'C++20 · systems',
  status: 'In progress',
  statusLive: true,
  title: 'Limit Order Book Engine',
  lede: 'A low-latency matching core with price-time priority, crossing limit orders and market orders, built on intrusive data structures and preallocated memory pools.',
  metrics: [
    { value: '6.8M+', label: 'ops / second' },
    { value: '~147 ns', label: 'avg per op' },
    { value: 'O(1)', label: 'avg order lookup' },
  ],
  bullets: [
    'Separate bid/ask price trees (intrusive AVL), each level holding a FIFO queue for time priority',
    'Aligned memory pools (free list + bump pointer) for orders and price levels',
    'One <code>sweep()</code> path matches both crossing limit orders and market orders',
    'Benchmarked on 500K mixed ops across 5,000 levels per side (MacBook Air M3, single thread)',
  ],
  chips: ['C++20', 'AVL trees', 'Memory pools', 'Benchmarking'],
  links: [{ label: 'Source on GitHub', href: 'https://github.com/kraditya23/Limit-Order-Book' }],
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
