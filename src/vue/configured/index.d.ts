export * from './create-configured-gameplay-screen.js';

export function createConfiguredArtifactCatalogBrowser(options?: Record<string, unknown>): object;
export function createConfiguredArtifactFigure(options?: Record<string, unknown>): object;
export function createConfiguredReplayDuel(options?: {
  name?: string;
  artifactFigureComponent?: object;
  artifactFamily?: (artifact: unknown) => string;
  containerFamily?: string;
  projectGrid?: (...args: any[]) => unknown;
  resolveFighterImage?: (context: {
    fighter: Record<string, any>;
    side: string;
    visualState: import('../../client/index.js').ReplayFighterVisualState;
    event: Record<string, any> | null;
    replayState: Record<string, any>;
    replayIndex: number;
  }) => string;
}): object;
