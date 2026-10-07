import assert from 'node:assert/strict';
import test from 'node:test';
import { html, app, item } from './helpers/app.mjs';

const backup = name => JSON.stringify({ items: [item(name, 'Market')], history: [], settings: { defaultStore: name, sampleDataVisible: false } });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const selectFile = (a, file) => {
  const input = a.node('#importFile');
  input.files = file ? [file] : [];
  input.value = file ? 'selected.json' : '';
  input.dispatch('change');
};

for (const language of ['ja', 'en']) test(`header names the language target and exact privacy claim in ${language}`, () => {
  const a = app(undefined, { language });
  const check = lang => {
    const button = a.node('#languageButton');
    const label = lang === 'ja' ? '英語に切り替え' : 'Switch to Japanese';
    assert.equal(button.textContent, lang === 'ja' ? 'EN' : 'JA');
    assert.equal(button.getAttribute('aria-label'), label);
    assert.equal(button.title, label);
    assert.equal(a.node('[data-i18n="localBadge"]').textContent, lang === 'ja' ? '完全ローカル処理' : 'Fully local processing');
    assert.equal(a.document.documentElement.lang, lang);
  };
  a.select('Market');
  const data = JSON.stringify(a.getData());
  const saved = a.saved.get('restock-list:data');
  check(language);
  a.node('#languageButton').dispatch('click'); check(language === 'ja' ? 'en' : 'ja');
  a.node('#languageButton').dispatch('click'); check(language);
  assert.equal(a.node('#buyStoreFilter').value, '"Market"');
  assert.equal(JSON.stringify(a.getData()), data);
  assert.equal(a.saved.get('restock-list:data'), saved);
});

test('initialized version comes from the single 1.0.1 patch metadata', () => {
  assert.equal(app().node('#versionBadge').textContent, 'v1.0.1');
});

for (const language of ['ja', 'en']) test(`Help remains localized and opens/closes the native dialog in ${language}`, () => {
  const a = app(undefined, { language });
  const title = language === 'ja' ? '使い方と注意事項' : 'How to use & notes';
  assert.equal(a.node('#helpButton').getAttribute('aria-label'), title);
  assert.equal(a.node('#helpButton').title, title);
  assert.equal(a.node('#helpDialogTitle').textContent, title);
  assert.equal(a.node('#closeHelpButton').getAttribute('aria-label'), language === 'ja' ? '閉じる' : 'Close');
  a.node('#helpButton').onclick(); assert.equal(a.node('#helpDialog').open, true);
  a.node('#closeHelpButton').onclick(); assert.equal(a.node('#helpDialog').open, false);
  assert.match(html, /<dialog id="helpDialog" aria-labelledby="helpDialogTitle">/);
});

test('older delayed import cannot replace a newer completed backup or close its reopened dialog', async () => {
  const a = app(); const older = deferred();
  const pending = a.importDataFile({ text: () => older.promise });
  await a.importDataFile({ text: async () => backup('newer') });
  a.select('Market'); a.node('#manageDialog').showModal();
  const saved = a.saved.get('restock-list:data');
  older.resolve(backup('older')); await pending;
  assert.deepEqual(a.rows(), ['newer']);
  assert.equal(a.saved.get('restock-list:data'), saved);
  assert.equal(a.node('#buyStoreFilter').value, '"Market"');
  assert.equal(a.node('#manageDialog').open, true);
});

for (const outcome of ['success', 'rejection', 'malformed']) test(`superseded ${outcome} leaves the newer purchase Undo available`, async () => {
  const a = app(); const older = deferred();
  const pending = a.importDataFile({ text: () => older.promise });
  await a.importDataFile({ text: async () => backup('newer') });
  a.purchaseItem('newer');
  const saved = a.saved.get('restock-list:data');
  if (outcome === 'rejection') older.reject(Error('old read failed'));
  else older.resolve(outcome === 'success' ? backup('older') : '{');
  await pending;
  assert.equal(a.saved.get('restock-list:data'), saved);
  assert.equal(a.node('#appToastMessage').textContent, 'Marked as purchased');
  assert.equal(a.node('#appToastAction').hidden, false);
  a.node('#appToastAction').dispatch('click');
  assert.deepEqual(a.rows(), ['newer']);
  assert.equal(a.getData().history.length, 0);
});

test('newer failed import still supersedes an older success and preserves the current dataset', async () => {
  const a = app(); a.select('Market'); const older = deferred();
  const pending = a.importDataFile({ text: () => older.promise });
  const data = JSON.stringify(a.getData()); const saved = a.saved.get('restock-list:data');
  await a.importDataFile({ text: async () => '{' });
  older.resolve(backup('older')); await pending;
  assert.equal(JSON.stringify(a.getData()), data);
  assert.equal(a.saved.get('restock-list:data'), saved);
  assert.equal(a.node('#buyStoreFilter').value, '"Market"');
  assert.equal(a.node('#appToastMessage').textContent, 'This JSON could not be imported');
});

for (const outcome of ['success', 'rejection']) test(`older ${outcome} cannot disturb a newer pending picker selection`, async () => {
  const a = app(); const older = deferred(); const newer = deferred();
  const pending = a.importDataFile({ text: () => older.promise });
  selectFile(a, { text: () => newer.promise });
  const input = a.node('#importFile');
  assert.equal(input.value, ''); // Clear synchronously so the same file can be selected again.
  input.value = 'newer-selection.json';
  const data = JSON.stringify(a.getData()); const saved = a.saved.get('restock-list:data');
  const message = a.node('#appToastMessage').textContent;
  if (outcome === 'rejection') older.reject(Error('old read failed')); else older.resolve(backup('older'));
  await pending;
  assert.equal(input.value, 'newer-selection.json');
  assert.equal(JSON.stringify(a.getData()), data);
  assert.equal(a.saved.get('restock-list:data'), saved);
  assert.equal(a.node('#appToastMessage').textContent, message);
  newer.resolve(backup('newer')); await new Promise(setImmediate);
  assert.deepEqual(a.rows(), ['newer']);
});

test('repeated selection of the same file keeps one replacement and cancellation changes nothing', async () => {
  const a = app(); const file = { text: async () => backup('same') };
  selectFile(a, file); await new Promise(setImmediate);
  selectFile(a, file); await new Promise(setImmediate);
  assert.deepEqual(a.rows(), ['same']); assert.equal(a.node('#importFile').value, '');
  const saved = a.saved.get('restock-list:data'); selectFile(a, null);
  assert.equal(a.saved.get('restock-list:data'), saved); assert.deepEqual(a.rows(), ['same']);
});

test('Help explains JSON replacement and latest-file selection in both languages', () => {
  const a = app();
  assert.equal(a.node('[data-i18n="helpNoteImport"]').textContent, 'Importing JSON replaces the current data. If you select another file while reading, only the latest selection can be imported.');
  a.node('#languageButton').dispatch('click');
  assert.equal(a.node('[data-i18n="helpNoteImport"]').textContent, 'JSONの読み込みは現在のデータを置き換えます。読み込み中に別のファイルを選んだ場合は、最後に選んだファイルだけを読み込みます。');
});

for (const language of ['ja', 'en']) test(`backup filename has a localized accessible name in ${language}`, () => {
  const a = app(undefined, { language });
  const input = a.node('#outputFilename');
  const label = lang => lang === 'ja' ? 'バックアップのファイル名' : 'Backup filename';
  assert.equal(input.getAttribute('aria-label'), label(language));
  input.value = 'weekly-restock';
  a.node('#languageButton').dispatch('click');
  assert.equal(input.getAttribute('aria-label'), label(language === 'ja' ? 'en' : 'ja'));
  assert.equal(input.value, 'weekly-restock');
  a.node('#languageButton').dispatch('click');
  assert.equal(input.getAttribute('aria-label'), label(language));
  assert.equal(input.value, 'weekly-restock');
});
