/** Identifiers shared with `package.json` (`contributes`). Change them there and here together. */

export enum Command {
  ViewAsDiagram = 'openspecViewer.viewAsDiagram',
}

/** VS Code context keys, used in `when` clauses of menus. */
export enum ContextKey {
  EditorShowsSpec = 'openspecViewer.isSpec',
}

/** The settings section, and the settings inside it: `openspecViewer.diagram.renderer`, … */
export const SETTINGS_SECTION = 'openspecViewer.diagram';

export enum Setting {
  Renderer = 'renderer',
  Layout = 'layout',
  AndStyle = 'andStyle',
}

export const PANEL_VIEW_TYPE = 'openspecViewer.diagram';
