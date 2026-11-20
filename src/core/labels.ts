/** Making arbitrary spec text safe to put inside a Mermaid label. */
import type { Requirement } from './model';

/** The HTML line break Mermaid understands inside labels. */
export const LINE_BREAK = '<br/>';

export const bold = (html: string): string => `<b>${html}</b>`;

// Named HTML entities, decoded by the browser when the label is rendered. They do not depend on
// Mermaid's own `#code;` pre-processing, which only decodes correctly when the page declares UTF-8
// (the extension's webview does, but a page without `<meta charset>` shows `fl°quot¶ß` instead).
const HTML_ENTITIES: Record<string, string> = {
  '#': '&num;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;',
  '|': '&vert;',
  '[': '&lbrack;',
  ']': '&rbrack;',
  '{': '&lbrace;',
  '}': '&rbrace;',
  '`': '&grave;',
  ';': '&semi;',
};

const NEEDS_ESCAPING = /[#"<>&|[\]{}`;]/g;
const ANY_NEWLINE = /\s*\r?\n\s*/g;

/** Escapes text for a quoted Mermaid label. Newlines become line breaks. */
export function escapeLabel(text: string): string {
  return text.replace(NEEDS_ESCAPING, (char) => HTML_ENTITIES[char] ?? char).replace(ANY_NEWLINE, LINE_BREAK);
}

/**
 * Text for a state-diagram transition label. These labels are unquoted and a `;` ends the statement
 * there, so HTML entities (which end in `;`) cannot be used. Characters that would break the label
 * are swapped for look-alikes: U+037E (Greek question mark, looks like `;`) and single angle quotes.
 */
export function escapeTransitionLabel(text: string): string {
  return text.replace(/;/g, ';').replace(/</g, '‹').replace(/>/g, '›').replace(ANY_NEWLINE, ' ');
}

/** The root label of a requirement's diagram: its name, prefixed with the delta kind when it has one. */
export function requirementLabel(requirement: Requirement): string {
  return escapeLabel(requirement.delta ? `${requirement.delta}: ${requirement.name}` : requirement.name);
}
