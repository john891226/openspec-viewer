import * as vscode from 'vscode';
import { resolveOptions } from '../core';
import type { ResolvedOptions } from '../core';
import { Setting, SETTINGS_SECTION } from './constants';

/** The diagram settings that apply to a file, with defaults for missing or invalid values. */
export function readDiagramOptions(resource: vscode.Uri): ResolvedOptions {
  const settings = vscode.workspace.getConfiguration(SETTINGS_SECTION, resource);
  return resolveOptions({
    renderer: settings.get<string>(Setting.Renderer),
    layout: settings.get<string>(Setting.Layout),
    andStyle: settings.get<string>(Setting.AndStyle),
  });
}
