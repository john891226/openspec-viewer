# Publishing guide

Releases are automated by [`release.yml`](../.github/workflows/release.yml): pushing a tag `vX.Y.Z` builds the `.vsix`, creates a GitHub Release with it attached, and publishes to the **VS Code Marketplace** and **Open VSX**. Some one-time steps cannot be automated. Do them in order.

## 1. GitHub repository

1. Create an empty repository named `openspec-viewer` on GitHub (no README/licence, they already exist).
2. Replace the placeholder `OWNER_PLACEHOLDER` with your GitHub username/organisation everywhere:
   ```sh
   grep -rn "OWNER_PLACEHOLDER" --exclude-dir=node_modules --exclude-dir=.git .
   ```
   (`package.json`, `README.md`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/config.yml`.)
3. Push: `git remote add origin git@github.com:<owner>/openspec-viewer.git && git push -u origin main`.
4. Repository settings:
   - **About**: add a description and topics (`vscode-extension`, `openspec`, `mermaid`, `diagram`).
   - **Settings → Branches**: protect `main` and require the **CI / build** status check.
   - **Settings → Code security**: enable Dependabot alerts and security updates, and private vulnerability reporting.
   - **Settings → Actions → General**: allow workflows to run (default read permission is fine; the release job requests `contents: write` itself).
5. Check **Insights → Community Standards** shows every item complete.

## 2. VS Code Marketplace (Microsoft)

1. Sign in at <https://marketplace.visualstudio.com/manage> with a Microsoft account.
2. **Create publisher**. Pick a unique **ID** (lowercase, no spaces). This ID must equal `publisher` in `package.json` and is part of the extension id (`<publisher>.openspec-viewer`).
3. Create an Azure DevOps organisation at <https://dev.azure.com> if you do not have one.
4. In Azure DevOps: **User settings → Personal access tokens → New Token**
   - Organization: **All accessible organizations** (required, otherwise publishing fails with 401/403)
   - Scopes: **Custom defined → Marketplace → Manage**
   - Choose an expiry (max 1 year) and copy the token once, it is shown only one time.
5. (Optional, to test locally) `npx vsce login <publisher>` and paste the token.

## 3. Open VSX (VSCodium, Cursor, Gitpod, …)

1. Create an Eclipse Foundation account at <https://accounts.eclipse.org>, using the same GitHub username you will log in with.
2. Log in at <https://open-vsx.org> with GitHub, then **link your Eclipse account** from your profile settings.
3. Sign the **Eclipse Foundation Open VSX Publisher Agreement** (profile → *Log in with Eclipse* → *Show Publisher Agreement*).
4. Create an access token at <https://open-vsx.org/user-settings/tokens>.
5. Create the namespace (once) matching your publisher ID:
   ```sh
   npx ovsx create-namespace <publisher> --pat <OVSX_TOKEN>
   ```

## 4. GitHub Actions secrets

Repository **Settings → Secrets and variables → Actions → New repository secret**:

| Secret      | Value                                   |
| ----------- | --------------------------------------- |
| `VSCE_PAT`  | Azure DevOps token from step 2          |
| `OVSX_PAT`  | Open VSX token from step 3              |

If a secret is missing the matching publish step is skipped with a warning, and the GitHub Release is still created.

## 5. Fill in the manifest

In `package.json` replace `publisher-placeholder` with your publisher ID (and update the `recommendations` snippet in `README.md`). The `prepackage` check (`scripts/check-metadata.mjs`) refuses to package while placeholders remain or required metadata/files are missing. For a local-only build you can bypass it:

```sh
OPENSPEC_VIEWER_ALLOW_PLACEHOLDERS=1 npm run package
```

Also recommended before the first public release: add screenshots (light and dark) under `images/` and reference them from the README using absolute `https://raw.githubusercontent.com/<owner>/openspec-viewer/main/images/<file>.png` URLs.

## 6. Release

```sh
# 1. make sure main is green and CHANGELOG.md has the notes under "Unreleased"
# 2. move the notes under a new "## [x.y.z] - YYYY-MM-DD" heading and commit
npm version <patch|minor|major> --no-git-tag-version   # updates package.json
git commit -am "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --follow-tags
```

The tag **must** equal the `package.json` version (prefixed with `v`), otherwise the workflow aborts before publishing anything. Watch the run under the repository's **Actions** tab.

## Maintenance

- **Token expiry**: when a PAT expires, create a new one as in steps 2/3 and update the secret in step 4.
- **Bad release**: the Marketplace lets you unpublish or deprecate a version from the manage page; Open VSX supports deprecating via its web UI. Fix forward with a new patch version.
- **Install a `.vsix` manually**: `code --install-extension openspec-viewer-<version>.vsix`.
