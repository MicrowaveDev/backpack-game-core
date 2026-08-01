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
  shapeRunCompleteSummary?: (context: {
    run: unknown;
    character: unknown;
    bootstrap: Record<string, unknown>;
    text: Record<string, unknown>;
    locale: string;
    fallbackSummary: Record<string, unknown>;
  }) => Record<string, unknown> | null;
  replaySpeedOptions?: Array<{ speed: number; count?: number; label?: string }>;
  defaultReplaySpeed?: number;
  replayEventDelayMs?: number;
  replayMinDelayMs?: number;
}

export declare function createConfiguredGameplayScreen(
  options: ConfiguredGameplayScreenOptions
): VueComponentOption;
