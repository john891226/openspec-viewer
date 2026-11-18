# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- "View as diagram" CodeLens and editor title button for OpenSpec `spec.md` files.
- Side panel rendering one Mermaid flowchart per requirement (WHEN as condition, THEN as outcome, AND extending the previous step).
- Delta labelling for ADDED, MODIFIED, REMOVED and RENAMED requirements.
- Live refresh on edit/save, light/dark theme following, and a message for files with no requirements.
- Pure, editor-independent parser and Mermaid generator under `src/core`.
