import type { NavigationItem } from '../../client/application/adapter.js';
import type { ScreenRegistry } from './screen-registry.js';

export interface ResolvedNavigationItem extends NavigationItem {
  id: string;
  order: number;
}

export function createNavigationItems(
  registry: ScreenRegistry,
  context?: Record<string, unknown>
): readonly ResolvedNavigationItem[];

export function findNavigationItem(
  items: readonly ResolvedNavigationItem[],
  screenId: string
): ResolvedNavigationItem | undefined;
