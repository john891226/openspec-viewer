# Spec Delta

## Purpose

Lets users open a side panel in VS Code that shows a live, theme-aware diagram of the OpenSpec spec file they are editing.

## ADDED Requirements

### Requirement: View as diagram entry points
The extension SHALL offer a "View as diagram" CodeLens at the top of, and an editor title bar button for, any open `spec.md` located under `openspec/specs/**` or `openspec/changes/*/specs/**`.

#### Scenario: Spec file open
- **WHEN** the user opens `openspec/specs/auth/spec.md`
- **THEN** a "View as diagram" CodeLens appears on line 1 and a title bar button is shown

#### Scenario: Delta spec file open
- **WHEN** the user opens `openspec/changes/my-change/specs/auth/spec.md`
- **THEN** the same entry points are offered

#### Scenario: Unrelated markdown file
- **WHEN** the user opens a markdown file outside those paths or not named `spec.md`
- **THEN** no entry points are offered

### Requirement: Side panel
Activating the action SHALL open a webview panel beside the editor showing one diagram per requirement, and SHALL reuse the existing panel for the same file.

#### Scenario: First open
- **WHEN** the user activates "View as diagram"
- **THEN** a panel opens in a side column titled with the spec's capability name

#### Scenario: Second activation
- **WHEN** the panel for that file is already open
- **THEN** it is revealed instead of opening another

### Requirement: Live refresh
The panel SHALL re-render when the underlying document changes or is saved, using the current editor content including unsaved edits.

#### Scenario: Edit scenario
- **WHEN** the user edits a THEN line
- **THEN** the diagram updates shortly after without reopening the panel

#### Scenario: File closed
- **WHEN** the spec document is closed
- **THEN** the panel stops updating and does not error

### Requirement: Theme following
The panel SHALL render diagrams with a light or dark Mermaid theme matching the current VS Code colour theme and SHALL update when the theme changes.

#### Scenario: Theme switch
- **WHEN** the user switches from a light to a dark VS Code theme
- **THEN** open panels re-render with the dark theme

### Requirement: Empty and error messaging
The panel SHALL show a clear message when the file has no parseable requirements, and SHALL show a per-diagram error instead of a blank panel when a diagram fails to render.

#### Scenario: No requirements
- **WHEN** the spec has no `### Requirement:` blocks
- **THEN** the panel shows a message explaining that no requirements were found and what format is expected

#### Scenario: Diagram render failure
- **WHEN** one requirement's diagram fails to render
- **THEN** that diagram shows an error with the requirement name while the others still render

### Requirement: Offline and nothing persisted
The panel SHALL work without network access using locally bundled Mermaid, and the extension SHALL NOT write generated diagrams or any files into the workspace.

#### Scenario: No network
- **WHEN** the machine is offline
- **THEN** diagrams render normally

#### Scenario: Workspace unchanged
- **WHEN** a diagram is viewed and closed
- **THEN** no files in the workspace have been created or modified

### Requirement: Diagram settings
The extension SHALL provide a setting `openspecViewer.diagram.renderer` (`statechart`, `flowchart`; default `statechart`) and settings `openspecViewer.diagram.layout` (`decision-diamond`, `options-box`, `scenario-flow`; default `decision-diamond`) and `openspecViewer.diagram.andStyle` (`chained`, `list`; default `chained`), and open panels SHALL re-render when any of them changes.

#### Scenario: Defaults
- **WHEN** the user has not changed the settings
- **THEN** diagrams use the `statechart` renderer (the layout and AND style only matter when switching to `flowchart`, where the defaults are `decision-diamond` and `chained`)

#### Scenario: Change layout
- **WHEN** the user changes `openspecViewer.diagram.layout` while a panel is open
- **THEN** the panel re-renders with the new layout without being reopened

#### Scenario: Invalid value
- **WHEN** a setting holds an unknown value
- **THEN** the default for that setting is used
