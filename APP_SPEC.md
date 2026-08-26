# APP_SPEC.md — Restock List

## 1. Product identity

- **Name:** Restock List
- **Purpose:** Build a shopping list from regular household items without requiring inventory counts.
- **Primary users:** People who repeatedly buy the same groceries and household supplies but do not want a full pantry/inventory system.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Problem and outcome

Most shopping-list apps start from an empty list. Users repeatedly remember and re-enter the same milk, eggs, bread, detergent, tissues, and similar items. Full inventory apps solve that by tracking exact quantities, but the maintenance cost is too high for many households.

Restock List keeps only a lightweight replenishment state: **In stock / Low / Out**. Low and Out items automatically become the current shopping list. Checked purchases return to In stock and are recorded locally.

The app is intentionally local-first, account-free, and useful as a single HTML file opened directly from disk.

## 3. Core user flow

1. Open the page locally or from static hosting.
2. Review regular items.
3. Tap **Low** or **Out** for anything running down at home.
4. Open **To buy now** on a phone and check items while shopping.
5. A checked regular item returns to **In stock** and creates a purchase-history entry.
6. Export a JSON backup when needed, or create a share link containing only the current shopping list in the URL fragment when running from an http/https page.

## 4. Functional requirements

- Maintain regular items with name, category, store, and one of three states: `stocked`, `low`, `out`.
- Support one-off shopping items that do not remain in the regular master.
- Automatically collect Low, Out, and one-off items in the shopping view.
- Group shopping items by store and regular items by category.
- Mark shopping items purchased with one tap.
- Purchase action must be reversible through the reusable Undo toast.
- Record purchase timestamp, item ID/name, and store locally.
- Provide status filters in the regular-items view.
- Provide lightweight built-in product suggestions while typing a one-off item, and prefer matching existing regular items where applicable.
- Category and store fields accept free text and allow previously used values to be reopened and selected again.
- Provide JSON export with a user-editable filename and JSON import that replaces the current dataset.
- Provide per-entry purchase-history deletion, plus destructive history-clear and reset confirmations with `AppConfirm`.
- Show a visible sample-data banner on first launch and remove the banner after the user clears the bundled sample data.
- Provide a share link that embeds the current shopping list after `#list=` only when the app is opened from http/https. Local `file://` opening must not invoke native sharing. No server upload or runtime request is allowed.
- On opening a valid shared link, show an explicit import banner before adding received items.
- Switch Japanese and English without reloading.
- Use the template's light-only visual system and `#16624F` accent.
- Use the template mobile bottom-page pattern with three phone tabs: Buy, Regulars, History.
- Desktop keeps all three sections visible in normal flow.

## 5. Data and privacy

- All primary data is stored in `localStorage` when available.
- No server-side storage, login, analytics, telemetry, or runtime API requests.
- CSP must retain `connect-src 'none'`.
- Share links put a compact shopping-list snapshot in the URL fragment. New links use compact arrays + gzip + Base64URL (`#list=2...`); the decoder keeps backward compatibility with the previous uncompressed format. The fragment is not sent by normal HTTP navigation and the app itself performs no request.
- JSON export/import happens only after explicit user action.

## 6. Data model

Top-level state:

```text
items[]
history[]
settings
```

Item fields:

```text
id, name, category, store, status, regular, createdAt
```

History fields:

```text
id, itemId, name, store, at
```

Regular status values are `stocked`, `low`, and `out`. One-off shopping items use `buy` internally and are removed after purchase.

## 7. UX and accessibility

- Mobile-first from 320px upward.
- Dense shopping rows are preferred over large cards.
- Direct status controls stay next to each regular item.
- Three bottom tabs are persistent on smartphones and switch real mobile pages.
- Desktop shows every section in one scroll.
- Every icon-only control has an accessible name and title where appropriate.
- Focus indicators are visible.
- Motion respects `prefers-reduced-motion`.
- Purchase and delete actions that are safely reversible should use Toast + Undo where implemented.
- Irreversible history clearing, reset, and destructive replacement use `AppConfirm`.
- Dialogs restore or preserve sane keyboard navigation.

## 8. Performance expectations

- Initial UI becomes interactive with no network access.
- At least 500 regular items and 5,000 history entries should remain practical on a normal current desktop browser.
- No third-party runtime dependencies are required for v1.0.0.

## 9. Browser target

Current stable Chromium, Firefox, and Safari on desktop and mobile. Direct `file://` opening is required.

## 10. Non-goals for v1.0.0

- Real-time collaboration or account sync.
- Exact pantry quantities.
- Expiration dates.
- Recipe or meal-planning integration.
- Barcode databases or product lookup.
- Cloud price comparison or flyer search.
- AI recommendations.
- Server-backed QR collaboration.

## 11. Acceptance criteria

- `src/index.template.html` contains the complete application UI and logic.
- `build-standalone.ps1` can generate readable and self-extracting releases without adding runtime network access.
- No unresolved build placeholder remains in generated output.
- Runtime CSP includes `connect-src 'none'`.
- No external script, stylesheet, font, image, frame, or module URL remains in generated output.
- Sample data makes all major states understandable on first launch.
- Setting a regular item Low/Out adds it to the Buy page immediately.
- Purchasing a regular item returns it to In stock, records history, and offers Undo.
- Purchasing a one-off item removes it and records history.
- JSON export has an editable safe filename and JSON import restores valid backups.
- Japanese and English both fit at 360px width.
- The mobile bottom navigation switches the three workflow pages rather than merely scrolling to them.

## In-app help

The upper-right help dialog explains:

- the three-state regular-item workflow,
- purchase-history recording and deletion,
- local-only privacy behavior,
- fragment-based sharing,
- browser-storage loss risk and JSON backup.
