import * as vscode from 'vscode';
import { isSpecPath } from '../core';
import { Command, ContextKey } from './constants';
import { DiagramPanels } from './panel';

/** The "View as diagram" link shown on the first line of every spec file. */
class ViewAsDiagramLens implements vscode.CodeLensProvider {
  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!isSpecPath(document.uri.path)) return [];

    const firstLine = new vscode.Range(0, 0, 0, 0);
    return [
      new vscode.CodeLens(firstLine, {
        title: '$(graph) View as diagram',
        command: Command.ViewAsDiagram,
        arguments: [document.uri],
      }),
    ];
  }
}

/** Tells VS Code whether the active editor is a spec, so the title-bar button shows only there. */
function updateSpecContext(editor: vscode.TextEditor | undefined): void {
  const showsSpec = editor !== undefined && isSpecPath(editor.document.uri.path);
  void vscode.commands.executeCommand('setContext', ContextKey.EditorShowsSpec, showsSpec);
}

export function activate(context: vscode.ExtensionContext): void {
  const panels = new DiagramPanels(context.extensionUri);

  const viewAsDiagram = (uri?: vscode.Uri) => {
    const spec = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (spec && isSpecPath(spec.path)) panels.show(spec);
  };

  context.subscriptions.push(
    panels,
    vscode.commands.registerCommand(Command.ViewAsDiagram, viewAsDiagram),
    vscode.languages.registerCodeLensProvider({ language: 'markdown', pattern: '**/spec.md' }, new ViewAsDiagramLens()),
    vscode.window.onDidChangeActiveTextEditor(updateSpecContext),
  );
  updateSpecContext(vscode.window.activeTextEditor);
}

export function deactivate(): void {}
