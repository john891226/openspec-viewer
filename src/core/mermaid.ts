/**
 * Turns a parsed spec into Mermaid diagrams. This is the entry point other code uses; the work is
 * done by a {@link RequirementRenderer} chosen from the options. Output is derived on demand and
 * never stored.
 */
import { FlowchartRenderer } from './flowchart';
import { escapeLabel } from './labels';
import { DeltaKind } from './model';
import type { Requirement, SpecModel } from './model';
import { Renderer, resolveOptions } from './options';
import type { DiagramOptions, ResolvedOptions } from './options';
import { allClassDefinitions, classNameOf } from './palette';
import type { RequirementRenderer } from './renderer';
import { StatechartRenderer } from './statechart';

export { escapeLabel } from './labels';
export * from './options';

export interface DiagramDef {
  id: string;
  title: string;
  delta?: DeltaKind;
  /** Mermaid source: a `stateDiagram-v2` or a `flowchart`. */
  source: string;
}

/** Picks the renderer the options ask for. */
function createRenderer(options: ResolvedOptions): RequirementRenderer {
  return options.renderer === Renderer.Statechart
    ? new StatechartRenderer()
    : new FlowchartRenderer(options.layout, options.andStyle);
}

function requirementDiagram(requirement: Requirement, index: number, renderer: RequirementRenderer): DiagramDef {
  return {
    id: `requirement-${index + 1}`,
    title: requirement.name,
    ...(requirement.delta ? { delta: requirement.delta } : {}),
    source: renderer.render(requirement),
  };
}

/** A rename is drawn as `old --RENAMED--> new`, the same way in every renderer. */
function renameDiagram(from: string, to: string, index: number): DiagramDef {
  const renamed = classNameOf(DeltaKind.Renamed);
  return {
    id: `rename-${index + 1}`,
    title: `${from} → ${to}`,
    delta: DeltaKind.Renamed,
    source: [
      'flowchart LR',
      `  O["${escapeLabel(from)}"]:::${renamed} -->|"RENAMED"| N["${escapeLabel(to)}"]:::${renamed}`,
      ...allClassDefinitions(),
    ].join('\n'),
  };
}

/** One diagram per requirement, followed by one per rename. Deterministic. */
export function toMermaid(model: SpecModel, options: DiagramOptions = {}): DiagramDef[] {
  const renderer = createRenderer(resolveOptions(options));
  return [
    ...model.requirements.map((requirement, index) => requirementDiagram(requirement, index, renderer)),
    ...model.renames.map((rename, index) => renameDiagram(rename.from, rename.to, index)),
  ];
}
