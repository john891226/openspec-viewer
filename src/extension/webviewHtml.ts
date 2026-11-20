/**
 * The HTML page the diagram panel shows. A pure function of its inputs, so it is easy to test
 * (the page must stay locked down: no remote resources, scripts only with the nonce).
 */

export interface WebviewHtmlParams {
  /** The URI of the bundled webview script. */
  scriptUri: string;
  /** What VS Code allows the webview to load from (`webview.cspSource`). */
  cspSource: string;
  nonce: string;
}

const NONCE_LENGTH = 32;
const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** A fresh random token that lets exactly one script run under the page's Content Security Policy. */
export function createNonce(): string {
  return Array.from({ length: NONCE_LENGTH }, () => NONCE_ALPHABET[Math.floor(Math.random() * NONCE_ALPHABET.length)]).join('');
}

function contentSecurityPolicy({ cspSource, nonce }: WebviewHtmlParams): string {
  return [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src 'unsafe-inline'", // Mermaid writes its own <style> into the diagrams
    `img-src ${cspSource} data:`,
    `font-src ${cspSource}`,
  ].join('; ');
}

const STYLES = `
  body { font-family: var(--vscode-font-family); color: var(--vscode-foreground); padding: 0 16px 32px; }
  h1 { font-size: 1.2em; font-weight: 600; }
  section { margin: 24px 0; padding-bottom: 16px; border-bottom: 1px solid var(--vscode-panel-border); overflow-x: auto; }
  section h2 { font-size: 1em; margin: 0 0 8px; }
  .message { padding: 12px 16px; border-left: 3px solid var(--vscode-editorInfo-foreground); background: var(--vscode-textBlockQuote-background); }
  .error { color: var(--vscode-errorForeground); border-left-color: var(--vscode-errorForeground); white-space: pre-wrap; }
  code { font-family: var(--vscode-editor-font-family); }`;

export function buildWebviewHtml(params: WebviewHtmlParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(params)}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OpenSpec diagram</title>
<style>${STYLES}
</style>
</head>
<body>
<h1 id="title"></h1>
<div id="root"><p class="message">Loading…</p></div>
<script nonce="${params.nonce}" src="${params.scriptUri}"></script>
</body>
</html>`;
}
