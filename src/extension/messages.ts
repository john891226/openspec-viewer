/** The messages the extension and its webview send each other. */
import type { DiagramDef } from '../core';

export enum MessageType {
  /** Webview → extension: the page has loaded and can receive diagrams. */
  Ready = 'ready',
  /** Extension → webview: draw these diagrams. */
  Render = 'render',
}

/** The colour theme to draw with. The values are the names Mermaid knows. */
export enum DiagramTheme {
  Light = 'default',
  Dark = 'dark',
}

export interface ReadyMessage {
  type: MessageType.Ready;
}

export interface RenderMessage {
  type: MessageType.Render;
  title: string;
  theme: DiagramTheme;
  diagrams: DiagramDef[];
}
