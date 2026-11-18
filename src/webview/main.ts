import mermaid from 'mermaid';
import type { RenderMessage } from '../extension/messages';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const vscode = acquireVsCodeApi();
const root = document.getElementById('root') as HTMLElement;
const titleEl = document.getElementById('title') as HTMLElement;
let renderId = 0;

function message(text: string, cls = ''): HTMLElement {
  const p = document.createElement('p');
  p.className = `message ${cls}`.trim();
  p.textContent = text;
  return p;
}

async function render(msg: RenderMessage): Promise<void> {
  const current = ++renderId;
  titleEl.textContent = msg.title;
  mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: msg.theme });

  const fragment = document.createDocumentFragment();
  if (msg.diagrams.length === 0) {
    const empty = message(
      'No requirements found. Expected "### Requirement: <name>" blocks, each with "#### Scenario: <name>" blocks using "- **WHEN** …" and "- **THEN** …" lines.',
    );
    fragment.append(empty);
  }

  for (const [i, diagram] of msg.diagrams.entries()) {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = diagram.title;
    section.append(heading);
    try {
      const { svg } = await mermaid.render(`d${current}-${i}`, diagram.source);
      const holder = document.createElement('div');
      holder.innerHTML = svg;
      section.append(holder);
    } catch (error) {
      section.append(message(`Could not render this diagram: ${error instanceof Error ? error.message : String(error)}`, 'error'));
    }
    fragment.append(section);
  }

  // Ignore results of a render that a newer message has superseded.
  if (current === renderId) root.replaceChildren(fragment);
}

window.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
  if (event.data?.type === 'render') void render(event.data);
});
vscode.postMessage({ type: 'ready' });
