/**
 * Reads the text of an OpenSpec `spec.md` into a {@link SpecModel}.
 * Pure and tolerant: it never throws, and text without requirements gives an empty model.
 */
import { DeltaKind, StepKeyword, StepPhase } from './model';
import type { Requirement, Scenario, SpecModel } from './model';

// Lines the parser recognises. Anything else is ignored, so no writing convention is required.
const DELTA_HEADER = /^##\s+(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements\s*$/i;
const PURPOSE_HEADER = /^##\s+Purpose\s*$/i;
const ANY_SECTION_HEADER = /^##\s+\S/;
const REQUIREMENT_HEADER = /^###\s+Requirement:\s*(.*?)\s*$/;
const SCENARIO_HEADER = /^####\s+Scenario:\s*(.*?)\s*$/;
const STEP_LINE = /^\s*[-*+]\s+(?:\*\*)?(WHEN|GIVEN|THEN|AND)(?:\*\*)?:?\s+(\S.*?)\s*$/;
const CODE_FENCE = /^\s*(```|~~~)/;
const REASON_LINE = /^\*\*Reason\*\*:?\s*(.*)$/;
const MIGRATION_LINE = /^\*\*Migration\*\*:?\s*(.*)$/;
const RENAME_FROM_LINE = /^\s*[-*+]?\s*FROM:\s*`?(?:###\s*Requirement:\s*)?([^`]*?)`?\s*$/;
const RENAME_TO_LINE = /^\s*[-*+]?\s*TO:\s*`?(?:###\s*Requirement:\s*)?([^`]*?)`?\s*$/;

/** The `## …` section the parser is currently inside. */
enum SectionKind {
  Other,
  Purpose,
  Delta,
}

/**
 * A line-by-line state machine. It remembers where it is (section, requirement, scenario) and
 * every line goes through the `read…` methods in order until one of them claims it.
 * Use it once per text: `new SpecParser().parse(text)`.
 */
export class SpecParser {
  private readonly requirements: Requirement[] = [];
  private readonly renames: { from: string; to: string }[] = [];
  private readonly purposeLines: string[] = [];

  private section = SectionKind.Other;
  private sectionDelta?: DeltaKind;
  private requirement?: Requirement;
  private scenario?: Scenario;
  private requirementTextLines: string[] = [];
  private pendingRenameFrom?: string;
  private insideCodeFence = false;

  parse(text: string): SpecModel {
    if (typeof text === 'string') {
      for (const line of text.split(/\r?\n/)) this.readLine(line);
      this.finishRequirement();
    }
    return this.toModel();
  }

  private readLine(line: string): void {
    if (CODE_FENCE.test(line)) {
      this.insideCodeFence = !this.insideCodeFence;
      return;
    }
    if (this.insideCodeFence) return; // example markup inside fences is not part of the spec

    const claimed =
      this.readSectionHeader(line) ||
      this.readRequirementHeader(line) ||
      this.readScenarioHeader(line) ||
      this.readScenarioLine(line) ||
      this.readRequirementText(line);
    if (!claimed) this.readSectionText(line);
  }

  // ── Headers ────────────────────────────────────────────────────────────────────────────────

  private readSectionHeader(line: string): boolean {
    const delta = DELTA_HEADER.exec(line);
    if (delta) {
      this.enterSection(SectionKind.Delta, (delta[1] as string).toUpperCase() as DeltaKind);
    } else if (PURPOSE_HEADER.test(line)) {
      this.enterSection(SectionKind.Purpose);
    } else if (ANY_SECTION_HEADER.test(line)) {
      this.enterSection(SectionKind.Other);
    } else {
      return false;
    }
    return true;
  }

  private readRequirementHeader(line: string): boolean {
    const header = REQUIREMENT_HEADER.exec(line);
    if (!header) return false;

    this.finishRequirement();
    this.requirement = {
      name: header[1] ?? '',
      description: '',
      scenarios: [],
      ...(this.sectionDelta ? { delta: this.sectionDelta } : {}),
    };
    this.requirements.push(this.requirement);
    return true;
  }

  private readScenarioHeader(line: string): boolean {
    const header = SCENARIO_HEADER.exec(line);
    if (!header || !this.requirement) return false;

    this.closeRequirementText();
    this.scenario = { name: header[1] ?? '', steps: [] };
    this.requirement.scenarios.push(this.scenario);
    return true;
  }

  // ── Body lines ─────────────────────────────────────────────────────────────────────────────

  /** Inside a scenario every line is consumed; only the WHEN/GIVEN/THEN/AND bullets become steps. */
  private readScenarioLine(line: string): boolean {
    if (!this.scenario) return false;

    const bullet = STEP_LINE.exec(line);
    if (bullet) {
      const keyword = bullet[1] as StepKeyword;
      const previous = this.scenario.steps[this.scenario.steps.length - 1];
      this.scenario.steps.push({ keyword, text: bullet[2] ?? '', phase: phaseOf(keyword, previous?.phase) });
    }
    return true;
  }

  /** The text between a requirement header and its first scenario (or a removed requirement's notes). */
  private readRequirementText(line: string): boolean {
    if (!this.requirement) return false;

    this.requirementTextLines.push(line);
    const text = line.trim();
    const reason = REASON_LINE.exec(text);
    if (reason) this.requirement.reason = reason[1] ?? '';
    const migration = MIGRATION_LINE.exec(text);
    if (migration) this.requirement.migration = migration[1] ?? '';
    return true;
  }

  /** Lines outside any requirement: the purpose paragraph and the `FROM:`/`TO:` pairs of renames. */
  private readSectionText(line: string): void {
    if (this.section === SectionKind.Purpose) {
      this.purposeLines.push(line);
    } else if (this.section === SectionKind.Delta && this.sectionDelta === DeltaKind.Renamed) {
      this.readRenameLine(line);
    }
  }

  private readRenameLine(line: string): void {
    const from = RENAME_FROM_LINE.exec(line);
    const to = RENAME_TO_LINE.exec(line);
    if (from) {
      this.pendingRenameFrom = (from[1] ?? '').trim();
    } else if (to && this.pendingRenameFrom !== undefined) {
      this.renames.push({ from: this.pendingRenameFrom, to: (to[1] ?? '').trim() });
      this.pendingRenameFrom = undefined;
    }
  }

  // ── Bookkeeping ────────────────────────────────────────────────────────────────────────────

  private enterSection(section: SectionKind, delta?: DeltaKind): void {
    this.finishRequirement();
    this.section = section;
    this.sectionDelta = delta;
  }

  /** The requirement's description is whatever came before its first scenario. */
  private closeRequirementText(): void {
    if (this.requirement && !this.scenario) {
      this.requirement.description = this.requirementTextLines.join('\n').trim();
    }
  }

  private finishRequirement(): void {
    this.closeRequirementText();
    this.requirement = undefined;
    this.scenario = undefined;
    this.requirementTextLines = [];
  }

  private toModel(): SpecModel {
    const purpose = this.purposeLines.join('\n').trim();
    return {
      requirements: this.requirements,
      renames: this.renames,
      ...(purpose ? { purpose } : {}),
    };
  }
}

/** WHEN and GIVEN set the scene, THEN is the outcome, AND continues whatever came before it. */
function phaseOf(keyword: StepKeyword, previous: StepPhase | undefined): StepPhase {
  if (keyword === StepKeyword.Then) return StepPhase.Outcome;
  if (keyword === StepKeyword.And) return previous ?? StepPhase.Condition;
  return StepPhase.Condition;
}

/** Parses spec text. Never throws; unparseable input yields no requirements. */
export function parseSpec(text: string): SpecModel {
  return new SpecParser().parse(text);
}
