# Offline Verification

1. Run `build-standalone.bat` on Windows.
2. Open `dist/index.html` directly from disk.
3. Open browser developer tools and clear the Network panel.
4. Enable offline mode or disconnect the device.
5. Reload the local HTML.
6. Confirm the Japanese/English switch, regular-item state changes, quick additions, purchase completion, Undo, purchase-history deletion, and sample-data clearing all work.
7. Open the add/edit dialog and confirm category/store free text and previously used suggestions work repeatedly.
8. Export a JSON backup with a custom filename, then import a valid backup and confirm the dataset is restored.
9. Confirm no external resource request or console error occurs during the core workflow.
10. Confirm `connect-src 'none'` remains present in the generated HTML.

Share-link generation is intentionally intended for a published `http/https` page because a local `file://` URL cannot be used by another device. The encoding/decoding logic itself remains local and performs no network request.

For GitHub Pages, one initial request downloads the HTML. Clear the Network panel after the page has loaded, then test the complete app flow.

## Self-extracting variant

Open `dist/index.self-extract.html` directly and confirm:

- the loading screen is readable,
- the same favicon as `dist/index.html` is visible,
- the loading screen disappears,
- the restored app has the same v1.0.0 UI and behavior,
- the console contains no decompression or CSP error.

`scripts/verify-self-extract.ps1` also enforces an ASCII-only loader and byte-for-byte restoration of the readable HTML.
