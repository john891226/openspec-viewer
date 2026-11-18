// @vitest-environment jsdom
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import mermaid from 'mermaid';
import { describe, expect, it } from 'vitest';
import { toMermaid } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';
import { isSpecPath } from '../src/core/specPath';

const root = join(__dirname, 'fixtures', 'demo');

function specs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return specs(path);
    return name === 'spec.md' ? [path] : [];
  });
}

const all = specs(root);
const rel = (p: string) => relative(root, p);

// [requirements, scenarios] per demo spec.
const expected: Record<string, [number, number]> = {
  'openspec/specs/simple/greeting/spec.md': [1, 1],
  'openspec/specs/simple/login/spec.md': [2, 3],
  'openspec/specs/complex/checkout/spec.md': [4, 11],
  'openspec/specs/edge/malformed/spec.md': [7, 6],
  'openspec/specs/edge/empty/spec.md': [0, 0],
  'openspec/changes/improve-checkout/specs/complex/checkout/spec.md': [3, 3],
  'openspec/changes/new-notifications/specs/notifications/email/spec.md': [2, 3],
};

describe('demo workspace', () => {
  it('contains every expected spec', () => {
    expect(all.map(rel).sort()).toEqual(Object.keys(expected).sort());
  });

  for (const file of all) {
    describe(rel(file), () => {
      const model = parseSpec(readFileSync(file, 'utf8'));

      it('is recognised as a spec path', () => expect(isSpecPath(file)).toBe(true));

      it('parses to the expected requirement and scenario counts', () => {
        const scenarios = model.requirements.reduce((n, r) => n + r.scenarios.length, 0);
        expect([model.requirements.length, scenarios]).toEqual(expected[rel(file)]);
      });

      it('produces valid Mermaid for every diagram', async () => {
        for (const d of toMermaid(model)) await expect(mermaid.parse(d.source)).resolves.toBeTruthy();
      });
    });
  }

  it('labels the delta kinds in the improve-checkout change', () => {
    const file = all.find((f) => rel(f).includes('improve-checkout')) as string;
    const model = parseSpec(readFileSync(file, 'utf8'));
    expect(model.requirements.map((r) => r.delta)).toEqual(['ADDED', 'MODIFIED', 'REMOVED']);
    expect(model.renames).toEqual([{ from: 'Stock reservation', to: 'Inventory hold' }]);
  });
});
