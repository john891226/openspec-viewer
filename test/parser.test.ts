import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseSpec } from '../src/core/parser';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

describe('parseSpec: requirements and scenarios', () => {
  it('keeps requirement order, description and scenario order', () => {
    const m = parseSpec(
      '### Requirement: A\nThe system SHALL a.\n\n#### Scenario: one\n- **WHEN** x\n- **THEN** y\n#### Scenario: two\n- **WHEN** p\n- **THEN** q\n### Requirement: B\nText B',
    );
    expect(m.requirements.map((r) => r.name)).toEqual(['A', 'B']);
    expect(m.requirements[0]?.description).toBe('The system SHALL a.');
    expect(m.requirements[0]?.scenarios.map((s) => s.name)).toEqual(['one', 'two']);
    expect(m.requirements[1]?.description).toBe('Text B');
  });

  it('returns a requirement with no scenarios', () => {
    const m = parseSpec('### Requirement: Lonely\nSHALL exist.');
    expect(m.requirements[0]?.scenarios).toEqual([]);
  });
});

describe('parseSpec: steps', () => {
  it('attaches AND to the preceding phase', () => {
    const m = parseSpec(
      '### Requirement: R\n#### Scenario: S\n- **WHEN** a\n- **AND** b\n- **THEN** c\n- **AND** d',
    );
    const steps = m.requirements[0]?.scenarios[0]?.steps ?? [];
    expect(steps.map((s) => [s.keyword, s.phase])).toEqual([
      ['WHEN', 'condition'],
      ['AND', 'condition'],
      ['THEN', 'outcome'],
      ['AND', 'outcome'],
    ]);
  });

  it('treats GIVEN as a condition and keeps text verbatim', () => {
    const m = parseSpec('### Requirement: R\n#### Scenario: S\n- **GIVEN** a `code` | [x] "q"\n- **THEN** ok');
    const [given] = m.requirements[0]?.scenarios[0]?.steps ?? [];
    expect(given).toEqual({ keyword: 'GIVEN', text: 'a `code` | [x] "q"', phase: 'condition' });
  });

  it('accepts unbolded keywords and ignores other lines', () => {
    const m = parseSpec('### Requirement: R\n#### Scenario: S\nsome prose\n- note\n- WHEN a\n- THEN b');
    expect(m.requirements[0]?.scenarios[0]?.steps).toHaveLength(2);
  });
});

describe('parseSpec: delta sections, purpose, renames', () => {
  it('tags requirements with their delta kind', () => {
    const m = parseSpec(fixture('removed-renamed.md'));
    expect(m.requirements.map((r) => [r.name, r.delta])).toEqual([
      ['Login', 'MODIFIED'],
      ['Legacy export', 'REMOVED'],
    ]);
  });

  it('leaves delta undefined for plain specs', () => {
    const m = parseSpec('## Requirements\n\n### Requirement: R\n#### Scenario: S\n- **WHEN** a\n- **THEN** b');
    expect(m.requirements[0]?.delta).toBeUndefined();
  });

  it('captures reason and migration of removed requirements', () => {
    const r = parseSpec(fixture('removed-renamed.md')).requirements[1];
    expect(r?.scenarios).toEqual([]);
    expect(r?.reason).toBe('Replaced by new export system');
    expect(r?.migration).toBe('Use new export endpoint at /api/v2/export');
  });

  it('returns rename pairs', () => {
    expect(parseSpec(fixture('removed-renamed.md')).renames).toEqual([{ from: 'Old name', to: 'New name' }]);
  });

  it('captures purpose', () => {
    const m = parseSpec('## Purpose\n\nDoes a thing.\n\n## ADDED Requirements\n\n### Requirement: R');
    expect(m.purpose).toBe('Does a thing.');
  });
});

describe('parseSpec: robustness', () => {
  it('returns nothing for non-spec text', () => {
    expect(parseSpec(fixture('no-requirements.md')).requirements).toEqual([]);
  });

  it('ignores headers inside code fences', () => {
    const m = parseSpec(fixture('code-fence.md'));
    expect(m.requirements.map((r) => r.name)).toEqual(['Real one']);
    expect(m.requirements[0]?.scenarios).toHaveLength(1);
  });

  it('handles CRLF line endings', () => {
    const m = parseSpec('### Requirement: R\r\n#### Scenario: S\r\n- **WHEN** a\r\n- **THEN** b\r\n');
    expect(m.requirements[0]?.scenarios[0]?.steps).toHaveLength(2);
  });

  it('never throws on garbage input', () => {
    const alphabet = ['#', '###', 'Requirement:', 'Scenario:', '- **WHEN**', '- **THEN**', '```', '\n', ' ', 'x', '## ADDED Requirements', 'FROM:', 'TO:', '`'];
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    for (let i = 0; i < 500; i++) {
      let s = '';
      for (let j = 0; j < 40; j++) s += alphabet[Math.floor(rnd() * alphabet.length)];
      expect(() => parseSpec(s)).not.toThrow();
    }
    expect(() => parseSpec(undefined as unknown as string)).not.toThrow();
  });
});

describe('parseSpec: axion samples', () => {
  const expected: Record<string, [number, number]> = {
    'api/current-user': [3, 4],
  };
  const dir = join(__dirname, 'fixtures', 'axion');
  const specs = ['api/current-user', 'common/current-user', 'frontend/auth-shell', 'frontend/current-user'];

  for (const id of specs) {
    it(`parses ${id} with every requirement having scenarios`, () => {
      const path = join(dir, id, 'spec.md');
      expect(statSync(path).isFile()).toBe(true);
      const m = parseSpec(readFileSync(path, 'utf8'));
      expect(m.purpose).toBeTruthy();
      expect(m.requirements.length).toBeGreaterThan(0);
      for (const r of m.requirements) {
        expect(r.delta).toBe('ADDED');
        expect(r.scenarios.length).toBeGreaterThan(0);
        for (const s of r.scenarios) expect(s.steps.some((x) => x.phase === 'outcome')).toBe(true);
      }
      const want = expected[id];
      if (want) {
        expect(m.requirements).toHaveLength(want[0]);
        expect(m.requirements.reduce((n, r) => n + r.scenarios.length, 0)).toBe(want[1]);
      }
    });
  }

  it('finds all fixture directories', () => {
    expect(readdirSync(dir).length).toBeGreaterThan(0);
  });
});
