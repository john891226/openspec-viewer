# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-20

### Added
- "View as diagram" CodeLens and editor title button for OpenSpec `spec.md` files.
- Side panel with one diagram per requirement, drawn with Mermaid: a state machine by default (GIVEN is the state, WHEN the event, THEN the next state) or, optionally, a flowchart.
- Setting `openspecViewer.diagram.renderer` (`statechart` default, `flowchart`): a state-machine style diagram where GIVEN is the source state, WHEN the event, AND a guard and THEN the target state.
- Settings `openspecViewer.diagram.layout` (`decision-diamond` default, `options-box`, `scenario-flow`) and `openspecViewer.diagram.andStyle` (`chained` default, `list`).
- Delta labelling for ADDED, MODIFIED, REMOVED and RENAMED requirements.
- Live refresh on edit/save, light/dark theme following, and a message for files with no requirements.
- Pure, editor-independent parser and Mermaid generator under `src/core`.
