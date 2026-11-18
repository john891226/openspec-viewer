import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { escapeLabel, toMermaid } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
const gen = (text: string) => toMermaid(parseSpec(text));

describe('toMermaid: structure', () => {
  it('produces one flowchart per requirement in source order', () => {
    const d = gen('### Requirement: A\n#### Scenario: s\n- **WHEN** a\n- **THEN** b\n### Requirement: B\n#### Scenario: t\n- **WHEN** c\n- **THEN** d');
    expect(d.map((x) => x.title)).toEqual(['A', 'B']);
    expect(d.every((x) => x.source.startsWith('flowchart LR'))).toBe(true);
  });

  it('links requirement to condition to outcome', () => {
    const [d] = gen('### Requirement: A\n#### Scenario: happy\n- **WHEN** a\n- **THEN** b');
    expect(d?.source).toContain('R -->|"happy"| S1C["<b>WHEN</b> a"]');
    expect(d?.source).toContain('S1C --> S1O["<b>THEN</b> b"]');
  });

  it('merges AND lines into the preceding node', () => {
    const [d] = gen('### Requirement: A\n#### Scenario: s\n- **WHEN** a\n- **AND** b\n- **THEN** x\n- **AND** y');
    expect(d?.source).toContain('<b>WHEN</b> a<br/>b');
    expect(d?.source).toContain('<b>THEN</b> x<br/>y');
  });

  it('still renders a scenario that lacks THEN or WHEN', () => {
    const [a] = gen('### Requirement: A\n#### Scenario: s\n- **WHEN** only');
    expect(a?.source).toContain('S1C[');
    expect(a?.source).not.toContain('S1O');
    const [b] = gen('### Requirement: A\n#### Scenario: s\n- **THEN** only');
    expect(b?.source).toContain('R -->|"s"| S1O[');
    const [c] = gen('### Requirement: A\n#### Scenario: s');
    expect(c?.source).toContain('(no steps)');
  });

  it('renders a requirement without scenarios as a lone root', () => {
    const [d] = gen('### Requirement: Alone');
    expect(d?.source).toBe('flowchart LR\n  R["Alone"]');
  });
});

describe('toMermaid: escaping', () => {
  it('escapes characters that could break or inject', () => {
    expect(escapeLabel('a "b" [c] | <d> {e} `f` #g ;h')).toBe(
      'a #quot;b#quot; #91;c#93; #124; #lt;d#gt; #123;e#125; #96;f#96; #35;g #59;h'.replace('#lt;d#gt;', '#lt;d#gt;'),
    );
  });

  it('never leaves raw quotes or angle brackets from user text in the source', () => {
    const [d] = gen(fixture('special-chars.md'));
    const body = (d?.source ?? '').replace(/<\/?b>|<br\/>/g, '');
    expect(body).not.toMatch(/<(?!\/?b>|br\/>)/);
    expect(d?.source).toContain('#quot;');
  });
});

describe('toMermaid: delta labelling', () => {
  const diagrams = gen(fixture('removed-renamed.md'));

  it('labels MODIFIED with text and class', () => {
    expect(diagrams[0]?.source).toContain('R["MODIFIED: Login"]:::modified');
    expect(diagrams[0]?.source).toContain('classDef modified');
  });

  it('labels REMOVED and shows the reason', () => {
    expect(diagrams[1]?.source).toContain('R["REMOVED: Legacy export"]:::removed');
    expect(diagrams[1]?.source).toContain('Replaced by new export system');
  });

  it('produces a rename diagram', () => {
    const rename = diagrams[2];
    expect(rename?.id).toBe('rename-1');
    expect(rename?.source).toContain('O["Old name"]:::renamed -->|"RENAMED"| N["New name"]:::renamed');
  });

  it('adds no class to plain requirements', () => {
    const [d] = gen('### Requirement: Plain');
    expect(d?.source).not.toContain(':::');
    expect(d?.source).not.toContain('classDef');
  });
});

describe('toMermaid: determinism and samples', () => {
  it('is deterministic', () => {
    const text = fixture('removed-renamed.md');
    expect(gen(text)).toEqual(gen(text));
  });

  it('matches snapshots for the axion samples', () => {
    for (const id of ['api/current-user', 'frontend/auth-shell']) {
      const out = gen(readFileSync(join(__dirname, 'fixtures', 'axion', id, 'spec.md'), 'utf8'));
      expect(out.map((d) => d.source).join('\n\n')).toMatchSnapshot(id);
    }
  });
});
