import type {
  AssetGachaCatalogAsset,
  AssetGachaPack,
  AssetGachaPityRule
} from './engine.js';
import type { Rng } from '../../shared/rng.js';

export const DEFAULT_ASSET_GACHA_SIMULATION_TRIALS: 10000;
export const DEFAULT_ASSET_GACHA_SIMULATION_MAX_TRIALS: 1000000;

export interface AssetGachaSimulationWarning {
  code: string;
  message: string;
  [key: string]: unknown;
}

export interface AssetGachaSimulationItem {
  assetId: string;
  rarity: string | null;
  dropWeight: number;
  ownedCopies: number;
  copyLimit: number | null;
  copyCapped: boolean;
  expectedProbability: number | null;
  observedProbability: number;
  observedPerRoll: number;
  observedCount: number;
  delta: number | null;
  asset: {
    slot?: unknown;
    targetType?: unknown;
    targetId?: unknown;
    variantId?: unknown;
    name?: unknown;
    price?: unknown;
    currencyCode?: unknown;
  } | null;
}

export interface AssetGachaSimulationRaritySummary {
  rarity: string;
  candidateCount: number;
  expectedProbability: number;
  observedProbability: number;
  observedPerRoll: number;
  observedCount: number;
}

export interface AssetGachaSimulationResult {
  packId: string | undefined;
  source: string;
  seasonId: string | undefined;
  collectionId: string | undefined;
  name: unknown;
  status: string | undefined;
  active: boolean;
  rollPriceCurrencyCode: string | undefined;
  rollPriceAmount: number | undefined;
  rollSize: number | undefined;
  averageItemsPerRoll: number;
  trials: number;
  seed: string | null;
  candidateCount: number;
  weightedCandidateCount: number;
  totalWeight: number;
  duplicatePolicy: {
    enabled: boolean;
    maxCopiesPerAsset: number | null;
  };
  rollable: boolean;
  guarantees: {
    supported: boolean;
    configured: unknown[];
    note: string;
  };
  pity: {
    supported: boolean;
    configured: unknown[];
    simulatedState: readonly AssetGachaPityRule[];
    note: string;
  };
  warnings: AssetGachaSimulationWarning[];
  raritySummary: AssetGachaSimulationRaritySummary[];
  items: AssetGachaSimulationItem[];
}

export function normalizeAssetGachaSimulationTrials(value: unknown, options?: {
  defaultTrials?: number;
  maxTrials?: number;
}): number;

export function hashAssetGachaSimulationSeed(seedInput?: unknown): number;
export function createAssetGachaSimulationRng(seedInput?: unknown): Rng;

export function simulateAssetGachaPackOdds(pack: AssetGachaPack, options?: {
  catalog?: readonly AssetGachaCatalogAsset[];
  odds?: Record<string, unknown>;
  trials?: number;
  seed?: string | null;
  rng?: Rng | null;
  ownedAssetIds?: Iterable<string>;
  ownedCopyCounts?: Map<string, number> | Record<string, number> | null;
  pityState?: readonly AssetGachaPityRule[];
  source?: string;
  defaultTrials?: number;
  maxTrials?: number;
  [key: string]: unknown;
}): AssetGachaSimulationResult;
