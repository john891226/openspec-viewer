// Fails packaging when marketplace metadata is incomplete or still contains placeholders.
// Set OPENSPEC_VIEWER_ALLOW_PLACEHOLDERS=1 to bypass for local development builds.
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const problems = [];

const placeholders = JSON.stringify(pkg).match(/[\w-]*placeholder[\w-]*/gi) ?? [];
if (placeholders.length && process.env.OPENSPEC_VIEWER_ALLOW_PLACEHOLDERS !== '1') {
  problems.push(`package.json still contains placeholders: ${[...new Set(placeholders)].join(', ')}`);
}

for (const field of ['publisher', 'displayName', 'description', 'version', 'license', 'icon', 'repository', 'bugs', 'homepage', 'categories', 'keywords', 'galleryBanner']) {
  if (!pkg[field] || (Array.isArray(pkg[field]) && pkg[field].length === 0)) problems.push(`package.json is missing "${field}"`);
}
for (const file of ['LICENSE', 'CHANGELOG.md', 'README.md', pkg.icon].filter(Boolean)) {
  if (!existsSync(file)) problems.push(`missing file: ${file}`);
}

if (problems.length) {
  console.error('Metadata check failed:\n - ' + problems.join('\n - '));
  console.error('\nSee docs/PUBLISHING.md. For a local-only build set OPENSPEC_VIEWER_ALLOW_PLACEHOLDERS=1.');
  process.exit(1);
}
console.log('Metadata check passed.');
