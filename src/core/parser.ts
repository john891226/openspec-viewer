/**
 * Pure parser for OpenSpec `spec.md` files. It has no editor dependency so it
 * can be reused by a CLI or an AI command.
 */

export type DeltaKind = 'ADDED' | 'MODIFIED' | 'REMOVED' | 'RENAMED';
export type StepKeyword = 'WHEN' | 'GIVEN' | 'THEN' | 'AND';
/** `condition` for WHEN/GIVEN (and ANDs continuing them), `outcome` for THEN (and its ANDs). */
export type StepPhase = 'condition' | 'outcome';

export interface Step {
  keyword: StepKeyword;
  /** Text exactly as written after the keyword. */
  text: string;
  phase: StepPhase;
}

export interface Scenario {
  name: string;
  steps: Step[];
}

export interface Requirement {
  name: string;
  /** Normative text between the requirement header and its first scenario. */
  description: string;
  /** Delta section the requirement sits in, if any. */
  delta?: DeltaKind;
  scenarios: Scenario[];
  /** `**Reason**` of a REMOVED requirement, when present. */
  reason?: string;
  /** `**Migration**` of a REMOVED requirement, when present. */
  migration?: string;
}

export interface Rename {
  from: string;
  to: string;
}

export interface SpecModel {
  purpose?: string;
  requirements: Requirement[];
  renames: Rename[];
}

const DELTA_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
const PURPOSE_HEADER = /^##\s+Purpose\s*$/i;
const SECTION_HEADER = /^##\s+\S/;
const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.*?)\s*$/;
const SCENARIO_HEADER = /^####\s+Scenario:\s*(.*?)\s*$/;
const STEP_LINE = /^\s*[-*+]\s+(?:\*\*)?(WHEN|GIVEN|THEN|AND)(?:\*\*)?:?\s+(\S.*?)\s*$/;
const FENCE = /^\s*(```|~~~)/;
const REASON = /^\*\*Reason\*\*:?\s*(.*)$/;
const MIGRATION = /^\*\*Migration\*\*:?\s*(.*)$/;
const RENAME_FROM = /^\s*[-*+]?\s*FROM:\s*`?(?:###\s*Requirement:\s*)?([^`]*?)`?\s*$/;
const RENAME_TO = /^\s*[-*+]?\s*TO:\s*`?(?:###\s*Requirement:\s*)?([^`]*?)`?\s*$/;

type Section = { kind: 'none' } | { kind: 'purpose' } | { kind: 'delta'; delta: DeltaKind };

/** Parses spec text. Never throws; unparseable input yields no requirements. */
export function parseSpec(text: string): SpecModel {
  const model: SpecModel = { requirements: [], renames: [] };
  if (typeof text !== 'string') return model;

  const purposeLines: string[] = [];
  let section: Section = { kind: 'none' };
  let requirement: Requirement | undefined;
  let scenario: Scenario | undefined;
  let descriptionLines: string[] = [];
  let pendingFrom: string | undefined;
  let inFence = false;

  const closeDescription = () => {
    if (requirement && !scenario) requirement.description = descriptionLines.join('\n').trim();
  };
  const finishRequirement = () => {
    closeDescription();
    requirement = undefined;
    scenario = undefined;
    descriptionLines = [];
  };

  for (const line of text.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const delta = DELTA_HEADER.exec(line);
    if (delta) {
      finishRequirement();
      section = { kind: 'delta', delta: (delta[1] as string).toUpperCase() as DeltaKind };
      continue;
    }
    if (PURPOSE_HEADER.test(line)) {
      finishRequirement();
      section = { kind: 'purpose' };
      continue;
    }
    if (SECTION_HEADER.test(line)) {
      finishRequirement();
      section = { kind: 'none' };
      continue;
    }

    const req = REQUIREMENT_HEADER.exec(line);
    if (req) {
      finishRequirement();
      requirement = {
        name: req[1] ?? '',
        description: '',
        scenarios: [],
        ...(section.kind === 'delta' ? { delta: section.delta } : {}),
      };
      model.requirements.push(requirement);
      continue;
    }

    const scen = SCENARIO_HEADER.exec(line);
    if (scen && requirement) {
      closeDescription();
      scenario = { name: scen[1] ?? '', steps: [] };
      requirement.scenarios.push(scenario);
      continue;
    }

    if (scenario) {
      const step = STEP_LINE.exec(line);
      if (step) {
        const keyword = step[1] as StepKeyword;
        const previous = scenario.steps[scenario.steps.length - 1];
        const phase: StepPhase =
          keyword === 'THEN' ? 'outcome' : keyword === 'AND' ? (previous?.phase ?? 'condition') : 'condition';
        scenario.steps.push({ keyword, text: step[2] ?? '', phase });
      }
      continue;
    }

    if (requirement) {
      descriptionLines.push(line);
      const trimmed = line.trim();
      const reason = REASON.exec(trimmed);
      if (reason) requirement.reason = reason[1] ?? '';
      const migration = MIGRATION.exec(trimmed);
      if (migration) requirement.migration = migration[1] ?? '';
      continue;
    }

    if (section.kind === 'purpose') {
      purposeLines.push(line);
    } else if (section.kind === 'delta' && section.delta === 'RENAMED') {
      const from = RENAME_FROM.exec(line);
      const to = RENAME_TO.exec(line);
      if (from) {
        pendingFrom = (from[1] ?? '').trim();
      } else if (to && pendingFrom !== undefined) {
        model.renames.push({ from: pendingFrom, to: (to[1] ?? '').trim() });
        pendingFrom = undefined;
      }
    }
  }
  finishRequirement();

  const purpose = purposeLines.join('\n').trim();
  if (purpose) model.purpose = purpose;
  return model;
}
