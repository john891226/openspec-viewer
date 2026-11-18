# Proposal

## Why

OpenSpec scenarios (`WHEN`/`THEN` lists) are precise for machines but hard for humans to follow as a whole, and a hand-drawn diagram beside them would drift out of sync. We need a view that is always derived from the scenarios, so the spec stays the single source of truth.

## What Changes

- New VS Code extension "OpenSpec Viewer" (greenfield TypeScript project) that renders a `spec.md` as Mermaid flowcharts in a side webview panel.
- A "View as diagram" action (CodeLens at top of file + editor title bar button) offered on spec files under `openspec/specs/**` and `openspec/changes/*/specs/**`.
- One flowchart per requirement: requirement is the root, each scenario a branch, `WHEN` the condition, `THEN` the outcome, `AND` extending the previous step. Delta sections (ADDED/MODIFIED/REMOVED/RENAMED) are labelled.
- Live re-render on edit/save, VS Code light/dark theme following, and a clear message when no requirements parse.
- A pure, VS Code-independent parser (and Mermaid generator) with unit tests, reusable by a future CLI or AI command.
- Mermaid bundled locally (no CDN at runtime); a locally installable `.vsix` build.
- Repository setup following GitHub good practices: README, LICENSE (MIT), CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue/PR templates, CODEOWNERS, Dependabot, `.editorconfig`, `.gitattributes`, `.gitignore`, and Node version pinning.
- Full extension metadata and marketplace listing: publisher, display name, description, categories, keywords, icon, gallery banner, repository/bugs/homepage links, marketplace-facing README with usage and screenshots, and a `docs/PUBLISHING.md` that lists the manual steps the maintainer must do once.
- GitHub Actions: CI (lint, test, build, package on push/PR) and a tag-triggered release workflow that builds the `.vsix`, creates a GitHub Release with it attached, and publishes to the VS Code Marketplace and Open VSX.
- Out of scope: editing specs from the diagram, sequence diagrams, storing generated diagrams, changing OpenSpec itself. (Marketplace publishing is now in scope: it is automated by the release workflow but needs the manual account/token setup documented in `docs/PUBLISHING.md`.)

## Capabilities

### New Capabilities
- `spec-parsing`: Turns OpenSpec `spec.md` text into a structured model (purpose, delta sections, requirements, scenarios, ordered WHEN/THEN/AND steps) without any editor dependency.
- `diagram-generation`: Turns the parsed model into one Mermaid flowchart definition per requirement, labelling delta sections.
- `diagram-viewer`: The VS Code experience: entry points on spec files, side panel, live refresh, theming, and empty/error messaging.
- `extension-release`: How the extension is described, built, packaged and published: marketplace metadata and assets, repository community files, CI, tag-driven release to GitHub Releases, the VS Code Marketplace and Open VSX, and the documented manual setup.

### Modified Capabilities

(none — no specs exist yet in this repo)

## Impact

- New code: TypeScript extension, pure `core` modules, webview assets, tests, lint config, build/packaging scripts (`package.json` currently a stub).
- Dependencies (kept minimal): `mermaid` (bundled), dev-only `typescript`, `esbuild`, `vitest`, `eslint` + `typescript-eslint`, `@vscode/vsce`, `ovsx`, `@types/vscode`.
- New repo files: community/health files, `.github/` (workflows, templates, dependabot, CODEOWNERS), `docs/PUBLISHING.md`, `images/` (icon, screenshots).
- External accounts the maintainer must create (not automatable): GitHub repo, Azure DevOps/Marketplace publisher + PAT, Open VSX account/namespace + token, GitHub Actions secrets.
- Licence changes from the stub's ISC to MIT.
- No changes to OpenSpec or to consuming projects, apart from their optional `.vscode/extensions.json` recommendation.
- Test fixtures: handcrafted simple, complex and edge-case specs under `test/fixtures/demo/` (a ready-to-open demo workspace) plus the repo's own `openspec/` specs.
