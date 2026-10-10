import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSocialPreviewHtml, renderSocialPreview, runSocialPreview } from '../src/tooling/social-preview.js';
import { buildSocialMetadata, injectSocialMetadata, buildCrawlerDocuments } from '../src/tooling/social-metadata.js';

test('metadata escapes copy and binds crawler documents to the configured public URL', () => {
  const config = { publicUrl: 'https://game.example/', siteName: 'Example', title: '<Game>',
    description: 'A "game" & battles', imagePath: '/cover.jpg', imageAlt: 'Knight & mage' };
  const html = buildSocialMetadata(config);
  assert.match(html, /&lt;Game&gt;/);
  assert.match(html, /&quot;game&quot; &amp; battles/);
  assert.match(html, /content="https:\/\/game.example\/cover.jpg"/);
  assert.match(html, /og:image:height/);
  assert.match(html, /twitter:image:alt/);
  const template = '<head><!-- social-metadata:start -->old<!-- social-metadata:end --></head>';
  const injected = injectSocialMetadata(template, config);
  assert.equal(injectSocialMetadata(injected, config), injected);
  assert.equal(injected.includes('old'), false);
  assert.match(buildCrawlerDocuments(config.publicUrl).robots, /Sitemap: https:\/\/game.example\/sitemap.xml/);
  assert.throws(() => buildSocialMetadata({ ...config, publicUrl: 'javascript:alert(1)' }));
  assert.throws(() => injectSocialMetadata('<head></head>', config));
});

test('preview validates options, escapes text and closes injected browser on failure', async () => {
  const root = mkdtempSync(join(tmpdir(), 'social-preview-'));
  try {
    const base = join(root, 'base.png');
    writeFileSync(base, Buffer.from('placeholder'));
    const options = { base, out: join(root, 'card.jpg'), title: '<Game>', subtitle: 'a & b',
      eyebrow: '<Strategy>', layout: 'middle-bottom', style: 'storybook' };
    const html = buildSocialPreviewHtml(options);
    assert.match(html, /&lt;Game&gt;/);
    assert.match(html, /&lt;Strategy&gt;/);
    assert.throws(() => buildSocialPreviewHtml({ ...options, style: 'invalid' }));
    let closed = false;
    let shot;
    const page = { setViewportSize: async (size) => assert.deepEqual(size, { width: 1200, height: 630 }),
      setContent: async () => {}, evaluate: async () => {}, screenshot: async (args) => { shot = args; } };
    const launchBrowser = async () => ({ newPage: async () => page, close: async () => { closed = true; } });
    await renderSocialPreview({ ...options, launchBrowser });
    assert.equal(shot.type, 'jpeg');
    assert.equal(shot.quality, 85);
    assert.equal(closed, true);
    closed = false;
    page.screenshot = async () => { throw new Error('capture failed'); };
    await assert.rejects(renderSocialPreview({ ...options, launchBrowser }), /capture failed/);
    assert.equal(closed, true);
    await assert.rejects(runSocialPreview(['--production', '--all-styles'], {
      ...options, repoRoot: root, productionOut: options.out, launchBrowser
    }), /cannot be combined/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
