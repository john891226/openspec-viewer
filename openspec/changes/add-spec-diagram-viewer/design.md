# Design

## Context

Greenfield repo: only a stub `package.json` and an initialised `openspec/` exist. Spec format reference: OpenSpec `spec.md` (see proposal.md). Samples live in the axion project's `setup-authentication` change (delta specs with `## Purpose`, `## ADDED Requirements`, requirement text, scenarios).

## Goals / Non-Goals

**Goals:**
- Layered code: pure `src/core` (parser + Mermaid generator, zero imports from `vscode`) and a thin `src/extension` + webview layer.
- Minimal runtime dependencies (only `mermaid`).

**Non-Goals:**
- Publishing a CLI now; core is merely kept importable for one.
- Self-service account creation: registry accounts and tokens stay manual (documented).
- Any spec editing, persistence or non-flowchart diagram type.

## Decisions

1. **Hand-written line parser, no markdown library.** The format is line-oriented (headers + bullets); a small state machine (tracking fenced code blocks, current delta section, requirement, scenario) is enough, keeps the core dependency-free, and is tolerant by construction. *Alternative:* remark/unified — heavier, and AST handling adds little.
2. **Core produces two pure stages:** `parseSpec(text) → SpecModel` and `toMermaid(model) → DiagramDef[]` (`{ id, title, source }`). Both unit-tested; Mermaid text is generated in core so tests can assert on it and a CLI could emit it. The webview receives only definitions + theme.
3. **Steps model:** each scenario holds `steps: {keyword: 'WHEN'|'GIVEN'|'THEN'|'AND', text}[]`. AND resolves to the preceding WHEN/GIVEN or THEN at generation time, merging into that node (joined with `<br/>`). Text is kept verbatim.
4. **Flowchart layout:** `flowchart LR`; root requirement node → per scenario: condition node (labelled with scenario name as edge text) → outcome node. Edge from root to condition is labelled with the scenario name. Label escaping via Mermaid entity codes (`#quot;`, `#35;` etc.) inside quoted labels; `securityLevel: 'strict'` in the webview as a second line of defence.
5. **Delta labelling:** root node text prefixed `[ADDED]`, etc., with `classDef` per kind (colours chosen readable in both themes). REMOVED shows reason; RENAMED shows `old → new` diagram.
6. **Mermaid bundled via esbuild:** an IIFE webview bundle (`dist/webview.js`) importing `mermaid`, loaded with `webview.asWebviewUri`. A strict CSP with nonce and `default-src 'none'`; no remote resources. Extension host bundled by esbuild too (CJS, `vscode` external) so the `.vsix` ships small `dist/` only.
7. **Path matching** for spec files: regex on normalised `fsPath`/URI path: `/openspec/specs/**/spec.md` or `/openspec/changes/<name>/specs/**/spec.md` (excluding `changes/archive`? Archived deltas are still valid specs, so they match too). Used for the CodeLens provider and a `when` context key (`openspecViewer.isSpec`) for the title button.
8. **Live update:** subscribe to `onDidChangeTextDocument` (debounced ~200ms) and `onDidSaveTextDocument`, reading the in-memory document; `onDidChangeActiveColorTheme` posts the theme to the webview (kind → `dark`/`default`).
9. **Tooling:** TypeScript strict, `vitest` for unit tests (fixtures copied from axion samples plus handcrafted edge cases), `eslint` + `typescript-eslint`, `@vscode/vsce package` for the `.vsix`. Extension manifest: `engines.vscode` modern, activation by `onLanguage:markdown` / workspace contains `openspec`; no network permissions.
10. **Retire the stub `package.json` fields** (`main: index.js`, `type: commonjs` fine) — set `main: ./dist/extension.js`, publisher placeholder, `license`.
11. **CI** (`.github/workflows/ci.yml`): Node version from `.nvmrc`, `npm ci`, lint, test, build, `vsce package`, upload `.vsix` artifact. Runs on push to `main` and on PRs; Dependabot (npm + github-actions, weekly) keeps dependencies and actions updated; actions pinned to major versions.
12. **Release** (`.github/workflows/release.yml`, on tag `v*`): verify tag == `package.json` version, rebuild and test, `vsce package`, create GitHub Release via `gh release create` with the `.vsix` and notes from the CHANGELOG, then `vsce publish --packagePath` (secret `VSCE_PAT`) and `ovsx publish` (secret `OVSX_PAT`). Publish steps are guarded by `if: secrets present` (via an env check) so the GitHub Release still works before registries are set up. Least-privilege `permissions: contents: write`. *Alternative:* release-please/semantic-release — more automation, more moving parts; manual tag is simpler for a single-maintainer project.
13. **Metadata:** manifest fields `publisher`, `displayName`, `description`, `categories` (Visualization, Other), `keywords`, `icon` (128x128 PNG in `images/icon.png`), `galleryBanner`, `repository`, `bugs`, `homepage`, `license`, `engines.vscode`, `qna`, `badges` optional. `README.md` doubles as the Marketplace page, so image links must be absolute or resolved by `vsce` via `repository`; screenshots live in `images/`. Placeholders (`publisher`, GitHub `OWNER/REPO`) are explicit, grep-able tokens that a `prepackage` check fails on, so nothing is published with them.
14. **Community files:** MIT LICENSE, CONTRIBUTING (setup, F5 dev host, tests, OpenSpec workflow for changes, commit/PR conventions), Contributor Covenant CODE_OF_CONDUCT, SECURITY (private reporting via GitHub advisories), issue forms (bug, feature), PR template, CODEOWNERS, `.editorconfig`, `.gitattributes` (LF), `.nvmrc`, CHANGELOG in Keep a Changelog format.
15. **Manual steps doc** (`docs/PUBLISHING.md`): (a) create the GitHub repo, push, set repo description/topics, enable Dependabot alerts and branch protection on `main` requiring CI; (b) Marketplace: sign in at https://marketplace.visualstudio.com/manage with a Microsoft account, create a publisher (ID must match manifest `publisher`), create an Azure DevOps organisation and a PAT with scope *Marketplace > Manage* for *All accessible organizations*; (c) Open VSX: create an Eclipse Foundation account, link GitHub on open-vsx.org, sign the Publisher Agreement, create an access token, run `npx ovsx create-namespace <publisher>`; (d) add GitHub secrets `VSCE_PAT` and `OVSX_PAT` (Settings > Secrets and variables > Actions); (e) replace manifest placeholders and add icon/screenshots; (f) first release: bump version, update CHANGELOG, `git tag v0.1.0 && git push --tags`; (g) token rotation and unpublish notes.


## Risks / Trade-offs

- [Large specs produce slow Mermaid renders] → render per requirement and isolate failures; debounce edits.
- [Mermaid bundle is large (~MBs) in the `.vsix`] → accepted cost of offline requirement; bundle minified, exclude sources via `.vscodeignore`.
- [Format drift in OpenSpec] → parser is tolerant and anchors only on stable headers/keywords; fixtures from real specs guard regressions.
- [Keyword case/format variants, e.g. `- WHEN` without bold] → accept optional bold and case-insensitive keywords.
- [`publisher` and repository URL unknown until the maintainer creates them] → placeholder tokens that fail `prepackage`, documented in `docs/PUBLISHING.md`; local dev packaging can bypass with an env flag.
- [Publishing credentials are long-lived PATs] → stored only as GitHub secrets, scoped to Marketplace manage; rotation documented; release job uses minimal permissions.
- [A bad release is hard to retract] → CI must pass before tagging; tag/manifest version check; Marketplace allows unpublishing/deprecating, documented.
