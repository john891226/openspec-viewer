# Publishing guide

## How the pipelines work

| Workflow | Runs when | What it does |
| --- | --- | --- |
| [`ci.yml`](../.github/workflows/ci.yml) | every pull request, every push to `main` | lint, typecheck, unit tests, build, package, and the headless-Chrome render check. The last job, **CI passed**, is the one check to require. |
| [`release.yml`](../.github/workflows/release.yml) | a tag `vX.Y.Z` is pushed | runs the same checks first, then verifies the tag, builds the `.vsix`, creates a GitHub Release with it attached, and publishes to the **VS Code Marketplace** and **Open VSX**. |

For a pull request GitHub tests the **merge result** (the PR combined with the current `main`), so the
tests run on the code as it will be after merging. With branch protection on (step 1.4) a pull request
cannot be merged until **CI passed** is green, and `main` is tested again after every merge.

The release refuses to run unless the tag equals the `package.json` version **and** points at a commit
that is already on `main`, so nothing unreviewed can be published.

Some one-time steps cannot be automated. Do them in order.

## 1. GitHub repository

1. Create an empty repository named `openspec-viewer` on GitHub (no README/licence, they already exist).
2. Replace the placeholder `OWNER_PLACEHOLDER` with your GitHub username/organisation everywhere:
   ```sh
   grep -rn "OWNER_PLACEHOLDER" --exclude-dir=node_modules --exclude-dir=.git .
   ```
   (`package.json`, `README.md`, `.github/CODEOWNERS`, `.github/ISSUE_TEMPLATE/config.yml`.)
3. Push: `git remote add origin git@github.com:<owner>/openspec-viewer.git && git push -u origin main`. Push `main` **first**: the first branch you push becomes the repository's default branch, and it must be `main` (otherwise change it in **Settings → Branches → Default branch**).
4. Repository settings:
   - **About**: add a description and topics (`vscode-extension`, `openspec`, `mermaid`, `diagram`).
   - **Protect `main`** so nothing is merged with failing tests (see the box below).
   - **Settings → General → Pull Requests**: enable *Automatically delete head branches*, and optionally *Allow auto-merge* (merges by itself once **CI passed** is green).
   - **Settings → Code security**: enable Dependabot alerts and security updates, and private vulnerability reporting.
   - **Settings → Actions → General**: allow workflows to run (default read permission is fine; the release job requests `contents: write` itself).

   **Protecting `main`.** Run CI once first (open any pull request, or push to `main`): a status check only shows up in the picker after it has run. Then go to **Settings → Branches → Add branch protection rule**, branch name pattern `main`, and tick:
   - *Require a pull request before merging*. Leave the number of required approvals at **0** if you work alone: you cannot approve your own pull request, so 1 would block you.
   - *Require status checks to pass before merging* → search and add **CI passed**, and tick *Require branches to be up to date before merging*. That last option is what guarantees the tests ran on the code merged with the latest `main`.
   - *Do not allow bypassing the above settings* (applies to you as admin too), and leave *Allow force pushes* and *Allow deletions* off.

   If you have the GitHub CLI (`gh`) the same can be done in one command:
   ```sh
   gh api -X PUT repos/<owner>/openspec-viewer/branches/main/protection --input - <<'JSON'
   {
     "required_status_checks": { "strict": true, "contexts": ["CI passed"] },
     "enforce_admins": true,
     "required_pull_request_reviews": { "required_approving_review_count": 0, "dismiss_stale_reviews": true },
     "restrictions": null,
     "allow_force_pushes": false,
     "allow_deletions": false
   }
   JSON
   ```
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

With `main` protected, a release is a pull request followed by a tag:

```sh
# 1. Prepare the release on a branch
git switch main && git pull
git switch -c release/vX.Y.Z
npm version <patch|minor|major> --no-git-tag-version   # updates package.json (and the lockfile)
# move the notes in CHANGELOG.md from "Unreleased" under "## [X.Y.Z] - YYYY-MM-DD"
git commit -am "Release vX.Y.Z"
git push -u origin release/vX.Y.Z

# 2. Open a pull request, wait for "CI passed", merge it

# 3. Tag the merge commit on main and push the tag
git switch main && git pull
git tag vX.Y.Z
git push origin vX.Y.Z
```

Pushing the tag starts [`release.yml`](../.github/workflows/release.yml). It stops before publishing anything if:
- the tag is not on `main`,
- the tag does not equal the `package.json` version (prefixed with `v`), or
- any check of [`ci.yml`](../.github/workflows/ci.yml) fails.

Watch the run under the repository's **Actions** tab. On success you get a GitHub Release with the `.vsix` attached, and the extension is published to the Marketplace and Open VSX (each only if its secret from step 4 is set).

## Maintenance

- **Token expiry**: when a PAT expires, create a new one as in steps 2/3 and update the secret in step 4.
- **Bad release**: the Marketplace lets you unpublish or deprecate a version from the manage page; Open VSX supports deprecating via its web UI. Fix forward with a new patch version.
- **A failed release run**: fix the cause on `main` through a pull request. Then delete the tag (`git push origin :refs/tags/vX.Y.Z`, and `git tag -d vX.Y.Z`) and tag the new commit again. Nothing was published if the run stopped before the publish steps.
- **Install a `.vsix` manually**: `code --install-extension openspec-viewer-<version>.vsix`.
