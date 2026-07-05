import type {
  AssetGachaCatalogAsset,
  AssetGachaPack
} from '../../asset-gacha.js';
import type {
  AssetGachaSimulationResult
} from './simulation.js';

export interface AssetGachaSimulationErrorFactory {
  (message: string, statusCode?: number, details?: Record<string, unknown>): Error;
}

export interface AssetGachaSimulationServiceOptions {
  getStaticPack?: ((packId: string) => AssetGachaPack | null | undefined) | null;
  getStaticCatalog?: (() => readonly AssetGachaCatalogAsset[]) | null;
  getStaticPackOdds?: ((
    pack: AssetGachaPack,
    context: { packId: string; catalog: readonly AssetGachaCatalogAsset[] }
  ) => Record<string, unknown>) | null;
  getRuntimePack?: ((packId: string) => Promise<AssetGachaPack | null | undefined> | AssetGachaPack | null | undefined) | null;
  getRuntimeCatalog?: ((
    context: { planAssetVisibility: string; pack: AssetGachaPack }
  ) => Promise<readonly AssetGachaCatalogAsset[]> | readonly AssetGachaCatalogAsset[]) | null;
  shapeRuntimePackOdds?: ((
    pack: AssetGachaPack,
    context: {
      includeAssets: boolean;
      catalog: readonly AssetGachaCatalogAsset[];
      planAssetVisibility: string;
    }
  ) => Promise<Record<string, unknown>> | Record<string, unknown>) | null;
  simulate?: (pack: AssetGachaPack, options?: Record<string, unknown>) => AssetGachaSimulationResult;
  createError?: AssetGachaSimulationErrorFactory;
  maxTrials?: number;
}

export interface AssetGachaSimulationRunOptions {
  catalog?: readonly AssetGachaCatalogAsset[];
  odds?: Record<string, unknown>;
  source?: string;
  [key: string]: unknown;
}

export interface AssetGachaRuntimeSimulationRunOptions {
  planAssetVisibility?: string;
  [key: string]: unknown;
}

export interface AssetGachaSimulationService {
  simulateResolvedAssetPackOdds(pack: AssetGachaPack, options?: AssetGachaSimulationRunOptions): AssetGachaSimulationResult;
  simulateAssetPackOdds(packId: string, options?: Record<string, unknown>): AssetGachaSimulationResult;
  simulateRuntimeAssetPackOdds(
    packId: string,
    options?: AssetGachaRuntimeSimulationRunOptions
  ): Promise<AssetGachaSimulationResult>;
}

export function createAssetGachaSimulationService(
  options?: AssetGachaSimulationServiceOptions
): AssetGachaSimulationService;

export function createStaticAssetGachaSimulationService(options?: {
  getPack?: AssetGachaSimulationServiceOptions['getStaticPack'];
  getCatalog?: AssetGachaSimulationServiceOptions['getStaticCatalog'];
  getPackOdds?: AssetGachaSimulationServiceOptions['getStaticPackOdds'];
} & Omit<AssetGachaSimulationServiceOptions, 'getStaticPack' | 'getStaticCatalog' | 'getStaticPackOdds'>): AssetGachaSimulationService;

export function createRuntimeAssetGachaSimulationService(options?: {
  getPack?: AssetGachaSimulationServiceOptions['getRuntimePack'];
  getCatalog?: AssetGachaSimulationServiceOptions['getRuntimeCatalog'];
  shapePackOdds?: AssetGachaSimulationServiceOptions['shapeRuntimePackOdds'];
} & Omit<AssetGachaSimulationServiceOptions, 'getRuntimePack' | 'getRuntimeCatalog' | 'shapeRuntimePackOdds'>): AssetGachaSimulationService;

export function simulateResolvedAssetPackOdds(
  pack: AssetGachaPack,
  options?: AssetGachaSimulationRunOptions
): AssetGachaSimulationResult;
