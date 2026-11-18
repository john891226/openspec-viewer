/**
 * Pure generator turning a parsed spec into Mermaid flowchart definitions.
 * Output is derived on demand and never stored.
 */
import type { DeltaKind, Requirement, Scenario, SpecModel, Step } from './parser';
import { statechart } from './statechart';

export type Layout = 'options-box' | 'decision-diamond' | 'scenario-flow';
export type AndStyle = 'chained' | 'list';
export type Renderer = 'flowchart' | 'statechart';

export interface DiagramOptions {
  renderer?: Renderer;
  layout?: Layout;
  andStyle?: AndStyle;
}

export const DEFAULT_RENDERER: Renderer = 'flowchart';
export const RENDERERS: readonly Renderer[] = ['flowchart', 'statechart'];
export const DEFAULT_LAYOUT: Layout = 'decision-diamond';
export const DEFAULT_AND_STYLE: AndStyle = 'chained';
export const LAYOUTS: readonly Layout[] = ['decision-diamond', 'options-box', 'scenario-flow'];
export const AND_STYLES: readonly AndStyle[] = ['chained', 'list'];

export interface DiagramDef {
  id: string;
  title: string;
  delta?: DeltaKind;
  /** Mermaid flowchart source. */
  source: string;
}

const COLORS: Record<string, { fill: string; stroke: string }> = {
  added: { fill: '#c8e6c9', stroke: '#2e7d32' },
  modified: { fill: '#ffe0b2', stroke: '#ef6c00' },
  removed: { fill: '#ffcdd2', stroke: '#c62828' },
  renamed: { fill: '#bbdefb', stroke: '#1565c0' },
};

const CLASS_DEFS = Object.entries(COLORS).map(
  ([name, c]) => `classDef ${name} fill:${c.fill},stroke:${c.stroke},color:#111`,
);

// Named HTML entities, decoded by the browser when the label is rendered. They do not depend on
// Mermaid's own `#code;` pre-processing, which only decodes correctly when the page declares UTF-8
// (the extension's webview does, but a page without `<meta charset>` shows `fl°quot¶ß` instead).
const ESCAPES: Record<string, string> = {
  '#': '&num;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '|': '&vert;',
  '[': '&lbrack;',
  ']': '&rbrack;',
  '{': '&lbrace;',
  '}': '&rbrace;',
  '`': '&grave;',
  ';': '&semi;',
};

/** Escapes text so it is safe inside a quoted Mermaid label. */
export function escapeLabel(text: string): string {
  return text.replace(/[#"<>&|[\]{}`;]/g, (c) => ESCAPES[c] ?? c).replace(/\s*\r?\n\s*/g, '<br/>');
}

interface Node {
  id: string;
  label: string;
  /** Hexagon: an extra (AND) condition that must hold. */
  condition?: boolean;
}

const line = (step: Step) => `<b>${step.keyword}</b> ${escapeLabel(step.text)}`;
const declare = (node: Node) => (node.condition ? `${node.id}{{"${node.label}"}}` : `${node.id}["${node.label}"]`);

interface ScenarioParts {
  /** Extra lines merged into the option node (options-box layout only). */
  merged: string[];
  /** Nodes that follow the entry point, in order. */
  nodes: Node[];
}

/** Splits a scenario into nodes according to the AND style. */
function scenarioParts(scenario: Scenario, n: number, andStyle: AndStyle, mergeEntry: boolean): ScenarioParts {
  const conditions = scenario.steps.filter((s) => s.phase === 'condition');
  const outcomes = scenario.steps.filter((s) => s.phase === 'outcome');
  const merged: string[] = [];
  const nodes: Node[] = [];

  if (andStyle === 'list') {
    if (conditions.length) {
      const label = conditions.map(line).join('<br/>');
      if (mergeEntry) merged.push(label);
      else nodes.push({ id: `S${n}C`, label });
    }
  } else {
    conditions.forEach((step, k) => {
      // The entry is the first condition, plus a WHEN that directly follows a GIVEN: both set the scene.
      const entry = k === 0 || (k === 1 && conditions[0]?.keyword === 'GIVEN' && step.keyword === 'WHEN');
      if (mergeEntry && entry) merged.push(line(step));
      else nodes.push({ id: `S${n}C${k}`, label: line(step), condition: k > 0 });
    });
  }

  if (outcomes.length) {
    if (andStyle === 'list') nodes.push({ id: `S${n}O`, label: outcomes.map(line).join('<br/>') });
    else outcomes.forEach((step, k) => nodes.push({ id: `S${n}O${k}`, label: line(step) }));
  }
  return { merged, nodes };
}

/** Links `from` to the nodes in order. `edgeLabel` labels only the first edge. */
function link(from: string, edgeLabel: string | undefined, nodes: Node[]): string[] {
  const out: string[] = [];
  let previous: Node | undefined;
  for (const node of nodes) {
    const label = !previous && edgeLabel !== undefined ? `|"${escapeLabel(edgeLabel)}"|` : '';
    out.push(`  ${previous ? previous.id : from} -->${label} ${declare(node)}`);
    previous = node;
  }
  return out;
}

function scenarioLines(
  scenario: Scenario,
  n: number,
  from: string,
  edgeLabel: string | undefined,
  andStyle: AndStyle,
): string[] {
  const { nodes } = scenarioParts(scenario, n, andStyle, false);
  if (nodes.length) return link(from, edgeLabel, nodes);
  return link(from, edgeLabel, [{ id: `S${n}E`, label: '(no steps)' }]);
}

/** One node (bold scenario name, then the entry condition) followed by the rest of the scenario. */
function branchLines(scenario: Scenario, n: number, from: string, andStyle: AndStyle): string[] {
  const { merged, nodes } = scenarioParts(scenario, n, andStyle, true);
  const hasSteps = merged.length > 0 || nodes.length > 0;
  const label = [`<b>${escapeLabel(scenario.name)}</b>`, ...merged, ...(hasSteps ? [] : ['(no steps)'])].join('<br/>');
  return [`  ${from} --> O${n}["${label}"]`, ...link(`O${n}`, undefined, nodes)];
}

function optionsBox(req: Requirement, rootLabel: string, andStyle: AndStyle): string[] {
  const lines = [`  subgraph R["${rootLabel}"]`];
  const after: string[] = [];
  req.scenarios.forEach((scenario, i) => {
    const n = i + 1;
    const { merged, nodes } = scenarioParts(scenario, n, andStyle, true);
    const hasSteps = merged.length > 0 || nodes.length > 0;
    const label = [`<b>${n}.</b> ${escapeLabel(scenario.name)}`, ...merged, ...(hasSteps ? [] : ['(no steps)'])].join('<br/>');
    lines.push(`    O${n}["${label}"]`);
    after.push(...link(`O${n}`, undefined, nodes));
  });
  lines.push('  end');
  return [...lines, ...after];
}

function requirementDiagram(req: Requirement, index: number, options: Required<DiagramOptions>): DiagramDef {
  const { layout, andStyle } = options;
  const cls = req.delta?.toLowerCase();
  const rootLabel = escapeLabel(req.delta ? `${req.delta}: ${req.name}` : req.name);
  if (options.renderer === 'statechart') {
    return {
      id: `requirement-${index + 1}`,
      title: req.name,
      ...(req.delta ? { delta: req.delta } : {}),
      source: statechart(req, rootLabel, cls, COLORS, escapeLabel),
    };
  }
  const lines = ['flowchart LR'];
  let usesClass = false;

  if (req.scenarios.length === 0) {
    usesClass = !!cls;
    lines.push(`  R["${rootLabel}"]${cls ? `:::${cls}` : ''}`);
    if (req.delta === 'REMOVED') {
      if (req.reason) lines.push(`  R -->|"Reason"| X1["${escapeLabel(req.reason)}"]`);
      if (req.migration) lines.push(`  R -->|"Migration"| X2["${escapeLabel(req.migration)}"]`);
    }
  } else if (layout === 'options-box') {
    lines.push(...optionsBox(req, rootLabel, andStyle));
    const c = cls ? COLORS[cls] : undefined;
    if (c) lines.push(`  style R fill:${c.fill},stroke:${c.stroke},color:#111`);
  } else {
    usesClass = !!cls;
    lines.push(`  R["${rootLabel}"]${cls ? `:::${cls}` : ''}`);
    let from = 'R';
    // A decision only exists where there is more than one way out.
    if (layout === 'decision-diamond' && req.scenarios.length > 1) {
      lines.push('  R --> D{"Scenarios"}');
      from = 'D';
    }
    if (layout === 'decision-diamond') {
      // Scenario name (title) and WHEN (description) share one node.
      req.scenarios.forEach((scenario, i) => lines.push(...branchLines(scenario, i + 1, from, andStyle)));
    } else {
      req.scenarios.forEach((scenario, i) => lines.push(...scenarioLines(scenario, i + 1, from, scenario.name, andStyle)));
    }
  }
  if (usesClass) lines.push(...CLASS_DEFS);

  return {
    id: `requirement-${index + 1}`,
    title: req.name,
    ...(req.delta ? { delta: req.delta } : {}),
    source: lines.join('\n'),
  };
}

function renameDiagram(from: string, to: string, index: number): DiagramDef {
  return {
    id: `rename-${index + 1}`,
    title: `${from} → ${to}`,
    delta: 'RENAMED',
    source: [
      'flowchart LR',
      `  O["${escapeLabel(from)}"]:::renamed -->|"RENAMED"| N["${escapeLabel(to)}"]:::renamed`,
      ...CLASS_DEFS,
    ].join('\n'),
  };
}

/** Normalises possibly-invalid option values (for example from user settings) to supported ones. */
export function resolveOptions(
  options: { renderer?: string; layout?: string; andStyle?: string } = {},
): Required<DiagramOptions> {
  return {
    renderer: RENDERERS.find((r) => r === options.renderer) ?? DEFAULT_RENDERER,
    layout: LAYOUTS.find((l) => l === options.layout) ?? DEFAULT_LAYOUT,
    andStyle: AND_STYLES.find((s) => s === options.andStyle) ?? DEFAULT_AND_STYLE,
  };
}

/** One flowchart per requirement, followed by one per rename. Deterministic. */
export function toMermaid(model: SpecModel, options: DiagramOptions = {}): DiagramDef[] {
  const resolved = resolveOptions(options);
  return [
    ...model.requirements.map((r, i) => requirementDiagram(r, i, resolved)),
    ...model.renames.map((r, i) => renameDiagram(r.from, r.to, i)),
  ];
}
