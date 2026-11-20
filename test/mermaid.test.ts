import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { escapeLabel, resolveOptions, toMermaid, type DiagramOptions } from '../src/core/mermaid';
import { parseSpec } from '../src/core/parser';
import { AndStyle, AND_STYLES, Layout, LAYOUTS, Renderer } from '../src/core/options';

const fixture = (name: string) => readFileSync(join(__dirname, 'fixtures', name), 'utf8');
// The default renderer is the statechart; these tests are about the flowchart renderer.
const gen = (text: string, options?: DiagramOptions) => toMermaid(parseSpec(text), { renderer: Renderer.Flowchart, ...options });

const SPEC =
  '### Requirement: Pay\n' +
  '#### Scenario: Discount\n- **WHEN** a\n- **AND** b\n- **AND** c\n- **THEN** x\n- **AND** y\n' +
  '#### Scenario: Declined\n- **WHEN** d\n- **THEN** z';

describe('toMermaid: defaults and structure', () => {
  it('produces one flowchart per requirement in source order', () => {
    const d = gen('### Requirement: A\n#### Scenario: s\n- **WHEN** a\n- **THEN** b\n### Requirement: B\n#### Scenario: t\n- **WHEN** c\n- **THEN** d');
    expect(d.map((x) => x.title)).toEqual(['A', 'B']);
    expect(d.every((x) => x.source.startsWith('flowchart LR'))).toBe(true);
  });

  it('defaults to the decision-diamond layout with chained ANDs', () => {
    expect(gen(SPEC)[0]?.source).toBe(gen(SPEC, { layout: Layout.DecisionDiamond, andStyle: AndStyle.Chained })[0]?.source);
  });

  it('falls back to defaults for unknown option values', () => {
    expect(resolveOptions({ layout: 'nope', andStyle: 'diamonds' })).toEqual({ renderer: Renderer.Statechart, layout: Layout.DecisionDiamond, andStyle: AndStyle.Chained });
    expect(gen(SPEC, { layout: 'x' as never })[0]?.source).toBe(gen(SPEC)[0]?.source);
  });

  it('renders a requirement without scenarios as a lone root', () => {
    for (const layout of LAYOUTS) {
      expect(gen('### Requirement: Alone', { layout })[0]?.source).toBe('flowchart LR\n  R["Alone"]');
    }
  });

  it('is deterministic', () => {
    const text = fixture('removed-renamed.md');
    expect(gen(text)).toEqual(gen(text));
  });
});

describe('layout: decision-diamond', () => {
  const src = gen(SPEC, { layout: Layout.DecisionDiamond })[0]?.source ?? '';

  it('goes through one decision node with a branch per scenario', () => {
    expect(src).toContain('R --> D{"Scenarios"}');
    expect(src).toContain('D --> O1["<b>Discount</b><br/><b>WHEN</b> a"]');
    expect(src).toContain('D --> O2["<b>Declined</b><br/><b>WHEN</b> d"]');
    expect(src.match(/\bD\{/g)).toHaveLength(1);
  });

  it('merges the scenario name and WHEN into one node (no separate WHEN step)', () => {
    expect(src).not.toMatch(/S\dC0\[/);
    expect(src).toContain('O2 --> S2O0["<b>THEN</b> z"]');
  });

  it('draws no diamond for a requirement with a single scenario', () => {
    const single = gen('### Requirement: A\n#### Scenario: only\n- **WHEN** a\n- **THEN** b')[0]?.source ?? '';
    expect(single).not.toContain('D{');
    expect(single).toContain('R --> O1["<b>only</b><br/><b>WHEN</b> a"]');
  });

  it('shows a scenario without steps', () => {
    expect(gen('### Requirement: A\n#### Scenario: s\n#### Scenario: t')[0]?.source).toContain('O1["<b>s</b><br/>(no steps)"]');
  });
});

describe('GIVEN followed by WHEN', () => {
  const GIVEN = '### Requirement: R\n#### Scenario: s\n- **GIVEN** g\n- **WHEN** w\n- **AND** a\n- **THEN** t';

  it('puts GIVEN and WHEN in the same branch node, with ANDs as hexagons', () => {
    const src = gen(GIVEN)[0]?.source ?? '';
    expect(src).toContain('O1["<b>s</b><br/><b>GIVEN</b> g<br/><b>WHEN</b> w"]');
    expect(src).toContain('O1 --> S1C2{{"<b>AND</b> a"}}');
    expect(src).not.toMatch(/S1C1\[|S1C1\{/);
  });

  it('merges them in options-box too', () => {
    expect(gen(GIVEN, { layout: Layout.OptionsBox })[0]?.source).toContain('<b>GIVEN</b> g<br/><b>WHEN</b> w"]');
  });
});

describe('layout: options-box', () => {
  const src = gen(SPEC, { layout: Layout.OptionsBox })[0]?.source ?? '';

  it('lists scenarios as numbered options inside one subgraph', () => {
    expect(src).toContain('subgraph R["Pay"]');
    expect(src).toContain('O1["<b>1.</b> Discount<br/><b>WHEN</b> a"]');
    expect(src).toContain('O2["<b>2.</b> Declined<br/><b>WHEN</b> d"]');
    expect(src).toContain('end');
  });

  it('has no separate WHEN node per scenario and leads each option to its outcome', () => {
    expect(src).not.toMatch(/S1C0\[/);
    expect(src).toContain('O2 --> S2O0["<b>THEN</b> z"]');
  });

  it('still shows a scenario with no steps', () => {
    expect(gen('### Requirement: R\n#### Scenario: s', { layout: Layout.OptionsBox })[0]?.source).toContain('(no steps)');
  });
});

describe('layout: scenario-flow', () => {
  const src = gen(SPEC, { layout: Layout.ScenarioFlow })[0]?.source ?? '';

  it('links the requirement to each scenario via a labelled edge, without a diamond', () => {
    expect(src).toContain('R -->|"Discount"| S1C0["<b>WHEN</b> a"]');
    expect(src).toContain('R -->|"Declined"| S2C0');
    expect(src).not.toContain('D{');
  });

  it('draws a scenario lacking WHEN or THEN, or any steps', () => {
    expect(gen('### Requirement: A\n#### Scenario: s\n- **WHEN** only', { layout: Layout.ScenarioFlow })[0]?.source).not.toContain('S1O');
    expect(gen('### Requirement: A\n#### Scenario: s\n- **THEN** only', { layout: Layout.ScenarioFlow })[0]?.source).toContain('R -->|"s"| S1O0[');
    expect(gen('### Requirement: A\n#### Scenario: s', { layout: Layout.ScenarioFlow })[0]?.source).toContain('(no steps)');
  });
});

describe('AND style', () => {
  it('chained: each AND is its own hexagon condition, outcomes follow in sequence', () => {
    const src = gen(SPEC, { layout: Layout.ScenarioFlow, andStyle: AndStyle.Chained })[0]?.source ?? '';
    expect(src).toContain('S1C0 --> S1C1{{"<b>AND</b> b"}}');
    expect(src).toContain('S1C1 --> S1C2{{"<b>AND</b> c"}}');
    expect(src).toContain('S1C2 --> S1O0["<b>THEN</b> x"]');
    expect(src).toContain('S1O0 --> S1O1["<b>AND</b> y"]');
  });

  it('never uses a decision diamond for an AND', () => {
    for (const layout of LAYOUTS) {
      const src = gen(SPEC, { layout, andStyle: AndStyle.Chained })[0]?.source ?? '';
      expect(src.replace(/\{\{/g, '').match(/S\dC\d\{/g)).toBeNull();
    }
  });

  it('chained in the default layout: WHEN merged into the branch node, ANDs as hexagons', () => {
    for (const layout of [Layout.DecisionDiamond, Layout.OptionsBox]) {
      const src = gen(SPEC, { layout, andStyle: AndStyle.Chained })[0]?.source ?? '';
      expect(src).toContain('O1 --> S1C1{{"<b>AND</b> b"}}');
    }
    const src = gen(SPEC)[0]?.source ?? '';
    expect(src).toContain('O1 --> S1C1{{"<b>AND</b> b"}}');
    expect(src).toContain('S1C2 --> S1O0');
  });

  it('list: one condition node and one outcome node', () => {
    const src = gen(SPEC, { layout: Layout.ScenarioFlow, andStyle: AndStyle.List })[0]?.source ?? '';
    expect(src).toContain('S1C["<b>WHEN</b> a<br/><b>AND</b> b<br/><b>AND</b> c"]');
    expect(src).toContain('S1O["<b>THEN</b> x<br/><b>AND</b> y"]');
  });

  it('list in merged layouts: conditions merged into the branch node', () => {
    expect(gen(SPEC, { layout: Layout.OptionsBox, andStyle: AndStyle.List })[0]?.source).toContain('O1["<b>1.</b> Discount<br/><b>WHEN</b> a<br/><b>AND</b> b<br/><b>AND</b> c"]');
    const src = gen(SPEC, { layout: Layout.DecisionDiamond, andStyle: AndStyle.List })[0]?.source ?? '';
    expect(src).toContain('O1["<b>Discount</b><br/><b>WHEN</b> a<br/><b>AND</b> b<br/><b>AND</b> c"]');
  });
});

describe('escaping', () => {
  it('escapes characters that could break or inject, using named HTML entities', () => {
    expect(escapeLabel('a "b" [c] | <d> {e} `f` #g ;h')).toBe(
      'a &quot;b&quot; &lbrack;c&rbrack; &vert; &lt;d&gt; &lbrace;e&rbrace; &grave;f&grave; &num;g &semi;h',
    );
  });

  it('never emits Mermaid-style `#code;` entities, so labels do not depend on the page charset', () => {
    for (const layout of LAYOUTS) {
      for (const andStyle of AND_STYLES) {
        const [d] = gen(fixture('special-chars.md'), { layout, andStyle });
        expect(d?.source).not.toMatch(/#\w+;/);
      }
    }
  });

  it('never leaves raw angle brackets from user text in the source', () => {
    for (const layout of LAYOUTS) {
      const [d] = gen(fixture('special-chars.md'), { layout });
      const body = (d?.source ?? '').replace(/<\/?b>|<br\/>/g, '');
      expect(body).not.toMatch(/<(?!\/?b>|br\/>)/);
      expect(d?.source).toContain('&quot;');
    }
  });
});

describe('delta labelling', () => {
  const text = fixture('removed-renamed.md');

  it('labels MODIFIED with text and styling (options-box)', () => {
    const src = gen(text, { layout: Layout.OptionsBox })[0]?.source ?? '';
    expect(src).toContain('subgraph R["MODIFIED: Login"]');
    expect(src).toContain('style R fill:#ffe0b2');
  });

  it('labels MODIFIED with text and class (other layouts)', () => {
    const src = gen(text)[0]?.source ?? '';
    expect(src).toContain('R["MODIFIED: Login"]:::modified');
    expect(src).toContain('classDef modified');
  });

  it('labels REMOVED and shows the reason', () => {
    const src = gen(text)[1]?.source ?? '';
    expect(src).toContain('R["REMOVED: Legacy export"]:::removed');
    expect(src).toContain('Replaced by new export system');
  });

  it('produces a rename diagram', () => {
    const rename = gen(text)[2];
    expect(rename?.id).toBe('rename-1');
    expect(rename?.source).toContain('O["Old name"]:::renamed -->|"RENAMED"| N["New name"]:::renamed');
  });

  it('adds no styling to plain requirements', () => {
    const src = gen('### Requirement: Plain\n#### Scenario: s\n- **WHEN** a\n- **THEN** b')[0]?.source ?? '';
    expect(src).not.toContain('style R');
    expect(src).not.toContain('classDef');
  });
});

describe('snapshots over demo specs', () => {
  it.each(['specs/simple/login', 'specs/complex/checkout', 'changes/improve-checkout/specs/complex/checkout'])('%s', (id) => {
    const text = readFileSync(join(__dirname, 'fixtures', 'demo', 'openspec', id, 'spec.md'), 'utf8');
    expect(gen(text).map((d) => d.source).join('\n\n')).toMatchSnapshot();
  });
});
