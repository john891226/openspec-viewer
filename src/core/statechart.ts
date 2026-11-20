/**
 * The statechart renderer: a Mermaid state diagram read like a state machine (xstate style).
 *
 *   GIVEN            → the state the system starts in
 *   WHEN             → the event on the arrow
 *   AND (before THEN) → a guard on the arrow, `[a && b]`
 *   THEN             → the state it ends in
 *   AND (after THEN)  → actions, listed inside the ending state
 *
 * States with identical text are shared, so scenarios that mention the same state connect.
 */
import { bold, escapeLabel, escapeTransitionLabel, LINE_BREAK, requirementLabel } from './labels';
import { DeltaKind, StepKeyword, StepPhase } from './model';
import type { Requirement, Scenario, Step } from './model';
import { classDefinition, classNameOf } from './palette';
import { ROOT_ID } from './renderer';
import type { RequirementRenderer } from './renderer';

const START_MARKER = '[*]';
const NO_OUTCOME_LABEL = '(no outcome)';
const GUARD_SEPARATOR = ' && ';

// ── States ────────────────────────────────────────────────────────────────────────────────────

interface State {
  id: string;
  label: string;
  /** Lines shown under the label (the actions of the scenarios that end here). */
  actions: string[];
}

/** Hands out one state per distinct key, so equal text means the same state. */
class StateRegistry {
  private readonly byKey = new Map<string, State>();
  private readonly byId = new Map<string, State>();

  constructor(private readonly idPrefix: string) {}

  /** The id of the state for `key`; the state is created the first time it is asked for. */
  idFor(key: string, label: string): string {
    let state = this.byKey.get(key);
    if (!state) {
      state = { id: `${this.idPrefix}${this.byKey.size + 1}`, label, actions: [] };
      this.byKey.set(key, state);
      this.byId.set(state.id, state);
    }
    return state.id;
  }

  addAction(id: string, action: string): void {
    const state = this.byId.get(id);
    if (state && !state.actions.includes(action)) state.actions.push(action);
  }

  ids(): string[] {
    return [...this.byKey.values()].map((state) => state.id);
  }

  declarations(): string[] {
    return [...this.byKey.values()].map(
      (state) => `  state "${[state.label, ...state.actions].join(LINE_BREAK)}" as ${state.id}`,
    );
  }
}

// ── Reading a scenario as a transition ────────────────────────────────────────────────────────

interface ScenarioBreakdown {
  given: Step[];
  when?: Step;
  guards: Step[];
  then?: Step;
  actions: Step[];
}

/** Sorts the steps of a scenario into the roles they play in a state machine. */
function breakDown(scenario: Scenario): ScenarioBreakdown {
  const parts: ScenarioBreakdown = { given: [], guards: [], actions: [] };
  for (const step of scenario.steps) {
    if (step.phase === StepPhase.Outcome) {
      if (!parts.then && step.keyword === StepKeyword.Then) parts.then = step;
      else parts.actions.push(step);
    } else if (step.keyword === StepKeyword.When && !parts.when) {
      parts.when = step;
    } else if (!parts.when) {
      parts.given.push(step); // a GIVEN and any AND that continues it
    } else {
      parts.guards.push(step);
    }
  }
  return parts;
}

/** The text on an arrow: scenario name in bold, then the event, then the guards. */
function transitionLabel(scenario: Scenario, parts: ScenarioBreakdown): string {
  const lines = [bold(escapeTransitionLabel(scenario.name))];
  if (parts.when) lines.push(escapeTransitionLabel(parts.when.text));
  if (parts.guards.length > 0) {
    lines.push(`[${parts.guards.map((guard) => escapeTransitionLabel(guard.text)).join(GUARD_SEPARATOR)}]`);
  }
  return lines.join(LINE_BREAK);
}

/** A scenario without a THEN still needs somewhere to go; each one gets its own, never shared. */
const noOutcomeKey = (scenarioIndex: number): string => `\u0000no-outcome-${scenarioIndex}`;

// ── The diagram of one requirement ────────────────────────────────────────────────────────────

class StatechartDiagram {
  private readonly startStates = new StateRegistry('G'); // where scenarios begin (their GIVEN)
  private readonly endStates = new StateRegistry('T'); // where scenarios end (their THEN)
  private readonly transitions: string[] = [];

  constructor(private readonly requirement: Requirement) {
    requirement.scenarios.forEach((scenario, index) => this.addScenario(scenario, index));
  }

  toSource(): string {
    const { delta } = this.requirement;
    const lines = [
      'stateDiagram-v2',
      '  direction LR',
      `  state "${requirementLabel(this.requirement)}" as ${ROOT_ID}`,
      `  ${START_MARKER} --> ${ROOT_ID}`,
      ...this.removedRequirementNotes(),
      ...this.startStates.declarations(),
      ...this.endStates.declarations(),
      ...this.givenEntries(),
      ...this.transitions,
    ];
    if (delta) lines.push(`  ${classDefinition(delta)}`, `  class ${ROOT_ID} ${classNameOf(delta)}`);
    return lines.join('\n');
  }

  private addScenario(scenario: Scenario, index: number): void {
    const parts = breakDown(scenario);
    const from = this.startStateOf(parts);
    const to = this.endStateOf(parts, index);
    this.transitions.push(`  ${from} --> ${to} : ${transitionLabel(scenario, parts)}`);
  }

  /** The requirement's own state, or the GIVEN state when the scenario has one. */
  private startStateOf(parts: ScenarioBreakdown): string {
    if (parts.given.length === 0) return ROOT_ID;
    const key = parts.given.map((step) => step.text).join('\n');
    const label = parts.given.map((step) => escapeLabel(step.text)).join(LINE_BREAK);
    return this.startStates.idFor(key, label);
  }

  /** The THEN state, which also lists the scenario's actions (the ANDs after the THEN). */
  private endStateOf(parts: ScenarioBreakdown, scenarioIndex: number): string {
    if (!parts.then) return this.endStates.idFor(noOutcomeKey(scenarioIndex), NO_OUTCOME_LABEL);

    const id = this.endStates.idFor(parts.then.text, escapeLabel(parts.then.text));
    parts.actions.forEach((action) => this.endStates.addAction(id, escapeLabel(action.text)));
    return id;
  }

  /**
   * A GIVEN state is a situation the requirement can be in, so it hangs off the requirement's state.
   * Without this arrow it would float, disconnected from the rest of the diagram.
   */
  private givenEntries(): string[] {
    return this.startStates.ids().map((id) => `  ${ROOT_ID} --> ${id} : GIVEN`);
  }

  private removedRequirementNotes(): string[] {
    const { delta, reason, migration } = this.requirement;
    if (delta !== DeltaKind.Removed) return [];

    const lines: string[] = [];
    if (reason) lines.push(`  state "${escapeLabel(reason)}" as X1`, `  ${ROOT_ID} --> X1 : Reason`);
    if (migration) lines.push(`  state "${escapeLabel(migration)}" as X2`, `  ${ROOT_ID} --> X2 : Migration`);
    return lines;
  }
}

export class StatechartRenderer implements RequirementRenderer {
  render(requirement: Requirement): string {
    return new StatechartDiagram(requirement).toSource();
  }
}
