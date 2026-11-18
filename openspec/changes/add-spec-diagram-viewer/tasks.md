# Tasks

## 1. Project scaffolding

- [x] 1.1 Replace the stub `package.json` with the extension manifest (main `dist/extension.js`, commands, menus, activation, scripts `build`, `test`, `lint`, `package`) and verify `node -e "require('./package.json')"` loads and `npm install` succeeds
- [x] 1.2 Add `tsconfig.json` (strict), `eslint.config.mjs`, `.vscodeignore`, `.gitignore`, and verify `npm run lint` and `npx tsc --noEmit` pass on an empty `src/`
- [x] 1.3 Add test fixtures: add handcrafted fixtures to `test/fixtures/` (no requirements, code fences, REMOVED, RENAMED, special characters) and a demo workspace `test/fixtures/demo/` with simple, complex and edge-case specs and verify files exist

## 2. Parser (`src/core/parser.ts`)

- [x] 2.1 Implement `parseSpec` (purpose, delta sections, requirements, scenarios, steps incl. AND, code-fence skipping, removed/renamed handling) and verify `vitest` tests cover every `spec-parsing` scenario
- [x] 2.2 Add a property-style test feeding random/garbage text and verify `parseSpec` never throws
- [x] 2.3 Run the parser over the demo and the repo's own specs in a test and verify requirement/scenario counts match expected values

## 3. Diagram generation (`src/core/mermaid.ts`)

- [x] 3.1 Implement `toMermaid` (root, scenario branches, AND merging, delta labels and classDefs, REMOVED/RENAMED diagrams) and verify unit tests cover every `diagram-generation` scenario
- [x] 3.2 Implement label escaping and verify a test that special characters yield definitions accepted by `mermaid.parse` (run in the test environment, Node)
- [x] 3.3 Add snapshot tests against the demo specs and verify determinism (generate twice, equal)
- [x] 3.4 Verify the core has no `vscode` import with a lint rule (`no-restricted-imports`) and `npm run lint` passes
- [x] 3.5 Add layout (`decision-diamond` default, `options-box`, `scenario-flow`; diamond only with 2+ scenarios) and AND style (`chained` default with hexagon conditions, `list`) options to `toMermaid`, with unit tests per combination and verification that every combination over the demo specs is valid Mermaid
- [x] 3.6 Add the `statechart` renderer (`src/core/statechart.ts`) with state sharing by identical text, guards from ANDs, delta labelling, and unit tests per mapping rule; verify every demo spec is valid Mermaid in this renderer

## 4. Extension and webview

- [x] 4.1 Implement spec-path matching helper with unit tests for `openspec/specs/**` and `openspec/changes/*/specs/**` and negatives, and verify tests pass
- [ ] 4.2 Implement activation, the `openspecViewer.viewAsDiagram` command, CodeLens provider, `openspecViewer.isSpec` context key and title-bar menu; verify in the Extension Development Host that the entry points appear only on spec files
- [ ] 4.3 Implement the panel manager (side column, reuse per file, debounced live refresh from in-memory text, save refresh, theme change, disposal on close) and verify manually by editing a scenario and switching theme
- [ ] 4.4 Implement the webview script (render with bundled Mermaid, theme mapping, no-requirements message, per-diagram error handling) with a strict nonce CSP, and verify offline rendering and the empty-file message
- [x] 4.5 Add esbuild config bundling extension and webview (Mermaid included) and verify `npm run build` produces `dist/` with no CDN URLs (`grep -r "cdn" dist` is empty)
- [ ] 4.6 Add the `openspecViewer.diagram.renderer`, `openspecViewer.diagram.layout` and `openspecViewer.diagram.andStyle` settings (with defaults and descriptions), re-render open panels when they change, document them in the README and CHANGELOG, and verify by changing them in the dev host

## 5. Packaging and metadata

- [ ] 5.1 Add `npm run package` using `vsce` with a `.vscodeignore` and verify the `.vsix` is created, lists only built output/manifest/README/CHANGELOG/LICENSE/icon (`vsce ls`), installs with `code --install-extension`, and activates on a spec file
- [x] 5.2 Complete the manifest metadata (publisher, displayName, description, categories, keywords, icon, galleryBanner, repository, bugs, homepage, license MIT, engines, `qna`) with author `juanp.bacallao@gmail.com` (the professional address; the private one must not appear anywhere in the repo) and explicit placeholders for publisher and GitHub owner, and verify `vsce package` accepts the manifest
- [x] 5.3 Add a `prepackage` check script that fails on remaining placeholders or missing icon/LICENSE/CHANGELOG (with an env flag to bypass for local dev), and verify it fails on a placeholder and passes with the bypass
- [ ] 5.4 Create `images/icon.png` (128x128 PNG) and screenshots of a diagram in light and dark themes, and verify the icon dimensions with `file images/icon.png`
- [x] 5.5 Write the marketplace-facing `README.md` (what it does, screenshots, usage, supported file locations, settings/commands, install from VSIX, `.vscode/extensions.json` recommendation snippet, non-goals, badges) and verify `vsce package` renders it without link errors

## 6. Repository setup (GitHub good practices)

- [ ] 6.1 Add `LICENSE` (MIT), `CHANGELOG.md` (Keep a Changelog, with an Unreleased section), `.editorconfig`, `.gitattributes`, `.nvmrc`, and verify the `license` field in `package.json` matches and `npm ci` works on the pinned Node version
- [ ] 6.2 Add `CONTRIBUTING.md` (setup, F5 dev host, test/lint/build, OpenSpec-based change workflow, commit and PR conventions) and verify a clean clone can follow it end to end
- [x] 6.3 Add `CODE_OF_CONDUCT.md` (Contributor Covenant) and `SECURITY.md` (private reporting via GitHub advisories, supported versions) and verify both are linked from the README
- [x] 6.4 Add `.github/ISSUE_TEMPLATE/` forms (bug, feature, config.yml), `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS`, `.github/dependabot.yml` (npm + github-actions) and verify YAML validity with `npx yaml-lint` or `actionlint`/a YAML parse

## 7. CI and release automation

- [ ] 7.1 Add `.github/workflows/ci.yml` (lint, test, build, package, upload `.vsix` artifact on push/PR) and verify it passes with `actionlint` locally and on a first push
- [ ] 7.2 Add `.github/workflows/release.yml` (tag `v*`: tag/manifest version check, rebuild + test, package, GitHub Release with `.vsix`, `vsce publish`, `ovsx publish`, publish steps guarded by secret presence, `permissions: contents: write`) and verify with `actionlint`
- [x] 7.3 Add an npm `version`/release helper note (or script) so a release is `npm version <x>` + CHANGELOG + `git push --follow-tags`, and verify the tag/version check logic with a dry run against a mismatched tag
- [x] 7.4 Write `docs/PUBLISHING.md` with the ordered manual steps (GitHub repo and branch protection; Marketplace publisher and Azure DevOps PAT with Marketplace > Manage scope; Open VSX account, Publisher Agreement, namespace and token; GitHub secrets `VSCE_PAT` and `OVSX_PAT`; replacing placeholders; first tag; token rotation; unpublish), and verify every secret and file name it mentions exists in the workflows and manifest
- [x] 7.5 Add `npm run render-check` (headless Chrome over every fixture and every renderer/layout/AND-style combination, failing on render errors, garbled text, disconnected boxes and stray state boxes) and a separate `render-check` CI job, and verify it fails when the `;` statechart bug or a missing edge is reintroduced

## 8. Final integration

- [ ] 8.1 End-to-end check against the demo workspace in `test/fixtures/demo` and verify every requirement renders a diagram in the installed `.vsix`
- [x] 8.2 Run `npm test`, `npm run lint`, `npm run package` (with bypass flag), and `openspec validate add-spec-diagram-viewer --strict`, and verify all pass
- [ ] 8.3 Verify the GitHub community profile checklist is complete after the first push (Insights > Community Standards)

## Workflow follow-up

- Complete the manual steps in `docs/PUBLISHING.md`, then push tag `v0.1.0` for the first release.
- Archive the change after review and verify main specs were created under `openspec/specs/`.
