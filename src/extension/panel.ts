import * as vscode from 'vscode';
import { capabilityName, parseSpec, resolveOptions, toMermaid } from '../core';
import type { RenderMessage, ThemeName } from './messages';

const DEBOUNCE_MS = 200;

const themeName = (): ThemeName =>
  vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark ||
  vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrast
    ? 'dark'
    : 'default';

function nonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

class DiagramPanel {
  private ready = false;
  private closed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly uri: vscode.Uri,
    extensionUri: vscode.Uri,
    private readonly onDispose: () => void,
  ) {
    const name = capabilityName(uri.path) ?? uri.path.split('/').pop() ?? 'spec';
    this.panel = vscode.window.createWebviewPanel(
      'openspecViewer.diagram',
      `Diagram: ${name}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'dist')],
      },
    );
    this.panel.webview.html = this.html(extensionUri);

    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((m: { type?: string }) => {
        if (m?.type === 'ready') {
          this.ready = true;
          void this.update();
        }
      }),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === this.uri.toString()) this.schedule();
      }),
      vscode.workspace.onDidSaveTextDocument((d) => {
        if (d.uri.toString() === this.uri.toString()) void this.update();
      }),
      vscode.workspace.onDidCloseTextDocument((d) => {
        if (d.uri.toString() === this.uri.toString()) this.closed = true;
      }),
      vscode.workspace.onDidOpenTextDocument((d) => {
        if (d.uri.toString() === this.uri.toString()) {
          this.closed = false;
          this.schedule();
        }
      }),
      vscode.window.onDidChangeActiveColorTheme(() => void this.update()),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('openspecViewer.diagram')) void this.update();
      }),
      this.panel.onDidDispose(() => this.dispose()),
    );
  }

  reveal(): void {
    this.panel.reveal(vscode.ViewColumn.Beside, true);
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.update(), DEBOUNCE_MS);
  }

  private async update(): Promise<void> {
    if (!this.ready || this.closed) return;
    try {
      const doc = await vscode.workspace.openTextDocument(this.uri);
      const config = vscode.workspace.getConfiguration('openspecViewer.diagram', this.uri);
      const options = resolveOptions({ renderer: config.get<string>('renderer'), layout: config.get<string>('layout'), andStyle: config.get<string>('andStyle') });
      const diagrams = toMermaid(parseSpec(doc.getText()), options);
      const message: RenderMessage = {
        type: 'render',
        title: capabilityName(this.uri.path) ?? 'spec',
        theme: themeName(),
        diagrams,
      };
      await this.panel.webview.postMessage(message);
    } catch {
      // The document may have been deleted or the panel disposed meanwhile.
    }
  }

  private html(extensionUri: vscode.Uri): string {
    const webview = this.panel.webview;
    const script = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist', 'webview.js'));
    const n = nonce();
    const csp = [
      "default-src 'none'",
      `script-src 'nonce-${n}'`,
      "style-src 'unsafe-inline'",
      `img-src ${webview.cspSource} data:`,
      `font-src ${webview.cspSource}`,
    ].join('; ');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenSpec diagram</title>
<style>
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 16px 32px; }
  h1 { font-size: 1.2em; font-weight: 600; }
  section { margin: 24px 0; padding-bottom: 16px; border-bottom: 1px solid var(--vscode-panel-border); overflow-x: auto; }
  section h2 { font-size: 1em; margin: 0 0 8px; }
  .message { padding: 12px 16px; border-left: 3px solid var(--vscode-editorInfo-foreground); background: var(--vscode-textBlockQuote-background); }
  .error { color: var(--vscode-errorForeground); border-left-color: var(--vscode-errorForeground); white-space: pre-wrap; }
  code { font-family: var(--vscode-editor-font-family); }
</style>
</head>
<body>
<h1 id="title"></h1>
<div id="root"><p class="message">Loading…</p></div>
<script nonce="${n}" src="${script}"></script>
</body>
</html>`;
  }

  private dispose(): void {
    if (this.timer) clearTimeout(this.timer);
    this.disposables.forEach((d) => d.dispose());
    this.onDispose();
  }
}

/** One panel per spec file; re-activating reveals the existing one. */
export class PanelManager implements vscode.Disposable {
  private readonly panels = new Map<string, DiagramPanel>();

  constructor(private readonly extensionUri: vscode.Uri) {}

  show(uri: vscode.Uri): void {
    const key = uri.toString();
    const existing = this.panels.get(key);
    if (existing) {
      existing.reveal();
      return;
    }
    this.panels.set(key, new DiagramPanel(uri, this.extensionUri, () => this.panels.delete(key)));
  }

  dispose(): void {
    this.panels.clear();
  }
}
