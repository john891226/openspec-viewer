// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { AND_STYLES, LAYOUTS, toMermaid } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';

const fixtures = join(__dirname, 'fixtures');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : name.endsWith('.md') ? [path] : [];
  });

const all = files(fixtures).filter((f) => !f.endsWith('no-requirements.md'));

describe('statechart diagrams are valid Mermaid', () => {
  it('for every fixture', async () => {
    let count = 0;
    for (const file of all) {
      for (const d of toMermaid(parseSpec(readFileSync(file, 'utf8')), { renderer: 'statechart' })) {
        await expect(mermaid.parse(d.source), `${file}: ${d.title}`).resolves.toBeTruthy();
        count++;
      }
    }
    expect(count).toBeGreaterThan(20);
  });
});

describe('generated diagrams are valid Mermaid for every layout and AND style', () => {
  for (const layout of LAYOUTS) {
    for (const andStyle of AND_STYLES) {
      it(`${layout} + ${andStyle}`, async () => {
        let count = 0;
        for (const file of all) {
          for (const d of toMermaid(parseSpec(readFileSync(file, 'utf8')), { renderer: 'flowchart', layout, andStyle })) {
            await expect(mermaid.parse(d.source), `${file}: ${d.title}`).resolves.toBeTruthy();
            count++;
          }
        }
        expect(count).toBeGreaterThan(20);
      });
    }
  }
});
