# Architecture

A short map of the code, for someone reading it for the first time.

## The idea

The scenarios in a `spec.md` are the single source of truth. The diagram is **derived from them
every time** and never stored. So the code is a pipeline:

```
spec.md text ──► parse ──► SpecModel ──► render ──► Mermaid source ──► webview draws it
              (core)                    (core)                          (extension + webview)
```

## `src/core`: pure TypeScript, no VS Code

Nothing here imports `vscode` (lint enforces it), so a CLI or an AI command could reuse it.

| File | What it is |
| --- | --- |
| `model.ts` | The data: `SpecModel` → `Requirement` → `Scenario` → `Step`, and the enums `DeltaKind`, `StepKeyword`, `StepPhase`. |
| `parser.ts` | `SpecParser`, a line-by-line state machine. Every line goes through `readSectionHeader`, `readRequirementHeader`, … until one claims it. `parseSpec(text)` is the shortcut. |
| `options.ts` | The enums `Renderer`, `Layout`, `AndStyle`, the defaults, and `resolveOptions` (raw settings → valid options). |
| `mermaid.ts` | The entry point, `toMermaid(model, options)`. Picks a renderer and produces one `DiagramDef` per requirement. |
| `renderer.ts` | The `RequirementRenderer` interface. |
| `statechart.ts` | `StatechartRenderer`: a state machine (GIVEN → state, WHEN → event, AND → guard, THEN → next state). The default. |
| `flowchart.ts` | `FlowchartRenderer` plus three `FlowchartLayout` classes (`DecisionDiamondLayout`, `OptionsBoxLayout`, `ScenarioFlowLayout`). |
| `labels.ts` | Making spec text safe inside Mermaid labels. |
| `palette.ts` | The colours of the delta kinds (added, modified, removed, renamed). |
| `specPath.ts` | Which file paths count as specs. |

### Patterns used

- **Strategy**: a `RequirementRenderer` turns a requirement into Mermaid; `FlowchartLayout` decides how a flowchart is arranged. Adding a style means adding a class, not another `if`.
- **State machine**: `SpecParser` remembers the section, requirement and scenario it is in.
- **Registry**: `StateRegistry` (statechart) gives one state per distinct text, so equal text means the same state.
- **Enums over strings**: every fixed choice has a name (`Layout.OptionsBox`, not `'options-box'`).

## `src/extension`: the VS Code side

| File | What it is |
| --- | --- |
| `extension.ts` | `activate`: registers the command, the CodeLens (`ViewAsDiagramLens`) and the context key. |
| `panel.ts` | `DiagramPanel` (one side panel for one spec; redraws on edits, saves, theme and settings changes) and `DiagramPanels` (one panel per file). |
| `webviewHtml.ts` | The panel's HTML page and its Content Security Policy, as a pure function. |
| `messages.ts` | The messages between the extension and the webview. |
| `settings.ts`, `constants.ts`, `debounce.ts` | Reading settings, shared identifiers, and a small `Debouncer`. |

## `src/webview`

`main.ts` runs inside the panel. `DiagramPage` receives the diagrams, draws each one with the bundled
Mermaid (no network), and shows an error in place of any diagram that fails, so the others still show.

## Tests

`test/` has unit tests for the core, the pure parts of the extension, and demo specs under
`test/fixtures/demo` you can open with F5. `npm run render-check` goes further: it draws every
fixture in headless Chrome with the real webview bundle, because a diagram that *parses* is not
always one that *renders* well.
