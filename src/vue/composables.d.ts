export interface ReducedMotionTracker {
  getValue(): boolean;
  setAppPreference(value: unknown): void;
  subscribe(callback: (value: boolean) => void): () => void;
  destroy(): void;
}

export declare function createReducedMotionTracker(options?: {
  win?: Window | null;
}): ReducedMotionTracker;

export declare function bindReducedMotionTracker(
  tracker: ReducedMotionTracker,
  options?: {
    onChange?: (value: boolean) => void;
    readAppPreference?: () => unknown;
  }
): () => void;

export interface TelegramWebAppAdapter {
  getWebApp(): Record<string, any> | null;
  isTelegramAvailable(): boolean;
  isVersionAtLeast(version: string): boolean;
  syncViewportVars(root?: HTMLElement | null): void;
  applyTelegramTheme(root?: HTMLElement | null): void;
  impact(type?: string): void;
  notify(type?: string): void;
  selectionChanged(): void;
  init(): () => void;
}

export declare function createTelegramWebAppAdapter(options?: {
  win?: Window | null;
  root?: HTMLElement | null;
}): TelegramWebAppAdapter;

export declare function useTelegramWebApp(options?: {
  win?: Window | null;
  root?: HTMLElement | null;
}): TelegramWebAppAdapter;

export declare function versionAtLeast(current: unknown, minimum: unknown): boolean;

export interface TouchDragState {
  draggingArtifactId: string;
  draggingSource: string;
  draggingItem: Record<string, unknown> | null;
  sellDragOver: boolean;
}

export interface TouchAdapter {
  attachTouch(rootElement: EventTarget | null): void;
  detachTouch(rootElement: EventTarget | null): void;
}

export declare function useTouch(
  state: TouchDragState,
  options?: {
    win?: Window | null;
    document?: Document | null;
  }
): TouchAdapter;

export interface BackpackInteractionState {
  selectedId: string;
  contextMenuOpen: boolean;
  contextAnchor: { x: number; y: number; scrollX?: number; scrollY?: number } | null;
  selectedLocked: boolean;
  dropTarget: 'storage' | 'sell' | null;
  preview: (import('../modules/loadout/interaction-placement.js').BackpackPlacementResult & { valid: boolean; x?: number; y?: number }) | null;
  dragVisual: { clientX: number; clientY: number; width: number; height: number; cellWidth: number; gap: number; grabX: number; grabY: number } | null;
  messageCode: string;
  busy: boolean;
}
export interface BackpackInteraction {
  state: BackpackInteractionState;
  getRows(): import('../modules/loadout/interaction-placement.js').BackpackInteractionRow[];
  getSelectedItem(): import('../modules/loadout/interaction-placement.js').BackpackInteractionRow | null;
  select(rowOrId: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow | string | number): boolean;
  previewAt(cell: { x: number; y: number }): BackpackInteractionState['preview'];
  placeAt(cell: { x: number; y: number }): Promise<boolean>;
  rotate(): Promise<boolean>;
  unplace(): Promise<boolean>;
  autoPlace(): Promise<boolean>;
  sell(): Promise<boolean>;
  canSell(): boolean;
  isBusy(): boolean;
  cancel(): void;
  getSellPrice(): number | null;
  attach(root: HTMLElement): void;
  detach(): void;
  clickCell(cell: { x: number; y: number }): void;
}
export declare function createBackpackInteractionState(): BackpackInteractionState;
export declare function createBackpackInteraction(options: {
  state?: BackpackInteractionState;
  getRows(): import('../modules/loadout/interaction-placement.js').BackpackInteractionRow[];
  getArtifact(id: string | number | null | undefined): import('../modules/loadout/validation.js').ArtifactLike | null | undefined;
  columns?: number;
  getHeight?: () => number;
  commitRows(rows: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow[]): Promise<unknown> | unknown;
  onCommitted?: (change: { action: 'place' | 'rotate' | 'unplace'; item: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow; rows: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow[]; previousRows: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow[] }) => unknown;
  isLockedBag?: (row: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow) => boolean;
  canInteract?: () => boolean;
  onSell?: (item: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow) => Promise<unknown> | unknown;
  canSellItem?: (item: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow) => boolean;
  getSellPrice?: (item: import('../modules/loadout/interaction-placement.js').BackpackInteractionRow) => number | null;
  document?: Document | null;
  win?: Window | null;
}): BackpackInteraction;
