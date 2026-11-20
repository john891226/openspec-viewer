import type { Requirement } from './model';

/**
 * Turns one requirement into Mermaid source. Every diagram style is one implementation of this
 * interface (the Strategy pattern), so adding a style never touches the others.
 */
export interface RequirementRenderer {
  render(requirement: Requirement): string;
}

/** The id of the node or state that stands for the requirement itself, in every diagram. */
export const ROOT_ID = 'R';
