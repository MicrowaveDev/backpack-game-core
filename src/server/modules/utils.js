import crypto from 'node:crypto';
import { createSeededRng } from '../../shared/rng.js';

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix = 'id') {
  const normalizedPrefix = String(prefix || 'id').trim() || 'id';
  return `${normalizedPrefix}_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function createShortCode(length = 8) {
  const normalizedLength = Math.max(1, Number(length) || 8);
  return crypto.randomBytes(normalizedLength).toString('hex').slice(0, normalizedLength);
}

export function createSessionKey({ prefix = 'sess', bytes = 24 } = {}) {
  const normalizedPrefix = String(prefix || 'sess').trim() || 'sess';
  const normalizedBytes = Math.max(1, Number(bytes) || 24);
  return `${normalizedPrefix}_${crypto.randomBytes(normalizedBytes).toString('hex')}`;
}

export function normalizeLanguage(value, options = {}) {
  const {
    fallback = 'en',
    supportedLanguages = ['en', 'ru']
  } = typeof options === 'string' ? { fallback: options } : options;
  if (!value) {
    return fallback;
  }
  const normalized = String(value).trim().toLowerCase();
  const supported = supportedLanguages.map((language) => String(language).trim().toLowerCase()).filter(Boolean);
  return supported.find((language) => normalized === language || normalized.startsWith(`${language}-`)) || fallback;
}

export function startOfUtcDay(input = new Date()) {
  const day = new Date(input);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

export function nextUtcReset(input = new Date()) {
  const next = startOfUtcDay(input);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

export function dayKey(input = new Date()) {
  return startOfUtcDay(input).toISOString().slice(0, 10);
}

export function parseJson(text, fallback = null) {
  if (!text) {
    return fallback;
  }
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function hashToSeed(input) {
  const digest = crypto.createHash('sha256').update(String(input)).digest();
  return digest.readUInt32LE(0);
}

export function createRng(seedInput) {
  return createSeededRng(hashToSeed(seedInput));
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function expectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function kFactor(rating, ratedBattles, mode = 'standard') {
  if (mode === 'solo_run') {
    if (ratedBattles < 30) return 16;
    if (rating > 1600) return 8;
    return 10;
  }
  if (rating > 1600) return 16;
  if (ratedBattles < 30) return 40;
  return 24;
}

export const DEFAULT_CHARACTER_XP_LEVEL_CURVE = [
  100, 200, 300,
  350, 520, 690, 860, 1030,
  1200, 1460, 1720, 1980, 2240,
  2500, 2800, 3100, 3400, 3700,
  4000
];

export const CHARACTER_XP_LEVEL_CURVE = DEFAULT_CHARACTER_XP_LEVEL_CURVE;

export function computeProgressLevel(progress, {
  curve = DEFAULT_CHARACTER_XP_LEVEL_CURVE
} = {}) {
  const amount = Number(progress || 0);
  const thresholds = Array.isArray(curve) ? curve : DEFAULT_CHARACTER_XP_LEVEL_CURVE;
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) {
    if (amount >= thresholds[i]) {
      level = i + 2;
    } else {
      break;
    }
  }
  const maxLevel = thresholds.length + 1;
  if (level >= maxLevel) {
    return { level: maxLevel, current: amount - thresholds[thresholds.length - 1], next: null };
  }
  const currentThreshold = level >= 2 ? thresholds[level - 2] : 0;
  const nextThreshold = thresholds[level - 1];
  return {
    level,
    current: amount - currentThreshold,
    next: nextThreshold - currentThreshold
  };
}

export function computeCharacterLevel(characterXp, options = {}) {
  return computeProgressLevel(characterXp, options);
}

export function currencyFields(amount, {
  primaryField = 'runCurrency',
  aliasFields = ['runCoins'],
  legacyField = 'coins'
} = {}) {
  const value = Number(amount || 0);
  return Object.fromEntries(
    [legacyField, primaryField, ...aliasFields]
      .filter((field) => typeof field === 'string' && field.trim())
      .map((field) => [field, value])
  );
}

export function runCurrencyFields(amount, options = {}) {
  return currencyFields(amount, options);
}
