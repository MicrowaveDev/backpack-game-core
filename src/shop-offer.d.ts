import type { Rng } from './rng.js';

export type ItemId = string | number;

export interface ShopOfferOptions<Item = unknown> {
  rng: Rng;
  count: number;
  roundsSinceBag?: number;
  combatItems?: Item[] | readonly Item[];
  bagItems?: Item[] | readonly Item[];
  characterItems?: Item[] | readonly Item[];
  bagBaseChance?: number;
  bagEscalationStep?: number;
  bagPityThreshold?: number;
  characterItemChance?: number;
  getItemId?: (item: Item) => ItemId;
}

export interface ShopOfferResult {
  offer: ItemId[];
  hasBag: boolean;
}

export interface RunShopPurchasePlan {
  ok: boolean;
  reason: string | null;
  artifactId: unknown;
  price: number;
  coinsBefore: number;
  coinsAfter: number;
  shopOffer: unknown[];
  removedOfferIndex?: number;
}

export interface RunShopRefreshPlan {
  ok: boolean;
  reason: string | null;
  refreshCost: number;
  coinsBefore: number;
  coinsAfter: number;
  refreshCount: number;
  roundsSinceBag: number;
  shopOffer: unknown[];
}

export interface RunShopSellPlan {
  ok: boolean;
  reason: string | null;
  price: number;
  sellPrice: number;
  freshThisRound: boolean;
  coinsBefore: number;
  coinsAfter: number;
}

export function generateShopOffer<Item = unknown>(options: ShopOfferOptions<Item>): ShopOfferResult;
export function createRunShopPurchasePlan(options?: {
  coins?: unknown;
  offer?: unknown[];
  artifactId?: unknown;
  price?: unknown;
}): RunShopPurchasePlan;
export function createRunShopRefreshPlan(options?: {
  coins?: unknown;
  refreshCost?: unknown;
  refreshCount?: unknown;
  currentRoundsSinceBag?: unknown;
  generatedOffer?: unknown[];
  hasBag?: boolean;
}): RunShopRefreshPlan;
export function createRunShopSellPlan(options?: {
  coins?: unknown;
  price?: unknown;
  purchasedRound?: unknown;
  currentRound?: unknown;
}): RunShopSellPlan;
