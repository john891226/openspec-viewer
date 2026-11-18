# Spec Delta

## Purpose

Defines how the extension is described, built, packaged and published, and how the repository is set up for open-source collaboration, so that releases are reproducible and the maintainer knows exactly which manual steps remain.

## ADDED Requirements

### Requirement: Locally installable package
The project SHALL build a `.vsix` file installable with "Install from VSIX" that contains the bundled extension and Mermaid.

#### Scenario: Package and install
- **WHEN** the package script is run
- **THEN** a `.vsix` is produced that installs and activates on a spec file

#### Scenario: Minimal package contents
- **WHEN** the `.vsix` contents are listed
- **THEN** it contains only built output, manifest, README, CHANGELOG, LICENSE and icon, and no sources, tests or `node_modules`

### Requirement: Complete marketplace metadata
The extension manifest SHALL declare publisher, name, display name, description, version, categories, keywords, icon, gallery banner, licence, repository, bugs and homepage URLs, and minimum VS Code engine, and the package SHALL include a marketplace-facing README, CHANGELOG and LICENSE.

#### Scenario: Packaging validation
- **WHEN** the package script is run with incomplete metadata (for example a missing icon, repository or licence file)
- **THEN** packaging fails with a clear message instead of producing the `.vsix`

#### Scenario: Listing content
- **WHEN** the extension is viewed in the Marketplace or Extensions view
- **THEN** it shows an icon, description, categories, usage instructions and screenshots, and the CHANGELOG tab

### Requirement: Repository community files
The repository SHALL contain a README, LICENSE (MIT), CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY policy, issue templates, a pull request template, CODEOWNERS, Dependabot configuration, and editor/line-ending configuration.

#### Scenario: GitHub community profile
- **WHEN** the repository is pushed to GitHub
- **THEN** the community profile checklist shows these files as present

#### Scenario: Contributor onboarding
- **WHEN** a new contributor follows CONTRIBUTING
- **THEN** they can install, build, test, lint, and launch the extension in a development host using only the documented commands

### Requirement: Continuous integration
A CI workflow SHALL run lint, unit tests, build and package on every push and pull request, and SHALL upload the `.vsix` as a build artifact.

#### Scenario: Pull request with failing tests
- **WHEN** a pull request makes a unit test fail
- **THEN** the CI check fails and the failure is visible on the pull request

#### Scenario: Passing run
- **WHEN** all checks pass
- **THEN** the run uploads the `.vsix` as an artifact

### Requirement: Tag-driven release
A release workflow SHALL run when a tag matching `v*` is pushed, SHALL verify the tag equals the manifest version, SHALL rebuild and test, create a GitHub Release with the `.vsix` attached, and publish to the VS Code Marketplace and Open VSX.

#### Scenario: Successful release
- **WHEN** the maintainer pushes tag `v0.1.0` and the manifest version is `0.1.0`
- **THEN** a GitHub Release is created with the `.vsix`, and the extension is published to both registries

#### Scenario: Version mismatch
- **WHEN** the pushed tag differs from the manifest version
- **THEN** the workflow fails before publishing anything

#### Scenario: Missing publishing secret
- **WHEN** a registry token secret is not configured
- **THEN** that publish step is skipped or fails with a clear message, and the GitHub Release is still created

### Requirement: Documented manual setup
The repository SHALL include `docs/PUBLISHING.md` listing every manual step that cannot be automated, in order, with where to click and which values to set.

#### Scenario: First publish
- **WHEN** the maintainer follows the document from top to bottom
- **THEN** the GitHub repository, Marketplace publisher and token, Open VSX namespace and token, GitHub Actions secrets, and manifest placeholders are all configured and the first tag publishes successfully

#### Scenario: Token rotation
- **WHEN** a token expires
- **THEN** the document explains how to create a replacement and update the secret
