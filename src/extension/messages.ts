import type { DiagramDef } from '../core';

export type ThemeName = 'dark' | 'default';

/** Host → webview. */
export type RenderMessage = {
  type: 'render';
  title: string;
  theme: ThemeName;
  diagrams: DiagramDef[];
};
