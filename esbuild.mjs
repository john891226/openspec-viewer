import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');
const production = !watch;

const common = { bundle: true, sourcemap: !production, minify: production, logLevel: 'info' };

const targets = [
  { ...common, entryPoints: ['src/extension/extension.ts'], outfile: 'dist/extension.js', platform: 'node', format: 'cjs', target: 'node20', external: ['vscode'] },
  { ...common, entryPoints: ['src/webview/main.ts'], outfile: 'dist/webview.js', platform: 'browser', format: 'iife', target: 'es2022', legalComments: 'none' },
];

if (watch) {
  for (const t of targets) await (await context(t)).watch();
} else {
  await Promise.all(targets.map((t) => build(t)));
}
