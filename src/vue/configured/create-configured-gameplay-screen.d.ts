import type { VueComponentOption } from '../components.js';

export interface ConfiguredGameplayScreenOptions {
  name?: string;
  gridColumns: number;
  gridRows: number;
  getArtifactById: (artifactId: string, controller?: unknown) => unknown;
  findBagPlacement: (loadout: unknown[], artifact: unknown, rotated?: number) => unknown;
  findPlacement: (loadout: unknown[], artifact: unknown) => unknown;
  loadoutGridProps: (loadout: unknown[]) => {
    items?: unknown[];
    totalRows?: number;
    bagRows?: unknown[];
    [key: string]: unknown;
  };
  artifactFigureComponent: VueComponentOption;
  replayDuelComponent: VueComponentOption;
  getLocale?: (controller: unknown) => string;
  getText?: (controller: unknown) => Record<string, unknown>;
  getClientServices?: (controller: unknown) => unknown;
}

export declare function createConfiguredGameplayScreen(
  options: ConfiguredGameplayScreenOptions
): VueComponentOption;
