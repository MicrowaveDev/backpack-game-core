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

export async function runImageReview({
  launchBrowser,
  html,
  width,
  viewportHeight = 1200,
  waitUntil = 'load',
  validatePage,
  validateOnly = false,
  outputPath,
  tempPathFor = (value) => `${value}.tmp.png`,
  fileHash,
  allowUnchanged = false,
  unchangedError,
  captureOutput = ({ page, tempPath, width: captureWidth, height }) => page.screenshot({ path: tempPath, clip: { x: 0, y: 0, width: captureWidth, height } })
}) {
  if (typeof launchBrowser !== 'function') throw new Error('launchBrowser is required');
  if (!validateOnly && (!outputPath || typeof fileHash !== 'function')) throw new Error('outputPath and fileHash are required when capturing output');
  const browser = await launchBrowser();
  let tempPath = null;
  try {
    const page = await browser.newPage();
    try {
      await setViewport(page, width, viewportHeight);
      await page.setContent(html, { waitUntil });
      const height = await page.evaluate(() => Math.ceil(document.documentElement.scrollHeight));
      await setViewport(page, width, height);
      if (validatePage) await validatePage(page);
      if (validateOnly) return { validateOnly: true, height };
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      const previousHash = fs.existsSync(outputPath) ? fileHash(outputPath) : null;
      tempPath = tempPathFor(outputPath);
      await captureOutput({ page, tempPath, width, height });
      const nextHash = fileHash(tempPath);
      if (previousHash && previousHash === nextHash && !allowUnchanged) {
        throw new Error(typeof unchangedError === 'function' ? unchangedError({ outputPath, previousHash, nextHash }) : 'image review output is unchanged');
      }
      fs.renameSync(tempPath, outputPath);
      tempPath = null;
      return { validateOnly: false, height, previousHash, nextHash, unchanged: previousHash === nextHash, outputPath };
    } finally {
      await page.close();
    }
  } finally {
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    await browser.close();
  }
}
