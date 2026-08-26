# Security Policy

## Supported version

Security fixes target the latest version on the default branch.

## Reporting a vulnerability

Do not publish sensitive vulnerability details in a public issue. Use the repository owner's private security reporting channel when available.

Please include:

- Affected commit or version.
- Reproduction steps.
- Expected and actual behavior.
- Security impact.
- A minimal backup/share payload when relevant.

## Trust model

Restock List is a static browser application with no backend. Its primary protections are:

- No runtime network connection from the app (`connect-src 'none'`).
- No analytics, telemetry, remote fonts, or silent update checks.
- Shopping data is stored locally in the browser when `localStorage` is available.
- Backup export, backup import, destructive changes, and share-link merging require explicit user actions.
- Share payloads use the URL fragment and are not uploaded by the app.
- v1.0.0 has no third-party runtime dependencies.

A downloaded HTML file is executable code. Distribute it through a trusted channel and verify repository/release hashes for high-trust workflows.

## Imported backup data

JSON backups are untrusted input. The app validates the expected top-level arrays before replacing local data, but users should only import backups they trust.

The app does not execute script content from imported fields. Item names, categories, and stores are rendered as text/escaped HTML rather than injected as executable markup.

## Shared links

A shared link contains the current shopping-list snapshot in encoded form after `#list=`. Treat the URL itself as data: anyone who receives the full URL can decode the shared item names, stores, and categories.

Opening a shared link does not overwrite local data. The recipient must explicitly choose to merge the received list.

## Dependency review

Restock List v1.0.0 has no bundled third-party runtime libraries. If a dependency is added later:

- Confirm the package identity and exact version.
- Review its license and required notices.
- Inspect the browser bundle and package scripts.
- Confirm every runtime asset is embedded.
- Rebuild with a clean cache.
- Test with the network disabled.
