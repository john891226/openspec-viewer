/** The ways a diagram can be drawn, and how user settings are turned into valid choices. */

/** Which kind of diagram is drawn. */
export enum Renderer {
  /** A state machine, like xstate: GIVEN is the state, WHEN the event, THEN the next state. */
  Statechart = 'statechart',
  /** A flowchart per requirement; see {@link Layout} and {@link AndStyle}. */
  Flowchart = 'flowchart',
}

/** Flowchart only: how a requirement and its scenarios are arranged. */
export enum Layout {
  /** The requirement leads to one diamond; every scenario is a branch of it. */
  DecisionDiamond = 'decision-diamond',
  /** The requirement is one box listing its scenarios as numbered options. */
  OptionsBox = 'options-box',
  /** The requirement leads straight to each scenario, with no decision node. */
  ScenarioFlow = 'scenario-flow',
}

/** Flowchart only: how the AND lines of a scenario are shown. */
export enum AndStyle {
  /** Each AND is its own condition node, in sequence. */
  Chained = 'chained',
  /** All lines of a half go into one node. */
  List = 'list',
}

export interface DiagramOptions {
  renderer?: Renderer;
  layout?: Layout;
  andStyle?: AndStyle;
}

export type ResolvedOptions = Required<DiagramOptions>;

export const DEFAULT_OPTIONS: ResolvedOptions = {
  renderer: Renderer.Statechart,
  layout: Layout.DecisionDiamond,
  andStyle: AndStyle.Chained,
};

export const RENDERERS: readonly Renderer[] = Object.values(Renderer);
export const LAYOUTS: readonly Layout[] = Object.values(Layout);
export const AND_STYLES: readonly AndStyle[] = Object.values(AndStyle);

/** Picks `candidate` if it is one of the enum's values, otherwise `fallback`. */
function valueOrDefault<E extends string>(allowed: readonly E[], candidate: unknown, fallback: E): E {
  return allowed.find((value) => value === candidate) ?? fallback;
}

/** Turns raw values (for example from VS Code settings) into valid options, using defaults for unknown ones. */
export function resolveOptions(raw: { renderer?: string; layout?: string; andStyle?: string } = {}): ResolvedOptions {
  return {
    renderer: valueOrDefault(RENDERERS, raw.renderer, DEFAULT_OPTIONS.renderer),
    layout: valueOrDefault(LAYOUTS, raw.layout, DEFAULT_OPTIONS.layout),
    andStyle: valueOrDefault(AND_STYLES, raw.andStyle, DEFAULT_OPTIONS.andStyle),
  };
}
