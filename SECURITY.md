# Security Policy

## Supported versions

Only the latest released version receives security fixes.

## Reporting a vulnerability

Please **do not** open a public issue. Report privately using GitHub's
["Report a vulnerability"](../../security/advisories/new) form on the Security tab, or email **juanp.bacallao@gmail.com**.

Include a description, reproduction steps and the affected version. You can expect an acknowledgement within a few days. Fixes are released as soon as practical and credited unless you prefer otherwise.

## Scope notes

The extension renders spec files you open using a bundled Mermaid in a webview with a strict Content Security Policy, `securityLevel: 'strict'`, and no network access. Reports about spec content breaking out of the diagram sandbox are especially welcome.
