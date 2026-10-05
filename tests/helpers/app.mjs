import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

export const html = readFileSync(process.env.RESTOCK_HTML || new URL('../../src/index.template.html', import.meta.url), 'utf8');
const runtime = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
// Run the real application in a small DOM adapter; browser layout/keyboard QA is separate.
export function app(items = fixtures(), options = {}) {
  const nodes = new Map(), textareas = [], writes = [], timers = []; let shared = '', fallbackCalls = 0, document;
  class Element {
    constructor() { this.value = ''; this.style = {}; this.disabled = false; this.innerHTML = ''; this.textContent = ''; this.dataset = {}; this.hidden = false; this.events = {}; this.open = false; this.isConnected = true; this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false }; }
    get disabled() { return this._disabled; }
    set disabled(value) { this._disabled=value; if(value && document?.activeElement === this) document.activeElement=document.body; }
    addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
    dispatch(type, target = this) { for (const fn of this.events[type] || []) fn({ target, preventDefault() {} }); }
    setAttribute() {} removeAttribute() {} querySelector() { return null; } focus() { if(!this.disabled) document.activeElement = this; } select() { if(options.selectThrows) throw Error('selection failed'); this.focus(); } remove() { textareas.splice(textareas.indexOf(this), 1); this.isConnected = false; if(document.activeElement === this) document.activeElement = document.body; } showModal() { this.open = true; } close() { this.open = false; }
  }
  const node = selector => { if (!nodes.has(selector)) nodes.set(selector, new Element()); return nodes.get(selector); };
  const tabs = ['buy', 'regular', 'history'].map(key => { const button = new Element(); button.dataset = { mobileKey: key, mobilePageTarget: `${key}Page` }; return button; });
  const saved = new Map([['restock-list:language', 'en'], ['restock-list:data', JSON.stringify({ items, history: [], settings: { defaultStore: '', sampleDataVisible: false } })]]);
  for (const [id, value] of Object.entries({ 'app-config': { slug: 'restock-list', version: '1.0.0', name: 'Restock List', nameJa: 'Restock List' }, 'build-manifest': {}, 'embedded-asset-bundle': {} })) node(`#${id}`).textContent = JSON.stringify(value);

  const translated = [...html.matchAll(/<[^>]+id="([^"]+)"[^>]+data-i18n="([^"]+)"[^>]*>/g)].map(([, id, key]) => { const el=node(`#${id}`); el.dataset.i18n=key; return el; });
  document = { querySelector: node, querySelectorAll: selector => selector === '.app-mobile-bottom-item' ? tabs : selector === '[data-i18n]' ? translated : [], getElementById: id => node(`#${id}`), addEventListener() {}, documentElement: {}, title: '', activeElement: null,
    createElement() { if(options.createThrows) throw Error('creation failed'); return new Element(); },
    body: { appendChild(el) { textareas.push(el); } },
    execCommand: options.execCommand === 'missing' ? undefined : () => { fallbackCalls++; if(options.onFallback) options.onFallback(document); if(options.execCommand === 'throw') throw Error('copy unsupported'); const ok=options.execCommand !== false; if(ok) shared=textareas.at(-1).value; return ok; }
  };
  const navigator = { language: 'en', clipboard: options.clipboard === 'missing' ? undefined : { writeText(value) { writes.push(value); if(options.clipboard === 'throw') throw Error('clipboard unavailable'); if(options.clipboard === 'reject') return Promise.reject(Error('clipboard rejected')); if(typeof options.clipboard === 'function') return options.clipboard(value); shared=value; return Promise.resolve(); } } };
  if(options.share) navigator.share=options.share;
  const context = vm.createContext({ document, window: { addEventListener() {} }, HTMLElement: Element, localStorage: { getItem: key => saved.get(key) || null, setItem: (key, value) => saved.set(key, value) }, navigator, location: { protocol: options.protocol || 'https:', href: 'https://example.test/', hash: '' }, history: { replaceState() {} }, matchMedia: () => ({ matches: false }), crypto: webcrypto, setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, requestAnimationFrame() {}, TextEncoder, TextDecoder, Blob, Response, URL, Uint8Array, btoa, atob });
  const expose = `globalThis.app = { renderAll, purchaseItem, deleteItem, importDataFile, shareCurrent, decodeShare, setItemState, mobileNav, getData: () => data };`;
  vm.runInContext(runtime.replace(/\}\)\(\);\s*$/, `${expose}\n})();`), context);
  return { ...context.app, node, saved, document, textareas, writes, timers, fallbackCalls: () => fallbackCalls, shared: () => shared, select(store) { node('#buyStoreFilter').value = store === null ? 'all' : JSON.stringify(store); node('#buyStoreFilter').dispatch('change'); }, rows() { return [...node('#buyList').innerHTML.matchAll(/data-item-id="([^"]+)"/g)].map(match => match[1]); }, async confirm(action) { const pending = action(); node('#appConfirmOk').onclick(); await pending; } };
}
export function item(id, store, status = 'low', regular = true) { return { id, name: id, store, status, regular, category: '', createdAt: 1 }; }
export function fixtures() { return [item('market', 'Market'), item('drug', 'Drugstore', 'out'), item('none', ''), item('once', 'Market', 'buy', false), item('stock', 'Quiet', 'stocked')]; }

