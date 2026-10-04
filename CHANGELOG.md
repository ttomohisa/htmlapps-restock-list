# Changelog

## Unreleased

- Added a session-only shopping-store filter with All stores, Unassigned, and collision-safe named stores.
- Kept selected stores stable through purchases, Undo, edits, language changes, and tab navigation, including an empty-store recovery action.
- Made all-store sharing and summary scope explicit while filtering.
- Added dependency-free Node runtime regression tests to repository verification.

## 1.0.0

- Initial Restock List release based on the Browser Kitty single-HTML template.
- Added three-state regular-item management: In stock / Low / Out.
- Added an automatically generated, store-grouped current shopping list plus one-off quick additions.
- Added built-in everyday-item suggestions and matching against existing regular items while typing.
- Added reusable category/store suggestions with free-text entry and repeat selection.
- Added purchase completion with Undo, local purchase history, individual history deletion, and full-history clearing.
- Added a visible sample-data notice with one-click sample clearing.
- Added Japanese/English UI and compact three-tab smartphone navigation.
- Added JSON backup/restore and compressed URL-fragment sharing with backward-compatible decoding.
- Preserved single-HTML distribution, `connect-src 'none'`, no runtime network access, and zero third-party runtime dependencies.
