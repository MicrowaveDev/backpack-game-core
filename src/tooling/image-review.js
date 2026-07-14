import fs from 'node:fs';
import path from 'node:path';
import {
  decodePngBuffer,
  encodeDeterministicPng,
  stitchVerticalImages
} from './image.js';

async function setViewport(page, width, height) {
  if (typeof page.setViewportSize === 'function') await page.setViewportSize({ width, height });
  else await page.setViewport({ width, height, deviceScaleFactor: 1 });
}

export async function captureTallPage({ page, width, height, tileHeight = 1400 }) {
  const tiles = [];
  for (let y = 0; y < height; y += tileHeight) {
    const currentHeight = Math.min(tileHeight, height - y);
    const buffer = await page.screenshot({ clip: { x: 0, y, width, height: currentHeight } });
    const image = decodePngBuffer(buffer, { label: 'browser screenshot' });
    if (image.width !== width || image.height !== currentHeight) {
      throw new Error(`Unexpected screenshot dimensions ${image.width}x${image.height}; expected ${width}x${currentHeight}`);
    }
    tiles.push(image);
  }
  return stitchVerticalImages(tiles);
}

export async function renderHtmlReview({
  launchBrowser,
  html,
  width,
  viewportHeight = 1200,
  tileHeight = 1400,
  outputPath,
  waitUntil = 'load',
  preparePage,
  measureHeight
}) {
  if (typeof launchBrowser !== 'function') throw new Error('launchBrowser is required');
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    try {
      await setViewport(page, width, viewportHeight);
      if (preparePage) await preparePage(page);
      await page.setContent(html, { waitUntil, timeout: 0 });
      const height = measureHeight
        ? await measureHeight(page)
        : await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
      await setViewport(page, width, Math.min(height, tileHeight));
      const image = await captureTallPage({ page, width, height, tileHeight });
      const buffer = encodeDeterministicPng(image);
      if (outputPath) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, buffer);
      }
      return { ...image, buffer, outputPath: outputPath || null };
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}
