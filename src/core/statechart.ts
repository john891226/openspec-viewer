/**
 * Statechart renderer: a Mermaid state diagram read like a state machine.
 * GIVEN is the source state, WHEN the event, AND (before THEN) a guard, THEN the
 * target state and AND after THEN its actions. Pure; no editor dependency.
 */
import type { Requirement, Scenario, Step } from './parser';

export interface StatechartColors {
  [delta: string]: { fill: string; stroke: string };
}

type Escape = (text: string) => string;

/**
 * Text for a transition label. Transition labels are unquoted, and in a Mermaid state diagram a `;`
 * ends the statement, so HTML entities (which end in `;`) cannot be used here. Characters that
 * would break the label are swapped for look-alikes: U+037E (Greek question mark, looks like `;`)
 * and single angle quotes for `<` and `>`.
 */
const transitionText = (text: string) =>
  text.replace(/;/g, '\u037E').replace(/</g, '\u2039').replace(/>/g, '\u203A').replace(/\s*\r?\n\s*/g, ' ');

class States {
  private readonly ids = new Map<string, string>();
  readonly declarations: string[] = [];
  /** Extra lines (actions) per state id, in insertion order without duplicates. */
  private readonly extras = new Map<string, string[]>();
  private readonly labels = new Map<string, string>();
  private counter = 0;

  constructor(private readonly prefix: string) {}

  /** Returns the id of the state for `key`, creating it on first use. */
  get(key: string, label: string): string {
    let id = this.ids.get(key);
    if (!id) {
      id = `${this.prefix}${++this.counter}`;
      this.ids.set(key, id);
      this.labels.set(id, label);
      this.extras.set(id, []);
    }
    return id;
  }

  /** Ids of all states created so far, in creation order. */
  ids_(): string[] {
    return [...this.labels.keys()];
  }

  addExtra(id: string, line: string): void {
    const lines = this.extras.get(id);
    if (lines && !lines.includes(line)) lines.push(line);
  }

  render(): string[] {
    return [...this.labels].map(([id, label]) => {
      const extra = this.extras.get(id) ?? [];
      return `  state "${[label, ...extra].join('<br/>')}" as ${id}`;
    });
  }
}

interface Parts {
  given: Step[];
  when?: Step;
  guards: Step[];
  then?: Step;
  actions: Step[];
}

function split(scenario: Scenario): Parts {
  const parts: Parts = { given: [], guards: [], actions: [] };
  for (const step of scenario.steps) {
    if (step.phase === 'outcome') {
      if (!parts.then && step.keyword === 'THEN') parts.then = step;
      else parts.actions.push(step);
    } else if (step.keyword === 'WHEN' && !parts.when) {
      parts.when = step;
    } else if (!parts.when) {
      parts.given.push(step); // GIVEN and any AND that continues it
    } else {
      parts.guards.push(step);
    }
  }
  return parts;
}

export function statechart(
  req: Requirement,
  rootLabel: string,
  cls: string | undefined,
  colors: StatechartColors,
  escape: Escape,
): string {
  const lines = ['stateDiagram-v2', '  direction LR', `  state "${rootLabel}" as R`, '  [*] --> R'];

  if (req.delta === 'REMOVED') {
    if (req.reason) lines.push(`  state "${escape(req.reason)}" as X1`, '  R --> X1 : Reason');
    if (req.migration) lines.push(`  state "${escape(req.migration)}" as X2`, '  R --> X2 : Migration');
  }

  const given = new States('G');
  const target = new States('T');
  const transitions: string[] = [];

  req.scenarios.forEach((scenario, i) => {
    const parts = split(scenario);

    const source = parts.given.length
      ? given.get(parts.given.map((s) => s.text).join('\n'), parts.given.map((s) => escape(s.text)).join('<br/>'))
      : 'R';

    const label = [`<b>${transitionText(scenario.name)}</b>`];
    if (parts.when) label.push(transitionText(parts.when.text));
    if (parts.guards.length) label.push(`[${parts.guards.map((g) => transitionText(g.text)).join(' && ')}]`);

    let to: string;
    if (parts.then) {
      to = target.get(parts.then.text, escape(parts.then.text));
      parts.actions.forEach((a) => target.addExtra(to, escape(a.text)));
    } else {
      to = target.get(`\u0000no-outcome-${i}`, '(no outcome)');
    }
    transitions.push(`  ${source} --> ${to} : ${label.join('<br/>')}`);
  });

  // A GIVEN state is a context the requirement can be in, so it hangs off the requirement state;
  // without this edge it would float disconnected from the rest of the diagram.
  const entries = given.ids_().map((id) => `  R --> ${id} : GIVEN`);

  lines.push(...given.render(), ...target.render(), ...entries, ...transitions);

  if (cls && colors[cls]) {
    const c = colors[cls];
    lines.push(`  classDef ${cls} fill:${c.fill},stroke:${c.stroke},color:#111`, `  class R ${cls}`);
  }
  return lines.join('\n');
}
