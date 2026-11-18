// Renders every fixture spec with the real webview bundle in headless Chrome, for every renderer,
// layout and AND-style combination, and fails on anything that parses but renders wrongly
// (render errors, garbled text, missing diagrams, boxes left disconnected in the rendered SVG).
//
// Usage: npm run render-check [-- --screenshots <dir>]
// Chrome is found via $CHROME_PATH, the usual macOS/Linux locations, or the PATH.
import { build } from 'esbuild';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const screenshotsAt = process.argv.includes('--screenshots') ? resolve(process.argv[process.argv.indexOf('--screenshots') + 1] ?? 'render-check-out') : undefined;

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
  ].filter(Boolean);
  for (const c of candidates) {
    if (c.includes('/') ? existsSync(c) : spawnSync('which', [c]).status === 0) return c;
  }
  return undefined;
}

const chrome = findChrome();
if (!chrome) {
  console.error('render-check: no Chrome/Chromium found. Set CHROME_PATH to its executable.');
  process.exit(2);
}
if (!existsSync(join(root, 'dist', 'webview.js'))) {
  console.error('render-check: dist/webview.js is missing. Run "npm run build" first.');
  process.exit(2);
}

const work = mkdtempSync(join(tmpdir(), 'openspec-viewer-render-'));
await build({ entryPoints: [join(root, 'src/core/index.ts')], bundle: true, format: 'esm', platform: 'node', outfile: join(work, 'core.mjs'), logLevel: 'silent' });
const { parseSpec, toMermaid, LAYOUTS, AND_STYLES } = await import(pathToFileURL(join(work, 'core.mjs')).href);
copyFileSync(join(root, 'dist', 'webview.js'), join(work, 'webview.js'));

const markdown = (dir) =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? markdown(p) : n.endsWith('.md') && n !== 'no-requirements.md' ? [p] : [];
  });
const files = markdown(join(root, 'test', 'fixtures'));
const models = files.map((f) => parseSpec(readFileSync(f, 'utf8')));

const combos = [
  { renderer: 'statechart' },
  ...LAYOUTS.flatMap((layout) => AND_STYLES.map((andStyle) => ({ renderer: 'flowchart', layout, andStyle }))),
];

const BAD = [
  [/Could not render this diagram/, 'a diagram failed to render'],
  [/Syntax error in text/i, 'Mermaid reported a syntax error'],
  [/ﬂ°|fl°|¶ß/, 'leaked Mermaid entity placeholder (garbled text)'],
  [/#(?:quot|lt|gt|amp);/, 'unconverted #code; entity in the page'],
];

/** Compares the rendered SVG with the diagram source: no stray boxes, no box left without an edge. */
function structureProblem(diagram, svg) {
  if (diagram.source.startsWith('stateDiagram')) {
    const declared = (diagram.source.match(/^\s*state ".*" as \w+$/gm) ?? []).length + 1; // + the start marker
    const nodes = (svg.match(/<g[^>]*class="[^"]*\bnode\b/g) ?? []).length;
    const edges = (svg.match(/<path[^>]*data-id="edge\d+"/g) ?? []).length;
    const wanted = (diagram.source.match(/ --> /g) ?? []).length;
    if (nodes !== declared) return `drawn with ${nodes} boxes but the source declares ${declared} (stray or missing boxes)`;
    if (edges !== wanted) return `drawn with ${edges} arrows but the source has ${wanted}`;
    return undefined;
  }
  if (diagram.source.includes('(no steps)')) return undefined; // such a box legitimately has no edge
  const nodes = [...svg.matchAll(/<g[^>]*class="[^"]*\bnode\b[^"]*"[^>]*id="[^"]*-flowchart-([A-Za-z0-9]+)-\d+"/g)].map((m) => m[1]);
  const touched = new Set();
  for (const m of svg.matchAll(/data-id="L_([A-Za-z0-9]+)_([A-Za-z0-9]+)_\d+"/g)) {
    touched.add(m[1]);
    touched.add(m[2]);
  }
  const loose = nodes.filter((id) => !touched.has(id));
  if (nodes.length > 1 && loose.length) return `box(es) ${loose.join(', ')} are not connected to the rest of the diagram`;
  return undefined;
}

let failures = 0;
for (const [i, combo] of combos.entries()) {
  const label = Object.values(combo).join(' / ');
  const diagrams = models.flatMap((m) => toMermaid(m, combo));
  const page = join(work, `page-${i}.html`);
  writeFileSync(
    page,
    `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:sans-serif;background:#fff}section{margin:16px 0;border-bottom:1px solid #888}</style></head><body>
<h1 id="title"></h1><div id="root"></div>
<script>window.acquireVsCodeApi=()=>({postMessage:()=>{}});</script><script src="webview.js"></script>
<script>window.postMessage({type:'render',title:'render-check',theme:'default',diagrams:${JSON.stringify(diagrams).replace(/</g, '\\u003c')}},'*');</script></body></html>`,
  );
  const flags = ['--headless=new', '--disable-gpu', '--virtual-time-budget=60000', ...(process.env.CI ? ['--no-sandbox'] : [])];
  let dom = '';
  try {
    dom = execFileSync(chrome, [...flags, '--dump-dom', pathToFileURL(page).href], { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  } catch (error) {
    console.error(`FAIL ${label}: Chrome did not finish (${error.message.split('\n')[0]})`);
    failures++;
    continue;
  }
  if (process.env.RENDER_CHECK_DUMP) writeFileSync(join(process.env.RENDER_CHECK_DUMP, `dom-${i}.html`), dom);
  // Only the visible markup counts: scripts hold the diagram sources and styles hold CSS like `#333;`.
  const visible = dom.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const problems = BAD.filter(([re]) => re.test(visible)).map(([, why]) => why);
  const sections = (dom.match(/<section>/g) ?? []).length;
  const svgs = (dom.match(/<section>[\s\S]*?<svg/g) ?? []).length;
  if (sections !== diagrams.length) problems.push(`expected ${diagrams.length} diagrams, page has ${sections}`);
  if (svgs < diagrams.length) problems.push(`only ${svgs} of ${diagrams.length} diagrams produced an SVG`);
  const rendered = visible.split('<section>').slice(1);
  diagrams.forEach((d, k) => {
    const problem = structureProblem(d, rendered[k] ?? '');
    if (problem) problems.push(`"${d.title}": ${problem}`);
  });
  if (problems.length) {
    failures++;
    console.error(`FAIL ${label}:\n  - ${problems.join('\n  - ')}`);
  } else {
    console.log(`ok   ${label} (${diagrams.length} diagrams)`);
  }
  if (screenshotsAt) {
    mkdirSync(screenshotsAt, { recursive: true });
    spawnSync(chrome, [...flags, '--hide-scrollbars', '--window-size=1600,4000', `--screenshot=${join(screenshotsAt, `${label.replace(/[^\w-]+/g, '_')}.png`)}`, pathToFileURL(page).href], { stdio: 'ignore', timeout: 180000 });
  }
}

if (failures) {
  console.error(`\nrender-check: ${failures} of ${combos.length} combinations failed.`);
  process.exit(1);
}
console.log(`\nrender-check: all ${combos.length} combinations rendered cleanly.`);
