import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Debouncer } from '../src/extension/debounce';
import { buildWebviewHtml, createNonce } from '../src/extension/webviewHtml';

describe('Debouncer', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('runs the action once, after the quiet period', () => {
    const action = vi.fn();
    const debouncer = new Debouncer(200);
    debouncer.schedule(action);
    debouncer.schedule(action);
    debouncer.schedule(action);

    vi.advanceTimersByTime(199);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('restarts the wait on every request', () => {
    const action = vi.fn();
    const debouncer = new Debouncer(200);
    debouncer.schedule(action);
    vi.advanceTimersByTime(150);
    debouncer.schedule(action);
    vi.advanceTimersByTime(150);
    expect(action).not.toHaveBeenCalled();
    vi.advanceTimersByTime(50);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    const action = vi.fn();
    const debouncer = new Debouncer(200);
    debouncer.schedule(action);
    debouncer.cancel();
    vi.advanceTimersByTime(1000);
    expect(action).not.toHaveBeenCalled();
  });
});

describe('webview page', () => {
  const html = buildWebviewHtml({ scriptUri: 'vscode-resource://x/webview.js', cspSource: 'vscode-resource:', nonce: 'abc123' });

  it('only lets the one nonced script run', () => {
    expect(html).toContain("script-src 'nonce-abc123'");
    expect(html).toContain('<script nonce="abc123" src="vscode-resource://x/webview.js"></script>');
    expect(html.match(/<script/g)).toHaveLength(1);
  });

  it('blocks everything by default and loads nothing remote', () => {
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it('declares UTF-8, which Mermaid needs to decode its text correctly', () => {
    expect(html).toContain('<meta charset="UTF-8">');
  });

  it('has the elements the webview script looks for', () => {
    expect(html).toContain('id="title"');
    expect(html).toContain('id="root"');
  });

  it('creates different nonces made of safe characters', () => {
    const a = createNonce();
    expect(a).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(createNonce()).not.toBe(a);
  });
});
