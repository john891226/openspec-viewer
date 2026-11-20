import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveOptions, toMermaid } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';
import { Renderer } from '../src/core/options';

const gen = (text: string) => toMermaid(parseSpec(text), { renderer: Renderer.Statechart });
const src = (text: string) => gen(text)[0]?.source ?? '';

const FULL = '### Requirement: R\n#### Scenario: s\n- **GIVEN** g\n- **WHEN** w\n- **AND** c\n- **THEN** t\n- **AND** a';

describe('statechart renderer', () => {
  it('is a state diagram and is the default renderer', () => {
    expect(src(FULL).startsWith('stateDiagram-v2')).toBe(true);
    expect(toMermaid(parseSpec(FULL))[0]?.source).toBe(src(FULL));
    expect(resolveOptions({ renderer: 'x' }).renderer).toBe('statechart');
    expect(toMermaid(parseSpec(FULL), { renderer: Renderer.Flowchart })[0]?.source.startsWith('flowchart')).toBe(true);
  });

  it('maps GIVEN to the source state, WHEN to the event, AND to a guard, THEN to the target', () => {
    const out = src(FULL);
    expect(out).toContain('state "g" as G1');
    expect(out).toContain('G1 --> T1 : <b>s</b><br/>w<br/>[c]');
    expect(out).toContain('state "t<br/>a" as T1');
  });

  it('connects every GIVEN state to the requirement state so none floats on its own', () => {
    const out = src(
      '### Requirement: R\n#### Scenario: one\n- **GIVEN** pending\n- **WHEN** x\n- **THEN** done\n#### Scenario: two\n- **GIVEN** pending\n- **WHEN** y\n- **THEN** done\n#### Scenario: three\n- **GIVEN** other\n- **WHEN** z\n- **THEN** done',
    );
    expect(out).toContain('R --> G1 : GIVEN');
    expect(out).toContain('R --> G2 : GIVEN');
    expect(out.match(/R --> G\d : GIVEN/g)).toHaveLength(2); // shared GIVEN gets one entry edge
  });

  it('leaves no state without an incoming transition (nothing disconnected)', () => {
    for (const file of ['demo/openspec/specs/complex/checkout/spec.md', 'demo/openspec/specs/simple/login/spec.md', 'removed-renamed.md']) {
      for (const d of gen(readFileSync(join(__dirname, 'fixtures', file), 'utf8'))) {
        const declared = [...d.source.matchAll(/as (\w+)$/gm)].map((m) => m[1]);
        const targets = new Set([...d.source.matchAll(/--> (\w+)/g)].map((m) => m[1]));
        for (const id of declared) expect(targets.has(id as string), `${file}: ${id} has no incoming edge`).toBe(true);
      }
    }
  });

  it('starts from the requirement state when there is no GIVEN', () => {
    expect(src('### Requirement: R\n#### Scenario: s\n- **WHEN** w\n- **THEN** t')).toContain('R --> T1 : <b>s</b><br/>w');
  });

  it('joins several guards', () => {
    expect(src('### Requirement: R\n#### Scenario: s\n- **WHEN** w\n- **AND** a\n- **AND** b\n- **THEN** t')).toContain('[a && b]');
  });

  it('shares states with identical GIVEN or THEN text', () => {
    const out = src(
      '### Requirement: R\n#### Scenario: one\n- **GIVEN** pending\n- **WHEN** x\n- **THEN** done\n#### Scenario: two\n- **GIVEN** pending\n- **WHEN** y\n- **THEN** done\n- **AND** mail',
    );
    expect(out.match(/as G\d/g)).toHaveLength(1);
    expect(out.match(/as T\d/g)).toHaveLength(1);
    expect(out).toContain('state "done<br/>mail" as T1');
    expect(out).toContain('G1 --> T1 : <b>one</b>');
    expect(out).toContain('G1 --> T1 : <b>two</b>');
  });

  it('keeps going when WHEN or THEN is missing', () => {
    const noThen = src('### Requirement: R\n#### Scenario: s\n- **WHEN** w');
    expect(noThen).toContain('(no outcome)');
    const noWhen = src('### Requirement: R\n#### Scenario: s\n- **THEN** t');
    expect(noWhen).toContain('R --> T1 : <b>s</b>');
  });

  it('labels and styles deltas, and shows the reason of removed requirements', () => {
    const out = gen(readFileSync(join(__dirname, 'fixtures', 'removed-renamed.md'), 'utf8'));
    expect(out[0]?.source).toContain('state "MODIFIED: Login" as R');
    expect(out[0]?.source).toContain('class R modified');
    expect(out[1]?.source).toContain('Replaced by new export system');
    expect(out[2]?.id).toBe('rename-1');
  });

  it('keeps transition labels free of characters that end or break a Mermaid state statement', () => {
    const out = src(readFileSync(join(__dirname, 'fixtures', 'special-chars.md'), 'utf8'));
    const transitions = out.split('\n').filter((l) => / --> \S+ : /.test(l));
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      const label = t.slice(t.indexOf(' : ') + 3).replace(/<\/?b>|<br\/>/g, '');
      expect(label).not.toMatch(/[;<>]/);
    }
  });

  it('escapes state descriptions as HTML entities', () => {
    expect(src('### Requirement: R\n#### Scenario: s\n- **WHEN** w\n- **THEN** a "quoted" `code`')).toContain('a &quot;quoted&quot; &grave;code&grave;');
  });

  it('is deterministic', () => {
    expect(gen(FULL)).toEqual(gen(FULL));
  });
});
