/**
 * The flowchart renderer. A requirement is drawn from its root node, and a {@link FlowchartLayout}
 * decides how the scenarios hang off it. The AND style decides how each scenario's lines are shown.
 */
import { bold, escapeLabel, LINE_BREAK, requirementLabel } from './labels';
import { conditionsOf, DeltaKind, outcomesOf, StepKeyword } from './model';
import type { Requirement, Scenario, Step } from './model';
import { AndStyle, Layout } from './options';
import { allClassDefinitions, classNameOf, inlineStyleOf } from './palette';
import { ROOT_ID } from './renderer';
import type { RequirementRenderer } from './renderer';

const DECISION_ID = 'D';
const DECISION_LABEL = 'Scenarios';
const NO_STEPS_LABEL = '(no steps)';

// ── Building blocks ───────────────────────────────────────────────────────────────────────────

enum NodeShape {
  Box,
  /** Marks an extra condition (an AND) that must hold. */
  Hexagon,
}

class FlowNode {
  constructor(
    readonly id: string,
    readonly label: string,
    private readonly shape = NodeShape.Box,
  ) {}

  /** The Mermaid declaration, e.g. `A["text"]` or `A{{"text"}}`. */
  declaration(): string {
    return this.shape === NodeShape.Hexagon ? `${this.id}{{"${this.label}"}}` : `${this.id}["${this.label}"]`;
  }
}

/** The node standing for the requirement itself, tagged with its delta colour when it has one. */
class RequirementRoot {
  readonly title: string;
  private readonly colorClass?: string;

  constructor(readonly requirement: Requirement) {
    this.title = requirementLabel(requirement);
    this.colorClass = requirement.delta && classNameOf(requirement.delta);
  }

  declaration(): string {
    return `  ${ROOT_ID}["${this.title}"]${this.colorClass ? `:::${this.colorClass}` : ''}`;
  }

  get usesColorClass(): boolean {
    return this.colorClass !== undefined;
  }
}

/** What a layout produces: the Mermaid lines, and whether they need the `classDef` colour lines. */
interface Drawing {
  lines: string[];
  usesColorClass: boolean;
}

const stepText = (step: Step): string => `${bold(step.keyword)} ${escapeLabel(step.text)}`;

/** `from --> first --> second …`, with an optional label on the first arrow only. */
function chain(from: string, firstEdgeLabel: string | undefined, nodes: FlowNode[]): string[] {
  let previousId = from;
  return nodes.map((node, index) => {
    const edgeLabel = index === 0 && firstEdgeLabel !== undefined ? `|"${escapeLabel(firstEdgeLabel)}"|` : '';
    const line = `  ${previousId} -->${edgeLabel} ${node.declaration()}`;
    previousId = node.id;
    return line;
  });
}

// ── Cutting a scenario into nodes ─────────────────────────────────────────────────────────────

/** A scenario as the nodes that follow its entry point, plus the lines merged into the entry itself. */
interface ScenarioNodes {
  entryLines: string[];
  followers: FlowNode[];
}

/** The entry is the first condition, plus a WHEN that directly follows a GIVEN: both set the scene. */
function isEntryCondition(conditions: Step[], index: number): boolean {
  const followsGiven = conditions[0]?.keyword === StepKeyword.Given && conditions[index]?.keyword === StepKeyword.When;
  return index === 0 || (index === 1 && followsGiven);
}

/**
 * @param number    the scenario's position (1-based), used to build unique node ids
 * @param mergeEntry true when the entry condition is written inside the scenario's own node
 */
function scenarioNodes(scenario: Scenario, number: number, andStyle: AndStyle, mergeEntry: boolean): ScenarioNodes {
  const conditions = conditionsOf(scenario);
  const outcomes = outcomesOf(scenario);
  const entryLines: string[] = [];
  const followers: FlowNode[] = [];

  if (andStyle === AndStyle.List) {
    if (conditions.length > 0) {
      const label = conditions.map(stepText).join(LINE_BREAK);
      if (mergeEntry) entryLines.push(label);
      else followers.push(new FlowNode(`S${number}C`, label));
    }
    if (outcomes.length > 0) followers.push(new FlowNode(`S${number}O`, outcomes.map(stepText).join(LINE_BREAK)));
  } else {
    conditions.forEach((step, index) => {
      if (mergeEntry && isEntryCondition(conditions, index)) entryLines.push(stepText(step));
      else followers.push(new FlowNode(`S${number}C${index}`, stepText(step), index > 0 ? NodeShape.Hexagon : NodeShape.Box));
    });
    outcomes.forEach((step, index) => followers.push(new FlowNode(`S${number}O${index}`, stepText(step))));
  }
  return { entryLines, followers };
}

/** The text of a node that carries the scenario's title followed by its entry lines. */
function titledNodeLabel(title: string, parts: ScenarioNodes): string {
  const isEmpty = parts.entryLines.length === 0 && parts.followers.length === 0;
  return [title, ...parts.entryLines, ...(isEmpty ? [NO_STEPS_LABEL] : [])].join(LINE_BREAK);
}

/** Scenario drawn as separate nodes: `from -->|name| WHEN --> THEN …`. */
function separateNodesLines(scenario: Scenario, number: number, from: string, andStyle: AndStyle): string[] {
  const { followers } = scenarioNodes(scenario, number, andStyle, false);
  const nodes = followers.length > 0 ? followers : [new FlowNode(`S${number}E`, NO_STEPS_LABEL)];
  return chain(from, scenario.name, nodes);
}

/** Scenario drawn as one titled node (name plus entry lines) followed by the rest. */
function titledNodeLines(scenario: Scenario, number: number, from: string, andStyle: AndStyle): string[] {
  const parts = scenarioNodes(scenario, number, andStyle, true);
  const id = `O${number}`;
  const label = titledNodeLabel(bold(escapeLabel(scenario.name)), parts);
  return [`  ${from} --> ${id}["${label}"]`, ...chain(id, undefined, parts.followers)];
}

// ── Layouts (Strategy pattern) ────────────────────────────────────────────────────────────────

/** Decides how the scenarios of a requirement hang off its root node. */
interface FlowchartLayout {
  draw(root: RequirementRoot, andStyle: AndStyle): Drawing;
}

/** root → one diamond → one node per scenario (only when there is more than one way out). */
class DecisionDiamondLayout implements FlowchartLayout {
  draw(root: RequirementRoot, andStyle: AndStyle): Drawing {
    const { scenarios } = root.requirement;
    const lines = [root.declaration()];
    let from = ROOT_ID;
    if (scenarios.length > 1) {
      lines.push(`  ${ROOT_ID} --> ${DECISION_ID}{"${DECISION_LABEL}"}`);
      from = DECISION_ID;
    }
    scenarios.forEach((scenario, index) => lines.push(...titledNodeLines(scenario, index + 1, from, andStyle)));
    return { lines, usesColorClass: root.usesColorClass };
  }
}

/** The requirement is a box listing its scenarios as numbered options, each leading to its outcome. */
class OptionsBoxLayout implements FlowchartLayout {
  draw(root: RequirementRoot, andStyle: AndStyle): Drawing {
    const { scenarios, delta } = root.requirement;
    const optionLines: string[] = [];
    const outcomeLines: string[] = [];

    scenarios.forEach((scenario, index) => {
      const number = index + 1;
      const parts = scenarioNodes(scenario, number, andStyle, true);
      const title = `${bold(`${number}.`)} ${escapeLabel(scenario.name)}`;
      optionLines.push(`    O${number}["${titledNodeLabel(title, parts)}"]`);
      outcomeLines.push(...chain(`O${number}`, undefined, parts.followers));
    });

    const lines = [`  subgraph ${ROOT_ID}["${root.title}"]`, ...optionLines, '  end', ...outcomeLines];
    // A subgraph cannot take a class, so its colour is set with a `style` statement.
    if (delta) lines.push(`  style ${ROOT_ID} ${inlineStyleOf(delta)}`);
    return { lines, usesColorClass: false };
  }
}

/** root → condition → outcome for each scenario, with the scenario name on the first arrow. */
class ScenarioFlowLayout implements FlowchartLayout {
  draw(root: RequirementRoot, andStyle: AndStyle): Drawing {
    const lines = [root.declaration()];
    root.requirement.scenarios.forEach((scenario, index) =>
      lines.push(...separateNodesLines(scenario, index + 1, ROOT_ID, andStyle)),
    );
    return { lines, usesColorClass: root.usesColorClass };
  }
}

const LAYOUT_BY_NAME: Record<Layout, FlowchartLayout> = {
  [Layout.DecisionDiamond]: new DecisionDiamondLayout(),
  [Layout.OptionsBox]: new OptionsBoxLayout(),
  [Layout.ScenarioFlow]: new ScenarioFlowLayout(),
};

/** A requirement with no scenarios is just its root, plus the reason and migration when removed. */
function drawLoneRequirement(root: RequirementRoot): Drawing {
  const { delta, reason, migration } = root.requirement;
  const lines = [root.declaration()];
  if (delta === DeltaKind.Removed) {
    if (reason) lines.push(`  ${ROOT_ID} -->|"Reason"| X1["${escapeLabel(reason)}"]`);
    if (migration) lines.push(`  ${ROOT_ID} -->|"Migration"| X2["${escapeLabel(migration)}"]`);
  }
  return { lines, usesColorClass: root.usesColorClass };
}

// ── The renderer ──────────────────────────────────────────────────────────────────────────────

export class FlowchartRenderer implements RequirementRenderer {
  private readonly layout: FlowchartLayout;

  constructor(
    layout: Layout,
    private readonly andStyle: AndStyle,
  ) {
    this.layout = LAYOUT_BY_NAME[layout];
  }

  render(requirement: Requirement): string {
    const root = new RequirementRoot(requirement);
    const drawing = requirement.scenarios.length === 0 ? drawLoneRequirement(root) : this.layout.draw(root, this.andStyle);

    const lines = ['flowchart LR', ...drawing.lines];
    if (drawing.usesColorClass) lines.push(...allClassDefinitions());
    return lines.join('\n');
  }
}
