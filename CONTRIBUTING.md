# Contributing

Thanks for your interest in improving OpenSpec Viewer! By participating you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Setup

Requires the Node version in [.nvmrc](.nvmrc) and VS Code.

```sh
npm ci          # install dependencies
npm test        # unit tests (vitest)
npm run lint    # eslint
npm run typecheck
npm run build   # bundle extension + webview into dist/
npm run render-check   # render every fixture in headless Chrome (needs Chrome; set CHROME_PATH if not found)
```

## Run the extension

1. Open the repo in VS Code and run `npm run watch` (or `npm run build`).
2. Press **F5** (Run Extension) to start an Extension Development Host.
3. In the host window open a `spec.md` under `openspec/specs/**` or `openspec/changes/*/specs/**` and click **View as diagram**.

Try it against the fixtures in `test/fixtures/` (copy one into a folder named like `openspec/specs/demo/spec.md`).

## Architecture rules

Start with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), a short map of the code and the patterns it uses.


- `src/core` is pure TypeScript with **no `vscode` import** (enforced by lint). Parser and Mermaid generation belong here, with unit tests.
- `src/extension` is the VS Code host; `src/webview` runs inside the panel and renders with the bundled Mermaid. No remote resources.
- Diagrams are always derived from the spec; never store them.
- A diagram that parses is not necessarily one that renders well: run `npm run render-check` (add `-- --screenshots out/` to get PNGs to look at) after changing generators or escaping.

## Workflow

This project uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for non-trivial changes: propose a change under `openspec/changes/`, implement its tasks, then archive it. Small fixes can go straight to a pull request.

- Branch from `main`, keep pull requests focused. `main` is protected: every change goes through a pull request, and it can only be merged when the **CI passed** check is green (it runs on the PR merged with the latest `main`).
- Add or update tests for behaviour changes; `npm test`, `npm run lint` and `npm run typecheck` must pass.
- Use clear, imperative commit messages (for example `Fix parsing of AND after GIVEN`). Conventional Commit prefixes are welcome but not required.
- Update [CHANGELOG.md](CHANGELOG.md) under **Unreleased** for user-visible changes.

## Releasing

Maintainers: see [docs/PUBLISHING.md](docs/PUBLISHING.md).
