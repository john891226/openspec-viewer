# OpenSpec Viewer

[![CI](https://github.com/john891226/openspec-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/john891226/openspec-viewer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Render [OpenSpec](https://github.com/Fission-AI/OpenSpec) `spec.md` files as live diagrams in VS Code.

OpenSpec scenarios (`WHEN` / `THEN`) are precise for machines but hard for humans to follow as a whole. A hand-drawn diagram next to them would drift out of sync. OpenSpec Viewer **derives the diagram from the scenarios every time**, so the spec stays the single source of truth. Nothing is stored or hand-edited.

## Features

- **View as diagram** from a CodeLens at the top of the file and from the editor title bar button.
- One **Mermaid flowchart per requirement**: the requirement is the root, each scenario a branch, `WHEN` the condition, `THEN` the outcome. `AND` lines extend the previous `WHEN` / `THEN`.
- **Scenarios as branches of one decision**: a requirement leads to a single diamond with one branch per scenario (no diamond when there is only one). Other layouts are available in the settings.
- **AND lines as conditions**: each AND becomes its own condition node (hexagon) in the chain, or can be shown as a list.
- **Delta specs** are labelled and colour-coded: `ADDED`, `MODIFIED`, `REMOVED` (with reason) and `RENAMED`.
- **Live**: re-renders as you type and on save, follows the VS Code light/dark theme.
- **Clear message** when a file has no parseable requirements.
- **Offline**: Mermaid is bundled, nothing is loaded from the network, and no files are written to your workspace.
- **No writing convention required**: `WHEN` / `THEN` text is shown exactly as written.

## Where it works

The action is offered on files named `spec.md` located at:

- `openspec/specs/<capability>/spec.md`
- `openspec/changes/<change>/specs/<capability>/spec.md` (including archived changes)

## Usage

1. Open a `spec.md` in one of the locations above.
2. Click **View as diagram** (CodeLens on line 1) or the diagram button in the editor title bar. You can also run **OpenSpec: View as diagram** from the Command Palette.
3. A panel opens beside the editor. Edit the spec and the diagram updates.

## Settings

| Setting | Values | Default |
| --- | --- | --- |
| `openspecViewer.diagram.renderer` | `flowchart`, `statechart` | `flowchart` |
| `openspecViewer.diagram.layout` | `decision-diamond`, `options-box`, `scenario-flow` | `decision-diamond` |
| `openspecViewer.diagram.andStyle` | `chained`, `list` | `chained` |

`layout` and `andStyle` only apply to the `flowchart` renderer.

The **`statechart`** renderer draws a state machine, similar to xstate: `GIVEN` is the source state, `WHEN` the event on the arrow, `AND` lines before `THEN` are guards (`[a && b]`), `THEN` is the target state and later `AND` lines are actions listed inside it. Scenarios whose `GIVEN` or first `THEN` text is *identical* share a state, so related scenarios connect on their own.

Open panels re-render as soon as a setting changes.

### How to write specs for clear diagrams

The diagram treats the scenarios of one requirement as **alternatives** of a single decision (for example success / card declined / timeout). If behaviours can apply at the same time, put them in separate requirements.

## Install

From the Marketplace or Open VSX: search for **OpenSpec Viewer**.

From a `.vsix` (for example one attached to a [GitHub Release](https://github.com/john891226/openspec-viewer/releases)):

```sh
code --install-extension openspec-viewer-<version>.vsix
```

or use **Extensions: Install from VSIX…** in VS Code.

### Recommend it to your team

In the project that holds the specs, add to `.vscode/extensions.json`:

```json
{
  "recommendations": ["juanpbacallao.openspec-viewer"]
}
```

## Non-goals

Editing specs from the diagram, sequence diagrams, storing generated diagrams, and changing OpenSpec itself.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). The parser and Mermaid generator live in `src/core` with no VS Code dependency, so they can be reused by a CLI or other tooling.

## License

[MIT](LICENSE). See also the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security policy](SECURITY.md).
