import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFriendInviteLink,
  buildTelegramMiniAppLink,
  buildTelegramShareUrl,
  buildWebsiteFriendInviteLink,
  getTelegramStartParam,
  getTelegramWebApp,
  isTelegramMiniAppEnvironment,
  openTelegramLink,
  shareTelegramText
} from '@microwavedev/backpack-game-core/modules/telegram';

test('[telegram/browser] builds Mini App and website invite links', () => {
  assert.equal(buildTelegramMiniAppLink({
    botUsername: '@game_bot',
    miniAppName: 'play',
    startParam: 'ref_friend one'
  }), 'https://t.me/game_bot/play?startapp=ref_friend%20one');
  assert.equal(buildTelegramMiniAppLink({ botUsername: '' }), '');
  assert.equal(buildWebsiteFriendInviteLink({
    friendCode: 'friend one',
    location: { origin: 'https://game.test' }
  }), 'https://game.test/friends?ref=friend+one');
});

test('[telegram/browser] selects Telegram invites only inside a Mini App', () => {
  const webApp = {};
  const win = { Telegram: { WebApp: webApp } };
  assert.equal(getTelegramWebApp(win), webApp);
  assert.equal(isTelegramMiniAppEnvironment(win), true);
  assert.equal(buildFriendInviteLink({
    friendCode: 'abc',
    botUsername: '@game_bot',
    win,
    location: { origin: 'https://game.test' }
  }), 'https://t.me/game_bot/app?startapp=ref_abc');
  assert.equal(buildFriendInviteLink({
    friendCode: 'abc',
    botUsername: '@game_bot',
    win: {},
    location: { origin: 'https://game.test' }
  }), 'https://game.test/friends?ref=abc');
});

test('[telegram/browser] reads parsed start parameters with an init-data fallback', () => {
  assert.equal(getTelegramStartParam({
    initDataUnsafe: { start_param: 'auth-PARSED' },
    initData: 'start_param=auth-RAW'
  }), 'auth-PARSED');
  assert.equal(getTelegramStartParam({
    initDataUnsafe: {},
    initData: 'query_id=test&start_param=auth-RAW'
  }), 'auth-RAW');
  assert.equal(getTelegramStartParam(null), '');
});

test('[telegram/browser] opens Telegram links through the SDK with a browser fallback', () => {
  const telegramLinks = [];
  assert.equal(openTelegramLink('https://t.me/game_bot?start=auth-CODE', {
    win: { Telegram: { WebApp: { openTelegramLink: (url) => telegramLinks.push(url) } } }
  }), 'telegram');
  assert.deepEqual(telegramLinks, ['https://t.me/game_bot?start=auth-CODE']);

  const browserLinks = [];
  assert.equal(openTelegramLink('https://t.me/game_bot?start=auth-CODE', {
    win: { open: (...args) => browserLinks.push(args) }
  }), 'window');
  assert.deepEqual(browserLinks, [[
    'https://t.me/game_bot?start=auth-CODE',
    '_blank',
    'noopener,noreferrer'
  ]]);
  assert.equal(openTelegramLink('', { win: null }), 'none');
});

test('[telegram/browser] shares through Telegram, native share, clipboard, then no-op', async () => {
  const opened = [];
  assert.equal(await shareTelegramText({
    text: 'Join',
    url: 'https://game.test',
    win: {
      Telegram: {
        WebApp: {
          openTelegramLink: (url) => opened.push(url)
        }
      }
    }
  }), 'telegram');
  assert.deepEqual(opened, [buildTelegramShareUrl({
    text: 'Join',
    url: 'https://game.test'
  })]);

  const nativeShares = [];
  assert.equal(await shareTelegramText({
    text: 'Join',
    navigatorRef: { share: async (payload) => nativeShares.push(payload) }
  }), 'native');
  assert.deepEqual(nativeShares, [{ text: 'Join', url: '' }]);

  const copied = [];
  assert.equal(await shareTelegramText({
    text: 'Join',
    url: 'https://game.test',
    navigatorRef: { clipboard: { writeText: async (value) => copied.push(value) } }
  }), 'clipboard');
  assert.deepEqual(copied, ['Join\nhttps://game.test']);
  assert.equal(await shareTelegramText({ win: null, navigatorRef: null }), 'none');
});
