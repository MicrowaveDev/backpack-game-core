export interface VueComponentOption {
  name?: string;
  props?: Record<string, unknown>;
  computed?: Record<string, unknown>;
  methods?: Record<string, unknown>;
  template?: string;
  [key: string]: unknown;
}

export declare const AssetRollResultPanel: VueComponentOption;
export declare const GachaOddsTable: VueComponentOption;
export declare const ArtifactTile: VueComponentOption;
export declare const BackpackGrid: VueComponentOption;
export declare const ShopItemRow: VueComponentOption;
export declare const ShopItemList: VueComponentOption;
export declare const GachaPackCard: VueComponentOption;
export declare const GachaPackCardList: VueComponentOption;
