import fs from 'node:fs';
import { alphaStats } from './image.js';

function percent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function validateImagePolicy(image, policy = {}) {
  const issues = [];
  const expectedWidth = policy.width;
  const expectedHeight = policy.height;
  if (expectedWidth != null && expectedHeight != null
    && (image.width !== expectedWidth || image.height !== expectedHeight)) {
    issues.push({ code: 'dimensions', actual: { width: image.width, height: image.height }, expected: { width: expectedWidth, height: expectedHeight }, message: `expected ${expectedWidth}x${expectedHeight}, got ${image.width}x${image.height}` });
  }
  const rect = policy.rect || { x: 0, y: 0, width: image.width, height: image.height };
  const stats = alphaStats(image, rect, policy.alphaThreshold ?? 24);
  const checks = [
    ['minCoverage', stats.coverage, 'coverage'],
    ['maxCoverage', stats.coverage, 'coverage'],
    ['minBboxFillX', stats.bboxFillX, 'bbox-fill-x'],
    ['maxBboxFillX', stats.bboxFillX, 'bbox-fill-x'],
    ['minBboxFillY', stats.bboxFillY, 'bbox-fill-y'],
    ['maxBboxFillY', stats.bboxFillY, 'bbox-fill-y']
  ];
  for (const [key, actual, code] of checks) {
    const limit = policy[key];
    if (limit == null) continue;
    const isMinimum = key.startsWith('min');
    if ((isMinimum && actual < limit) || (!isMinimum && actual > limit)) {
      issues.push({ code, policyKey: key, actual, expected: limit, message: `${code} ${percent(actual, 1)} is ${isMinimum ? 'below' : 'above'} ${percent(limit)}` });
    }
  }
  if (policy.minMargin != null) {
    const margins = [stats.marginLeft, stats.marginRight, stats.marginTop, stats.marginBottom];
    if (Math.min(...margins) < policy.minMargin) {
      issues.push({ code: 'margin', actual: Math.min(...margins), expected: policy.minMargin, margins: { left: stats.marginLeft, right: stats.marginRight, top: stats.marginTop, bottom: stats.marginBottom }, message: `minimum transparent margin ${Math.min(...margins)}px is below ${policy.minMargin}px` });
    }
  }
  return { issues, stats };
}

export function validateOutputFreshness(outputPath, sourcePaths = []) {
  if (!fs.existsSync(outputPath)) return [];
  const outputMtime = fs.statSync(outputPath).mtimeMs;
  return sourcePaths
    .filter((sourcePath) => fs.existsSync(sourcePath) && fs.statSync(sourcePath).mtimeMs > outputMtime)
    .map((sourcePath) => ({ code: 'stale', sourcePath, outputPath, message: `${sourcePath} is newer than ${outputPath}` }));
}
