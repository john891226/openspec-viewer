// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { toMermaid } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';

const dir = join(__dirname, 'fixtures');
const files = [
  'removed-renamed.md',
  'special-chars.md',
  'code-fence.md',
  ...['api/current-user', 'common/current-user', 'frontend/auth-shell', 'frontend/current-user'].map((i) => `axion/${i}/spec.md`),
];

describe('generated diagrams are valid Mermaid', () => {
  for (const f of files) {
    it(f, async () => {
      const diagrams = toMermaid(parseSpec(readFileSync(join(dir, f), 'utf8')));
      expect(diagrams.length).toBeGreaterThan(0);
      for (const d of diagrams) await expect(mermaid.parse(d.source)).resolves.toBeTruthy();
    });
  }
  it('fixtures directory is present', () => expect(readdirSync(dir).length).toBeGreaterThan(0));
});
