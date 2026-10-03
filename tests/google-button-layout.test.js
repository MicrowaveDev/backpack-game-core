import test from 'node:test';
import assert from 'node:assert/strict';
import { GoogleIdentityButton } from '../src/vue/components/GoogleIdentityButton.js';

test('Google button respects SDK width limits and rerenders for resize and locale changes', () => {
  const renders = [];
  const context = {
    $el: { clientWidth: 600 }, $refs: { button: { replaceChildren() {} } },
    identity: { renderButton: (_element, options) => renders.push(options) },
    locale: 'ru', shape: 'pill', text: 'signin_with'
  };
  const render = () => GoogleIdentityButton.methods.renderIdentityButton.call(context);
  render();
  assert.equal(renders[0].width, 400);
  assert.equal(renders[0].shape, 'pill');
  render();
  assert.equal(renders.length, 1);
  context.$el.clientWidth = 313;
  render();
  assert.equal(renders[1].width, 313);
  context.locale = 'en';
  render();
  assert.equal(renders[2].locale, 'en');
  context.$el.clientWidth = 180;
  render();
  assert.equal(renders[3].width, 240);
});

test('Google button disconnects its resize observer on unmount', () => {
  let disconnected = false;
  const context = { resizeObserver: { disconnect() { disconnected = true; } }, identity: {} };
  GoogleIdentityButton.beforeUnmount.call(context);
  assert.equal(disconnected, true);
  assert.equal(context.identity, null);
});
