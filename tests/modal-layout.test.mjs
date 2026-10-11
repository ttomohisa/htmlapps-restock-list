import assert from 'node:assert/strict';
import test from 'node:test';
import { html } from './helpers/app.mjs';

const css = html.match(/<style>([\s\S]*?)<\/style>/)[1];
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];

// Structural regression only; real scrolling and native close paths need browser QA.
for (const element of ['html', 'body']) {
  test(`${element} locks background scrolling while a native modal is active`, () => {
    const selector = `${element}:has(dialog:modal)`;
    const rule = rules.find(([, selectors]) => selectors.split(',').some(value => value.trim() === selector));
    assert.ok(rule, `${selector} must follow the native modal state`);
    assert.match(rule[2], /(?:^|;)\s*overflow\s*:\s*hidden\s*(?:;|$)/);
  });
}
