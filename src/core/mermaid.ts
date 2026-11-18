/**
 * Pure generator turning a parsed spec into Mermaid flowchart definitions.
 * Output is derived on demand and never stored.
 */
import type { DeltaKind, Requirement, Scenario, SpecModel, Step } from './parser';

export interface DiagramDef {
  id: string;
  title: string;
  delta?: DeltaKind;
  /** Mermaid flowchart source. */
  source: string;
}

const CLASS_DEFS = [
  'classDef added fill:#c8e6c9,stroke:#2e7d32,color:#111',
  'classDef modified fill:#ffe0b2,stroke:#ef6c00,color:#111',
  'classDef removed fill:#ffcdd2,stroke:#c62828,color:#111',
  'classDef renamed fill:#bbdefb,stroke:#1565c0,color:#111',
];

const ESCAPES: Record<string, string> = {
  '#': '#35;',
  '"': '#quot;',
  '<': '#lt;',
  '>': '#gt;',
  '&': '#amp;',
  '|': '#124;',
  '[': '#91;',
  ']': '#93;',
  '{': '#123;',
  '}': '#125;',
  '`': '#96;',
  ';': '#59;',
};

/** Escapes text so it is safe inside a quoted Mermaid label. */
export function escapeLabel(text: string): string {
  return text.replace(/[#"<>&|[\]{}`;]/g, (c) => ESCAPES[c] ?? c).replace(/\s*\r?\n\s*/g, '<br/>');
}

/** Each step is escaped on its own so the `<br/>` separator stays real markup. */
const joinSteps = (steps: Step[]) => steps.map((s) => escapeLabel(s.text)).join('<br/>');

function scenarioLines(scenario: Scenario, n: number): string[] {
  const conditions = scenario.steps.filter((s) => s.phase === 'condition');
  const outcomes = scenario.steps.filter((s) => s.phase === 'outcome');
  const edge = `R -->|"${escapeLabel(scenario.name)}"|`;
  const condition = `S${n}C["<b>WHEN</b> ${joinSteps(conditions)}"]`;
  const outcome = (from: string) => `${from} S${n}O["<b>THEN</b> ${joinSteps(outcomes)}"]`;

  if (conditions.length) {
    const lines = [`  ${edge} ${condition}`];
    if (outcomes.length) lines.push(`  ${outcome(`S${n}C -->`)}`);
    return lines;
  }
  if (outcomes.length) return [`  ${outcome(edge)}`];
  return [`  ${edge} S${n}E["(no steps)"]`];
}

function requirementDiagram(req: Requirement, index: number): DiagramDef {
  const cls = req.delta?.toLowerCase();
  const rootText = req.delta ? `${req.delta}: ${req.name}` : req.name;
  const lines = ['flowchart LR', `  R["${escapeLabel(rootText)}"]${cls ? `:::${cls}` : ''}`];

  if (req.delta === 'REMOVED') {
    if (req.reason) lines.push(`  R -->|"Reason"| X1["${escapeLabel(req.reason)}"]`);
    if (req.migration) lines.push(`  R -->|"Migration"| X2["${escapeLabel(req.migration)}"]`);
  }
  req.scenarios.forEach((scenario, i) => lines.push(...scenarioLines(scenario, i + 1)));
  if (cls) lines.push(...CLASS_DEFS);

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

/** One flowchart per requirement, followed by one per rename. Deterministic. */
export function toMermaid(model: SpecModel): DiagramDef[] {
  return [
    ...model.requirements.map(requirementDiagram),
    ...model.renames.map((r, i) => renameDiagram(r.from, r.to, i)),
  ];
}
