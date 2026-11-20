/**
 * Domain model of an OpenSpec `spec.md`: what the parser produces and the renderers consume.
 *
 *   SpecModel
 *   ├── purpose?
 *   ├── requirements[]  ── Requirement ── scenarios[] ── Scenario ── steps[] ── Step
 *   └── renames[]
 */

/** The delta sections of a change spec, e.g. `## ADDED Requirements`. */
export enum DeltaKind {
  Added = 'ADDED',
  Modified = 'MODIFIED',
  Removed = 'REMOVED',
  Renamed = 'RENAMED',
}

/** The keyword that opens a scenario line, e.g. `- **WHEN** the user logs in`. */
export enum StepKeyword {
  Given = 'GIVEN',
  When = 'WHEN',
  Then = 'THEN',
  And = 'AND',
}

/** Which half of a scenario a step belongs to. An `AND` joins the half of the step before it. */
export enum StepPhase {
  Condition = 'condition',
  Outcome = 'outcome',
}

export interface Step {
  keyword: StepKeyword;
  /** The text exactly as written after the keyword. */
  text: string;
  phase: StepPhase;
}

export interface Scenario {
  name: string;
  steps: Step[];
}

export interface Requirement {
  name: string;
  /** The normative text between the requirement header and its first scenario. */
  description: string;
  /** The delta section this requirement was written under, if any. */
  delta?: DeltaKind;
  scenarios: Scenario[];
  /** The `**Reason**` of a removed requirement. */
  reason?: string;
  /** The `**Migration**` of a removed requirement. */
  migration?: string;
}

/** One `FROM: … / TO: …` pair of a `## RENAMED Requirements` section. */
export interface Rename {
  from: string;
  to: string;
}

export interface SpecModel {
  purpose?: string;
  requirements: Requirement[];
  renames: Rename[];
}

export const conditionsOf = (scenario: Scenario): Step[] => scenario.steps.filter((step) => step.phase === StepPhase.Condition);

export const outcomesOf = (scenario: Scenario): Step[] => scenario.steps.filter((step) => step.phase === StepPhase.Outcome);
