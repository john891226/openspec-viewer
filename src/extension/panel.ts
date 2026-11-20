import * as vscode from 'vscode';
import { capabilityName, parseSpec, toMermaid } from '../core';
import { PANEL_VIEW_TYPE, SETTINGS_SECTION } from './constants';
import { Debouncer } from './debounce';
import { DiagramTheme, MessageType } from './messages';
import type { ReadyMessage, RenderMessage } from './messages';
import { readDiagramOptions } from './settings';
import { buildWebviewHtml, createNonce } from './webviewHtml';

/** How long to wait after the last keystroke before redrawing. */
const REFRESH_DELAY_MS = 200;

function currentTheme(): DiagramTheme {
  const { kind } = vscode.window.activeColorTheme;
  const isDark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
  return isDark ? DiagramTheme.Dark : DiagramTheme.Light;
}

/**
 * The side panel for one spec file. It listens to everything that should change the diagram
 * (edits, saves, theme, settings) and redraws from the editor's current text, saved or not.
 */
class DiagramPanel {
  private readonly panel: vscode.WebviewPanel;
  private readonly subscriptions: vscode.Disposable[] = [];
  private readonly refreshSoon = new Debouncer(REFRESH_DELAY_MS);
  private readonly specKey: string;
  private readonly capability: string | undefined;
  private webviewIsReady = false;
  private specIsClosed = false;

  constructor(
    private readonly specUri: vscode.Uri,
    extensionUri: vscode.Uri,
    private readonly onDisposed: () => void,
  ) {
    this.specKey = specUri.toString();
    this.capability = capabilityName(specUri.path);
    this.panel = this.createPanel(extensionUri);
    this.panel.webview.html = this.html(extensionUri);
    this.subscribeToChanges();
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  private createPanel(extensionUri: vscode.Uri): vscode.WebviewPanel {
    const name = this.capability ?? this.specUri.path.split('/').pop() ?? 'spec';
    return vscode.window.createWebviewPanel(
      PANEL_VIEW_TYPE,
      `Diagram: ${name}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
      },
    );
  }

  private html(extensionUri: vscode.Uri): string {
    const { webview } = this.panel;
    return buildWebviewHtml({
      scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js')).toString(),
      cspSource: webview.cspSource,
      nonce: createNonce(),
    });
  }

  // ── What makes the diagram change ───────────────────────────────────────────────────────────

  private subscribeToChanges(): void {
    const { workspace, window } = vscode;
    this.subscriptions.push(
      this.panel.webview.onDidReceiveMessage((message: Partial<ReadyMessage>) => this.onWebviewMessage(message)),
      workspace.onDidChangeTextDocument((event) => this.ifThisSpec(event.document, () => this.refreshSoon.schedule(() => void this.refresh()))),
      workspace.onDidSaveTextDocument((document) => this.ifThisSpec(document, () => void this.refresh())),
      workspace.onDidCloseTextDocument((document) => this.ifThisSpec(document, () => (this.specIsClosed = true))),
      workspace.onDidOpenTextDocument((document) =>
        this.ifThisSpec(document, () => {
          this.specIsClosed = false;
          this.refreshSoon.schedule(() => void this.refresh());
        }),
      ),
      window.onDidChangeActiveColorTheme(() => void this.refresh()),
      workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration(SETTINGS_SECTION)) void this.refresh();
      }),
      this.panel.onDidDispose(() => this.dispose()),
    );
  }

  private ifThisSpec(document: vscode.TextDocument, action: () => void): void {
    if (document.uri.toString() === this.specKey) action();
  }

  private onWebviewMessage(message: Partial<ReadyMessage>): void {
    if (message?.type === MessageType.Ready) {
      this.webviewIsReady = true;
      void this.refresh();
    }
  }

  /** Reads the spec as it is in the editor now, and sends the diagrams to the webview. */
  private async refresh(): Promise<void> {
    if (!this.webviewIsReady || this.specIsClosed) return;
    try {
      const document = await vscode.workspace.openTextDocument(this.specUri);
      const message: RenderMessage = {
        type: MessageType.Render,
        title: this.capability ?? 'spec',
        theme: currentTheme(),
        diagrams: toMermaid(parseSpec(document.getText()), readDiagramOptions(this.specUri)),
      };
      await this.panel.webview.postMessage(message);
    } catch {
      // The file may have been deleted, or the panel disposed, while we were reading.
    }
  }

  private dispose(): void {
    this.refreshSoon.cancel();
    this.subscriptions.forEach((subscription) => subscription.dispose());
    this.onDisposed();
  }
}

/** Keeps one panel per spec file: asking again for the same file brings the existing panel forward. */
export class DiagramPanels implements vscode.Disposable {
  private readonly panels = new Map<string, DiagramPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  show(specUri: vscode.Uri): void {
    const key = specUri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal();
    } else {
      this.panels.set(key, new DiagramPanel(specUri, this.extensionUri, () => this.panels.delete(key)));
    }
  }

  dispose(): void {
    this.panels.clear();
  }
}
