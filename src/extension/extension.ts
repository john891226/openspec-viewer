import * as vscode from 'vscode';
import { isSpecPath } from '../core';
import { PanelManager } from './panel';

const COMMAND = 'openspecViewer.viewAsDiagram';

class DiagramLensProvider implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!isSpecPath(document.uri.path)) return [];
    const range = new vscode.Range(0, 0, 0, 0);
    return [new vscode.CodeLens(range, { title: '$(graph) View as diagram', command: COMMAND, arguments: [document.uri] })];
  }
}

function updateContext(editor: vscode.TextEditor | undefined): void {
  const isSpec = !!editor && isSpecPath(editor.document.uri.path);
  void vscode.commands.executeCommand('setContext', 'openspecViewer.isSpec', isSpec);
}

export function activate(context: vscode.ExtensionContext): void {
  const panels = new PanelManager(context.extensionUri);

  context.subscriptions.push(
    panels,
    vscode.commands.registerCommand(COMMAND, (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (target && isSpecPath(target.path)) panels.show(target);
    }),
    vscode.languages.registerCodeLensProvider({ language: 'markdown', pattern: '**/spec.md' }, new DiagramLensProvider()),
    vscode.window.onDidChangeActiveTextEditor(updateContext),
  );
  updateContext(vscode.window.activeTextEditor);
}

export function deactivate(): void {}
