/**
 * Runs inside the panel's webview: receives diagrams from the extension and draws them with the
 * bundled Mermaid. Nothing is loaded from the network.
 */
import mermaid from 'mermaid';
import { MessageType } from '../extension/messages';
import type { ReadyMessage, RenderMessage } from '../extension/messages';

declare function acquireVsCodeApi(): { postMessage(message: unknown): void };

const NO_REQUIREMENTS_MESSAGE =
  'No requirements found. Expected "### Requirement: <name>" blocks, each with "#### Scenario: <name>" blocks using "- **WHEN** …" and "- **THEN** …" lines.';

enum NoticeKind {
  Info = '',
  Error = 'error',
}

function notice(text: string, kind = NoticeKind.Info): HTMLElement {
  const element = document.createElement('p');
  element.className = `message ${kind}`.trim();
  element.textContent = text;
  return element;
}

/** The page: a title and one section per diagram. */
class DiagramPage {
  private drawCount = 0;

  constructor(
    private readonly titleElement: HTMLElement,
    private readonly rootElement: HTMLElement,
  ) {}

  async show(message: RenderMessage): Promise<void> {
    const thisDraw = ++this.drawCount;
    this.titleElement.textContent = message.title;
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: message.theme });

    const content = document.createDocumentFragment();
    if (message.diagrams.length === 0) content.append(notice(NO_REQUIREMENTS_MESSAGE));

    for (const [index, diagram] of message.diagrams.entries()) {
      content.append(await this.drawSection(diagram.title, diagram.source, `d${thisDraw}-${index}`));
    }

    // A newer message may have arrived while we were drawing; only the latest one is shown.
    if (thisDraw === this.drawCount) this.rootElement.replaceChildren(content);
  }

  /** One diagram, or an error in its place so the others still show. */
  private async drawSection(title: string, source: string, elementId: string): Promise<HTMLElement> {
    const section = document.createElement('section');
    const heading = document.createElement('h2');
    heading.textContent = title;
    section.append(heading);

    try {
      const { svg } = await mermaid.render(elementId, source);
      const figure = document.createElement('div');
      figure.innerHTML = svg;
      section.append(figure);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      section.append(notice(`Could not render this diagram: ${reason}`, NoticeKind.Error));
    }
    return section;
  }
}

const vscodeApi = acquireVsCodeApi();
const page = new DiagramPage(document.getElementById('title') as HTMLElement, document.getElementById('root') as HTMLElement);

window.addEventListener('message', (event: MessageEvent<RenderMessage>) => {
  if (event.data?.type === MessageType.Render) void page.show(event.data);
});

const ready: ReadyMessage = { type: MessageType.Ready };
vscodeApi.postMessage(ready);
