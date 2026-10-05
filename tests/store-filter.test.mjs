import assert from 'node:assert/strict';
import test from 'node:test';
import { html, app, item, fixtures } from './helpers/app.mjs';

test('store selector is visibly labeled, native, and keyboard focusable', () => {
  assert.match(html, /<label[^>]*for="buyStoreFilter"/);
  assert.match(html, /<select[^>]*id="buyStoreFilter"/);
  assert.doesNotMatch(html, /<select[^>]*id="buyStoreFilter"[^>]*tabindex="-1"/);
});
test('all stores shows every shopping item and excludes stocked items', () => { const a = app(); assert.deepEqual(a.rows(), ['market', 'once', 'drug', 'none']); });
test('a named store filters rows without changing global metrics or data', () => { const a = app(); a.select('Market'); assert.deepEqual(a.rows(), ['market', 'once']); assert.match(a.node('#metricBuy').innerHTML, /^4</); assert.equal(a.getData().items.length, 5); });
test('unassigned excludes named stores', () => { const a = app(); a.select(''); assert.deepEqual(a.rows(), ['none']); });
test('special labels and translated store names preserve separate raw identities', () => {
  const stores = ['', 'All stores', 'Unassigned', 'その他', 'スーパー', 'Supermarket', '<x> & "shop"'];
  const a = app(stores.map((s, i) => item(`item${i}`, s)));
  for (let i = 0; i < stores.length; i++) { a.select(stores[i]); assert.deepEqual(a.rows(), [`item${i}`]); }
  assert.match(a.node('#buyStoreFilter').innerHTML, /&lt;x&gt; &amp; &quot;shop&quot;/);
  assert.doesNotMatch(a.node('#buyStoreFilter').innerHTML, /<x>/);
  a.select(null); assert.equal(a.rows().length, stores.length); assert.equal((a.node('#buyList').innerHTML.match(/class="buy-group"/g) || []).length, stores.length);
});
test('last regular purchase keeps selected store empty and Undo restores its row', () => {
  const a = app([item('one', 'Market'), item('other', 'Elsewhere')]); a.select('Market'); a.purchaseItem('one');
  assert.deepEqual(a.rows(), []); assert.equal(a.node('#buyStoreFilter').value, '"Market"');
  assert.match(a.node('#buyList').innerHTML, /Nothing to buy at this store/); assert.match(a.node('#buyList').innerHTML, /data-action="show-all-stores"/);
  a.node('#appToastAction').dispatch('click'); assert.deepEqual(a.rows(), ['one']); assert.equal(a.getData().history.length, 0);
});
test('last one-off removal retains the selected option and Undo restores it', () => {
  const a = app([item('once', 'Solo', 'buy', false), item('other', 'Elsewhere')]); a.select('Solo'); a.purchaseItem('once');
  assert.deepEqual(a.rows(), []); assert.match(a.node('#buyStoreFilter').innerHTML, /Solo/); assert.equal(a.node('#buyStoreFilter').value, '"Solo"');
  a.node('#appToastAction').dispatch('click'); assert.deepEqual(a.rows(), ['once']);
});
test('editing an item into another store preserves the now-empty filter', () => {
  const a = app([item('one', 'Market'), item('other', 'Elsewhere')]); a.select('Market');
  for (const [id, value] of Object.entries({ editItemId: 'one', itemName: 'one', itemCategory: '', itemStore: 'Elsewhere', itemRegular: 'yes', itemState: 'low' })) a.node(`#${id}`).value = value;
  a.node('#itemForm').dispatch('submit'); assert.deepEqual(a.rows(), []); assert.equal(a.node('#buyStoreFilter').value, '"Market"');
});
test('store selection survives language switches, rerenders, and tab changes', () => {
  const a = app([item('one', 'スーパー'), item('two', 'Supermarket')]); a.select('スーパー');
  a.node('#languageButton').dispatch('click'); a.renderAll(); assert.equal(a.mobileNav.showPage('history'), true); assert.equal(a.mobileNav.currentPage(), 'history'); assert.equal(a.mobileNav.showPage('buy'), true);
  assert.deepEqual(a.rows(), ['one']); assert.equal(a.node('#buyStoreFilter').value, '"スーパー"');
});
test('filtered sharing clearly includes the whole shopping list', async () => {
  const a = app(); a.select('Market'); assert.equal(a.node('#shareButton').textContent, 'Share all stores'); assert.equal(a.node('#buyFilterHint').hidden, false);
  await a.shareCurrent(); const decoded = await a.decodeShare(a.shared().split('#list=')[1]); assert.equal(decoded.items.length, 4); assert.ok(decoded.items.some(i => i.store === 'Drugstore'));
});
test('a selected empty store can still share other stores', async () => { const a = app(); a.select('Quiet'); assert.deepEqual(a.rows(), []); await a.shareCurrent(); assert.ok(a.shared().includes('#list=')); });
test('returning to all stores restores rows and normal share labeling', () => { const a = app(); a.select('Market'); a.select(null); assert.equal(a.rows().length, 4); assert.equal(a.node('#shareButton').textContent, 'Share link'); assert.equal(a.node('#buyFilterHint').hidden, true); });
test('entirely empty list has the global empty state in All stores', () => { const a = app([]); assert.deepEqual(a.rows(), []); assert.match(a.node('#buyList').innerHTML, /Nothing to buy/); assert.doesNotMatch(a.node('#buyList').innerHTML, /show-all-stores/); });
test('filter selection is not persisted or included in backup data', () => { const a = app(); a.select('Market'); a.setItemState('drug', 'low'); assert.equal(a.saved.size, 2); assert.equal(a.saved.get('restock-list:data').includes('buyStoreFilter'), false); assert.equal(app().rows().length, 4); });
test('backup replacement resets filter but invalid import preserves it', async () => { const a = app(); a.select('Market'); await a.importDataFile({ text: async () => 'invalid' }); assert.deepEqual(a.rows(), ['market', 'once']); await a.importDataFile({ text: async () => JSON.stringify({ items: [item('new', 'New store')], history: [] }) }); assert.deepEqual(a.rows(), ['new']); assert.equal(a.node('#buyStoreFilter').value, 'all'); });
test('reset and sample clearing reset store selection', async () => { const a = app(); a.select('Market'); await a.confirm(() => a.node('#resetButton').onclick()); assert.equal(a.node('#buyStoreFilter').value, 'all'); a.select('スーパー'); await a.confirm(() => a.node('#clearSampleTopButton').onclick()); assert.equal(a.node('#buyStoreFilter').value, 'all'); assert.deepEqual(a.rows(), []); });
test('hundreds of stores keep exact filtering', () => { const a = app(Array.from({length: 500}, (_, i) => item(`item${i}`, `Store ${i}`))); a.select('Store 499'); assert.deepEqual(a.rows(), ['item499']); });

test('filtered empty action restores all stores and keeps native selector available', () => {
  const a = app(); a.select('Quiet'); a.node('#buyList').dispatch('click', { closest: selector => selector === '[data-action="show-all-stores"]' ? {} : null });
  assert.equal(a.rows().length, 4); assert.equal(a.node('#buyStoreFilter').value, 'all');
});
test('deleting a selected one-off retains its empty filter and Undo works', async () => {
  const a = app([item('only', 'Solo', 'buy', false), item('other', 'Elsewhere')]); a.select('Solo');
  await a.confirm(() => a.deleteItem(a.getData().items[0])); assert.deepEqual(a.rows(), []); assert.equal(a.node('#buyStoreFilter').value, '"Solo"');
  a.node('#appToastAction').dispatch('click'); assert.deepEqual(a.rows(), ['only']);
});

test('structurally invalid backup leaves data, storage, and the selected filter unchanged', async () => {
  const a = app(); a.select('Market');
  const before = JSON.stringify(a.getData()); const saved = a.saved.get('restock-list:data');
  await a.importDataFile({ text: async () => JSON.stringify({ items: [item('new', 'New store')], history: [{ id: 'bad', at: 'not-a-date' }] }) });
  assert.equal(a.node('#appToastMessage').textContent, 'This JSON could not be imported');
  assert.equal(a.node('#buyStoreFilter').value, '"Market"');
  assert.equal(JSON.stringify(a.getData()), before); assert.equal(a.saved.get('restock-list:data'), saved);
  assert.deepEqual(a.rows(), ['market', 'once']);
});
