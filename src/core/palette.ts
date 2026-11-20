/** Colours that tell the delta kinds apart. Dark text on light fills, so they read in both themes. */
import { DeltaKind } from './model';

interface DeltaStyle {
  /** The Mermaid class name, e.g. `modified`. */
  className: string;
  fill: string;
  stroke: string;
}

const DELTA_STYLES: Record<DeltaKind, DeltaStyle> = {
  [DeltaKind.Added]: { className: 'added', fill: '#c8e6c9', stroke: '#2e7d32' },
  [DeltaKind.Modified]: { className: 'modified', fill: '#ffe0b2', stroke: '#ef6c00' },
  [DeltaKind.Removed]: { className: 'removed', fill: '#ffcdd2', stroke: '#c62828' },
  [DeltaKind.Renamed]: { className: 'renamed', fill: '#bbdefb', stroke: '#1565c0' },
};

const TEXT_COLOR = '#111';

const colorsOf = ({ fill, stroke }: DeltaStyle) => `fill:${fill},stroke:${stroke},color:${TEXT_COLOR}`;

/** The Mermaid class name for a delta kind, to attach with `:::name`. */
export const classNameOf = (delta: DeltaKind): string => DELTA_STYLES[delta].className;

/** `classDef …` line for one delta kind. */
export const classDefinition = (delta: DeltaKind): string => `classDef ${classNameOf(delta)} ${colorsOf(DELTA_STYLES[delta])}`;

/** `classDef …` lines for every delta kind. */
export const allClassDefinitions = (): string[] => Object.values(DeltaKind).map(classDefinition);

/** The colours as a `style` statement body, for elements that cannot take a class (subgraphs). */
export const inlineStyleOf = (delta: DeltaKind): string => colorsOf(DELTA_STYLES[delta]);
