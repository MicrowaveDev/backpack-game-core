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

export function generateShopOffer<Item = unknown>(options: ShopOfferOptions<Item>): ShopOfferResult;
