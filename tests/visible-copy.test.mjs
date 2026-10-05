import assert from 'node:assert/strict';
import test from 'node:test';
import { html, app, item } from './helpers/app.mjs';

const copy = a => a.node('#copyVisibleButton').onclick();
const message = a => a.node('#appToastMessage').textContent;

test('copy is a localized native button next to the store selector', () => {
  assert.match(html, /id="buyStoreFilter"[\s\S]*?<button[^>]+id="copyVisibleButton"[^>]+type="button"[^>]+data-i18n="copyVisible"/);
  const a=app(); assert.equal(a.node('#copyVisibleButton').textContent, 'Copy visible list');
  a.node('#languageButton').dispatch('click'); assert.equal(a.node('#copyVisibleButton').textContent, '表示中をコピー');
});
test('copy all visible low, out and one-off items in store and item display order', async () => {
  const a=app(); await copy(a);
  assert.equal(a.shared(), 'Market\n- market\n- once\n\nDrugstore\n- drug\n\nUnassigned\n- none');
  assert.equal(message(a), 'Visible list copied'); assert.equal(a.fallbackCalls(), 0);
});
for(const [store, expected] of [['Market','Market\n- market\n- once'],['','Unassigned\n- none']]) test(`copy exact ${JSON.stringify(store)} filter`, async () => {
  const a=app(); a.select(store); const before=JSON.stringify(a.getData()), saved=JSON.stringify([...a.saved]);
  await copy(a); assert.equal(a.shared(), expected); assert.equal(JSON.stringify(a.getData()),before); assert.equal(JSON.stringify([...a.saved]),saved);
});
test('copy is disabled for both empty lists and a stocked-only store', async () => {
  for(const a of [app([]), app()]) { if(a.getData().items.length) a.select('Quiet'); assert.equal(a.node('#copyVisibleButton').disabled,true); await copy(a); assert.equal(a.writes.length,0); assert.equal(a.fallbackCalls(),0); }
});
for(const regular of [true,false]) test(`last ${regular?'regular':'one-off'} purchase disables copying and Undo enables it`, async () => {
  const a=app([item('last','Solo',regular?'low':'buy',regular),item('other','Elsewhere')]); a.select('Solo');
  assert.equal(a.node('#copyVisibleButton').disabled,false); a.purchaseItem('last'); assert.equal(a.node('#copyVisibleButton').disabled,true);
  a.node('#appToastAction').dispatch('click'); assert.equal(a.node('#copyVisibleButton').disabled,false); await copy(a); assert.equal(a.shared(),'Solo\n- last');
});
test('copy uses translated item and store display names in the current language', async () => {
  const a=app([{...item('milk','スーパー'),name:'牛乳',nameJa:'牛乳',nameEn:'Milk'}]); await copy(a); assert.equal(a.shared(),'Supermarket\n- Milk');
  a.node('#languageButton').dispatch('click'); await copy(a); assert.equal(a.shared(),'スーパー\n- 牛乳'); assert.equal(message(a),'表示中のリストをコピーしました');
});
test('translated-label collisions remain separate raw-store groups', async () => {
  const a=app([item('first','スーパー'),item('second','Supermarket'),item('third','スーパー')]); await copy(a);
  assert.equal(a.shared(),'Supermarket\n- first\n- third\n\nSupermarket\n- second'); a.select('スーパー'); await copy(a); assert.equal(a.shared(),'Supermarket\n- first\n- third');
});
test('copy preserves Unicode, quotes and HTML-looking names as plain text', async () => {
  const a=app([{...item('odd','<shop> & "店"'),name:'牛乳 🥛 & <b>"oat"</b>'}]); await copy(a);
  assert.equal(a.shared(),'<shop> & "店"\n- 牛乳 🥛 & <b>"oat"</b>'); assert.equal(a.textareas.length,0);
});
test('delayed clipboard rejection falls back to the click-time snapshot after state and language changes', async () => {
  let reject; const a=app([{...item('milk','スーパー'),name:'牛乳',nameJa:'牛乳',nameEn:'Milk'},item('else','Elsewhere')],{clipboard:()=>new Promise((_,r)=>{reject=r;})});
  a.select('スーパー'); const pending=copy(a); assert.deepEqual(a.writes,['Supermarket\n- Milk']);
  a.select('Elsewhere'); a.node('#languageButton').dispatch('click'); a.getData().items[0].nameEn='Changed'; a.purchaseItem('milk'); reject(Error('late failure')); await pending;
  assert.equal(a.shared(),'Supermarket\n- Milk'); assert.equal(a.node('#buyStoreFilter').value,'"Elsewhere"');
});
test('local file copying works without native sharing or a URL', async () => {
  let calls=0; const a=app(undefined,{protocol:'file:',share:()=>{calls++;}}); await copy(a); assert.equal(calls,0); assert.equal(a.shared().includes('#list='),false); assert.equal(message(a),'Visible list copied');
});
for(const action of ['copy','share']) for(const clipboard of ['reject','throw','missing']) for(const fallback of [true,false,'throw','missing']) test(`${action}: clipboard ${clipboard}, fallback ${fallback} reports truthfully and cleans up`, async () => {
  const a=app(undefined,{clipboard,execCommand:fallback}), origin=a.node('#buyStoreFilter'); origin.focus();
  await assert.doesNotReject(()=>action==='copy'?copy(a):a.shareCurrent());
  const expected=action==='copy'?(fallback===true?'Visible list copied':'Could not copy the visible list'):(fallback===true?'Share link copied':'Could not copy the share link');
  assert.equal(message(a),expected); assert.equal(a.textareas.length,0); assert.equal(a.document.activeElement,origin);
});
for(const failure of ['createThrows','selectThrows']) test(`fallback ${failure} is handled without leaking nodes`, async () => {
  const a=app(undefined,{clipboard:'missing',[failure]:true}); await assert.doesNotReject(()=>copy(a)); assert.equal(message(a),'Could not copy the visible list'); assert.equal(a.textareas.length,0);
});
test('fallback does not steal a new focus target chosen during clipboard work', async () => {
  let a; a=app(undefined,{clipboard:'missing',onFallback:()=>a.node('#quickAddName').focus()}); a.node('#buyStoreFilter').focus(); await copy(a); assert.equal(a.document.activeElement,a.node('#quickAddName'));
});
test('fallback failure is localized in Japanese', async () => {
  const a=app(undefined,{clipboard:'missing',execCommand:'throw'}); a.node('#languageButton').dispatch('click'); await copy(a); assert.equal(message(a),'表示中のリストをコピーできませんでした');
});
test('link sharing preserves all-store payload with the corrected fallback', async () => {
  const a=app(undefined,{clipboard:'missing'}); a.select('Market'); await a.shareCurrent(); const decoded=await a.decodeShare(a.shared().split('#list=')[1]);
  assert.deepEqual(Array.from(decoded.items,i=>i.name),['market','drug','none','once']); assert.equal(message(a),'Share link copied');
});
test('successful native share and user cancellation do not copy anything', async () => {
  for(const cancelled of [false,true]) { const a=app(undefined,{share:async()=>{if(cancelled)throw Object.assign(Error('cancel'),{name:'AbortError'});}}); await a.shareCurrent(); assert.equal(a.writes.length,0); assert.equal(a.fallbackCalls(),0); }
});

test('delayed copy feedback preserves a newer purchase Undo toast', async () => {
  let resolve; const a=app(undefined,{clipboard:()=>new Promise(r=>{resolve=r;})});
  const pending=copy(a); a.purchaseItem('market'); resolve(); await pending;
  assert.equal(message(a),'Marked as purchased'); assert.equal(a.node('#appToastAction').hidden,false);
  a.node('#appToastAction').dispatch('click'); assert.equal(a.getData().items.find(i=>i.id==='market').status,'low');
});

test('pending copy is serialized across filter and language changes', async () => {
  let resolve; const a=app(undefined,{clipboard:()=>new Promise(r=>{resolve=r;})}); a.select('Market');
  const pending=copy(a); assert.equal(a.node('#copyVisibleButton').disabled,true);
  a.select('Drugstore'); a.node('#languageButton').dispatch('click'); assert.equal(a.node('#copyVisibleButton').disabled,true);
  await copy(a); assert.equal(a.writes.length,1); resolve(); await pending; assert.equal(a.node('#copyVisibleButton').disabled,false);
  assert.equal(a.writes[0],'Market\n- market\n- once');
});
test('expiry of an older toast does not suppress copy feedback', async () => {
  let resolve; const a=app(undefined,{clipboard:()=>new Promise(r=>{resolve=r;})}); a.purchaseItem('market');
  const pending=copy(a); a.timers.at(-1)(); resolve(); await pending; assert.equal(message(a),'Visible list copied');
});

for(const clipboard of ['success','missing']) test(`keyboard copy restores its trigger after pending disabling (${clipboard})`, async () => {
  const a=app(undefined,{clipboard}), trigger=a.node('#copyVisibleButton'); trigger.focus(); await copy(a);
  assert.equal(trigger.disabled,false); assert.equal(a.document.activeElement,trigger);
});
test('delayed copy does not restore its trigger over a newly focused control', async () => {
  let resolve; const a=app(undefined,{clipboard:()=>new Promise(r=>{resolve=r;})}); a.node('#copyVisibleButton').focus();
  const pending=copy(a); a.node('#quickAddName').focus(); resolve(); await pending; assert.equal(a.document.activeElement,a.node('#quickAddName'));
});
