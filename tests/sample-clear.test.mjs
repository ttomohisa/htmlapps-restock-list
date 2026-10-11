import assert from 'node:assert/strict';
import test from 'node:test';
import { app } from './helpers/app.mjs';

const snapshot = value => JSON.parse(JSON.stringify(value));
const clearSample = a => a.confirm(() => a.node('#clearSampleTopButton').onclick());

function addRegular(a, name = 'Synthetic rice 合成') {
  for (const [id, value] of Object.entries({ editItemId: '', itemName: name, itemCategory: 'Synthetic category', itemStore: 'Synthetic shop', itemRegular: 'yes', itemState: 'low' })) a.node(`#${id}`).value = value;
  a.node('#itemForm').dispatch('submit');
  return a.getData().items.at(-1);
}

test('Clear sample keeps user-created regular items and their actual purchase history', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  const userItem = addRegular(a);
  a.purchaseItem(userItem.id);
  const expectedItem = snapshot(userItem);
  const expectedHistory = snapshot(a.getData().history.at(-1));
  assert.equal(a.getData().items.length, 9);
  assert.equal(a.getData().history.length, 13);
  assert.equal(a.node('#sampleDataBanner').hidden, false);
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData().items), [expectedItem]);
  assert.deepEqual(snapshot(a.getData().history), [expectedHistory]);
  assert.equal(a.getData().settings.defaultStore, 'Synthetic shop');
  assert.equal(a.getData().settings.sampleDataVisible, false);
  assert.equal(a.node('#sampleDataBanner').hidden, true);
  assert.deepEqual(JSON.parse(a.saved.get('restock-list:data')), snapshot(a.getData()));
  const reloaded = app(undefined, { data: JSON.parse(a.saved.get('restock-list:data')) });
  assert.deepEqual(snapshot(reloaded.getData()), snapshot(a.getData()));
  assert.equal(reloaded.node('#sampleDataBanner').hidden, true);
});

test('Clear sample preserves edited seed items, actual seed purchases, and same-name user items', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  a.purchaseItem('milk');
  addRegular(a, '牛乳');
  for (const [id, value] of Object.entries({ editItemId: 'eggs', itemName: 'My eggs', itemCategory: 'My category', itemStore: 'My store', itemRegular: 'yes', itemState: 'out' })) a.node(`#${id}`).value = value;
  a.node('#itemForm').dispatch('submit');
  const expectedItems = snapshot(a.getData().items.filter(row => ['milk', 'eggs'].includes(row.id) || row.name === '牛乳' && row.id !== 'milk'));
  const expectedHistory = snapshot(a.getData().history.filter(row => !/^h\d+$/.test(row.id)));
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData().items), expectedItems);
  assert.deepEqual(snapshot(a.getData().history), expectedHistory);
});

test('Clear sample preserves imported fixed-ID collisions that differ from bundled content', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  const data = snapshot(a.getData());
  data.items.find(row => row.id === 'milk').name = 'User milk';
  data.history.find(row => row.id === 'h1').store = 'User shop';
  await a.importDataFile({ text: async () => JSON.stringify(data) });
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData().items), [data.items[0]]);
  assert.deepEqual(snapshot(a.getData().history), [data.history[0]]);
});

test('cancelling Clear sample preserves data, storage, banner, and the selected store', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  addRegular(a);
  a.select('Synthetic shop');
  const before = snapshot(a.getData());
  const saved = a.saved.get('restock-list:data');
  const pending = a.node('#clearSampleTopButton').onclick();
  a.node('#appConfirmCancel').onclick();
  await pending;
  assert.deepEqual(snapshot(a.getData()), before);
  assert.equal(a.saved.get('restock-list:data'), saved);
  assert.equal(a.node('#sampleDataBanner').hidden, false);
  assert.equal(a.node('#buyStoreFilter').value, '"Synthetic shop"');
});

test('Clear sample is harmless without an active sample banner and after repeated clearing', async () => {
  const a = app();
  const before = snapshot(a.getData());
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData()), before);
  await a.confirm(() => a.node('#resetButton').onclick());
  addRegular(a);
  await clearSample(a);
  const after = snapshot(a.getData());
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData()), after);
});

test('legacy missing settings use the existing default while incomplete seed identities are kept', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  const data = snapshot(a.getData());
  delete data.settings;
  delete data.items[0].nameEn;
  delete data.history[0].store;
  await a.importDataFile({ text: async () => JSON.stringify(data) });
  assert.equal(a.getData().settings.sampleDataVisible, true);
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData().items), [data.items[0]]);
  assert.deepEqual(snapshot(a.getData().history), [data.history[0]]);
});

test('Clear sample confirmation cannot target a replacement dataset imported while it is open', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  const pending = a.node('#clearSampleTopButton').onclick();
  const imported = snapshot(a.getData());
  imported.settings.defaultStore = 'New backup';
  await a.importDataFile({ text: async () => JSON.stringify(imported) });
  const saved = a.saved.get('restock-list:data');
  a.node('#appConfirmOk').onclick();
  await pending;
  assert.deepEqual(snapshot(a.getData()), imported);
  assert.equal(a.saved.get('restock-list:data'), saved);
});

test('unknown extra fields and missing timestamps keep otherwise matching imported records', async () => {
  const a = app();
  await a.confirm(() => a.node('#resetButton').onclick());
  const data = snapshot(a.getData());
  data.items[0].note = 'User information';
  delete data.items[1].createdAt;
  data.history[0].note = 'User information';
  // The current date-rendering boundary accepts null as the epoch. It remains
  // ambiguous input rather than a recognizable numeric seed timestamp.
  data.history[1].at = null;
  await a.importDataFile({ text: async () => JSON.stringify(data) });
  assert.deepEqual(snapshot(a.getData().items), data.items);
  await clearSample(a);
  assert.deepEqual(snapshot(a.getData().items), data.items.slice(0, 2));
  assert.deepEqual(snapshot(a.getData().history), data.history.slice(0, 2));
});
