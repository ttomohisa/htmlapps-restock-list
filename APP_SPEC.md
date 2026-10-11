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
- Group shopping items by raw store identity and regular items by category.
- Filter the shopping view with a labeled native selector: All stores, Unassigned, and named stores. Named stores include those currently stocked; display labels never determine filter identity.
- Keep the selected filter for the current page session across purchases, Undo, edits, language changes, and tab navigation. Do not persist it in localStorage or backups.
- Keep a selected store visible even when its last shopping item disappears; show a store-specific empty state with a Show all stores action.
- Keep global summary counts and shared links scoped to all stores. While filtering, label sharing as Share all stores and show the scope beside the selector.
- Reset the filter on reload, successful full JSON replacement, sample clearing, and reset; invalid imports leave it intact.
- Provide a localized **Copy visible list** button beside the store selector. Copy only the visible Low, Out, and one-off items, using the current display language, raw-store group identity, and the same store/item ordering as the shopping view.
- Copy plain text as store headings followed by `- item` lines, separated by blank lines between groups. Preserve Unicode and literal HTML-looking text. Temporarily disable copying while its clipboard operation is pending. Disable copying when the filtered view is empty, including after its last purchase; Undo restores availability.
- Capture the text at click time. Later filter, language, or item changes must not change an in-flight copy snapshot. Copying never changes data, settings, history, or persistence. Delayed feedback must not replace a newer action’s Undo toast.
- Use the asynchronous clipboard API when available, with a local selection fallback. Handle unavailable APIs, rejection, false results, and exceptions with truthful localized feedback; always remove temporary selection elements and restore focus without stealing a newer focus target.
- Keep existing native sharing and all-store URL payload behavior unchanged. Local `file://` pages may copy visible plain text even though URL sharing remains unavailable.
- Mark shopping items purchased with one tap.
- Purchase action must be reversible through the reusable Undo toast.
- Record purchase timestamp, item ID/name, and store locally.
- Provide status filters in the regular-items view.
- Provide lightweight built-in product suggestions while typing a one-off item, and prefer matching existing regular items where applicable.
- Category and store fields accept free text and allow previously used values to be reopened and selected again.
- Provide JSON export with a user-editable filename labeled バックアップのファイル名 / Backup filename for assistive technology and JSON import that replaces the current dataset.
- Only the latest selected JSON file may replace data or report an import result. Ignore older delayed reads and failures, preserving newer data, filters, dialog state, and Undo feedback. Clear the file picker synchronously so the same file can be selected again; cancelled selection does not replace data.
- Provide per-entry purchase-history deletion, plus destructive history-clear and reset confirmations with `AppConfirm`.
- Show a visible sample-data banner on first launch and remove the banner after the user clears the bundled sample data.
- Clearing samples removes only records with known bundled IDs and exactly matching content fields; keep user-created items, edited or incomplete seed rows, ID collisions with different content, and actual purchase history even when it references a seed item. Preserve settings except the sample-banner flag. Cancel and a dataset replacement during confirmation must not delete anything.
- Seed timestamps are relative to the original load and cannot be compared with freshly generated seed dates. Imported records with exact bundled IDs and content are indistinguishable from original samples and are treated as samples; no provenance field or schema migration is added.
- Provide a share link that embeds the current shopping list after `#list=` only when the app is opened from http/https. Local `file://` opening must not invoke native sharing. No server upload or runtime request is allowed.
- On opening a valid shared link, show an explicit import banner before adding received items.
- Switch Japanese and English without reloading. Show the target as EN / JA, with localized target aria-label and title: 英語に切り替え / Switch to Japanese. Preserve the exact privacy badge 完全ローカル処理 / Fully local processing.
- Use the template's light-only visual system and `#16624F` accent.
- Use the template mobile bottom-page pattern with three phone tabs: Buy, Regulars, History.
- Desktop keeps all three sections visible in normal flow.

## 5. Data and privacy

- All primary data is stored in `localStorage` when available.
- No server-side storage, login, analytics, telemetry, or runtime API requests.
- CSP must retain `connect-src 'none'`.
- Share links put a compact shopping-list snapshot in the URL fragment. New links use compact arrays + gzip + Base64URL (`#list=2...`); the decoder keeps backward compatibility with the previous uncompressed format. The fragment is not sent by normal HTTP navigation and the app itself performs no request.
- JSON export/import and clipboard writes happen only after explicit user action. Plain-text copying stays local; pasting it into another app is up to the user.

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
- Native modal dialogs lock background page scrolling while preserving their own inner scrolling. Closing the last modal restores normal page scrolling.

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
- Store filters distinguish blank, named, translated, HTML-special, and reserved-label store names without changing item data.
- Purchasing or deleting the last item in a filtered store keeps its empty view; Undo restores the item under the same filter.
- Visible-list copying respects exact named/unassigned store filters and translated-name collisions, and remains a click-time snapshot if a clipboard fallback is delayed.
- Both list and link copying report failures without an unhandled rejection or leftover textarea.
- JSON export has an editable safe filename with a localized accessible name. Language switching preserves the edited filename, and JSON import restores valid backups.
- A superseded JSON import cannot overwrite a newer successful or pending import, replace newer error/Undo feedback, close a reopened dialog, or clear a newer picker selection. A failed latest import preserves existing valid data.
- Header language targets, privacy wording, and Help title/controls localize in both languages without resetting shopping data or the store filter.
- Clearing mixed sample/user data preserves added and changed items and actual purchase history after reload. Repeating clear with no active sample banner is harmless; legacy missing fields must not broaden sample matching.
- Japanese and English both fit at 360px width.
- The mobile bottom navigation switches the three workflow pages rather than merely scrolling to them.
- Outside-wheel scrolling must not move the page behind an open modal at narrow or short viewports; inner dialog content remains scrollable and closing restores page scrolling.

## In-app help

The upper-right help dialog explains:

- the three-state regular-item workflow,
- purchase-history recording and deletion,
- local-only privacy behavior,
- visible-list plain-text copying and all-store fragment-based sharing,
- browser-storage loss risk, JSON replacement, and latest-selected-file import behavior.
