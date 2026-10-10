export interface BackpackFetchResponse {
  ok: boolean;
  status: number;
  statusText?: string;
  headers?: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
}

export type BackpackFetch = (url: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: unknown;
  credentials?: unknown;
}) => Promise<BackpackFetchResponse>;

export type BackpackClientRoute = string | ((params?: Record<string, unknown>) => string);

export interface BackpackGameClientOptions {
  baseUrl?: string;
  fetchImpl?: BackpackFetch;
  fetch?: BackpackFetch;
  headers?: Record<string, string>;
  getAuthHeaders?: () => Record<string, string> | Promise<Record<string, string>>;
  credentials?: unknown;
  routes?: Record<string, BackpackClientRoute>;
  unwrapDataEnvelope?: boolean;
  envelopeSuccessKey?: string;
  envelopeDataKey?: string;
  envelopeErrorKey?: string;
}

export interface BackpackGameClientRequestOptions {
  method?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: unknown;
  credentials?: unknown;
  unwrapDataEnvelope?: boolean;
  envelopeSuccessKey?: string;
  envelopeDataKey?: string;
  envelopeErrorKey?: string;
}

export class BackpackGameClientError extends Error {
  name: 'BackpackGameClientError';
  status: number;
  statusText: string;
  payload: unknown;
  url: string;
  constructor(message: string, options?: {
    status?: number;
    statusText?: string;
    payload?: unknown;
    url?: string;
  });
}

export function joinBackpackClientPath(baseUrl?: string, path?: string): string;
export function backpackClientQueryString(query?: Record<string, unknown>): string;
export function interpolateBackpackClientPath(path: string, params?: Record<string, unknown>): string;
export function resolveBackpackClientRoute(
  routes: Record<string, BackpackClientRoute>,
  name: string,
  params?: Record<string, unknown>
): string;

export class BackpackGameClient {
  baseUrl: string;
  headers: Record<string, string>;
  credentials?: unknown;
  routes: Record<string, BackpackClientRoute>;
  unwrapDataEnvelope: boolean;
  envelopeSuccessKey: string;
  envelopeDataKey: string;
  envelopeErrorKey: string;
  constructor(options?: BackpackGameClientOptions);
  authHeaders(): Promise<Record<string, string>>;
  request<T = unknown>(path: string, options?: BackpackGameClientRequestOptions): Promise<T>;
  resolvePayloadEnvelope<T = unknown>(
    payload: unknown,
    response?: Partial<BackpackFetchResponse>,
    url?: string,
    options?: BackpackGameClientRequestOptions
  ): T;
  get<T = unknown>(path: string, options?: BackpackGameClientRequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: BackpackGameClientRequestOptions): Promise<T>;
  routePath(name: string, params?: Record<string, unknown>): string;
  getRoute<T = unknown>(
    name: string,
    params?: Record<string, unknown>,
    options?: BackpackGameClientRequestOptions
  ): Promise<T>;
  postRoute<T = unknown>(
    name: string,
    params?: Record<string, unknown>,
    body?: unknown,
    options?: BackpackGameClientRequestOptions
  ): Promise<T>;
}

export function createBackpackGameClient(options?: BackpackGameClientOptions): BackpackGameClient;

export interface ReplayEffectDefinition {
  label: Record<string, string>;
  className: string;
}

export interface ReplayFloatingLabel {
  id: string;
  text: string;
  className: string;
}

export interface ReplayFighterEffects {
  side?: string;
  key: string;
  classes: string[];
  floatingLabels: ReplayFloatingLabel[];
  statusBadges: Array<ReplayEffectDefinition & { label: string }>;
}

export const STATUS_EFFECTS: Record<string, ReplayEffectDefinition>;
export const BATTLE_EFFECTS: Record<string, ReplayEffectDefinition>;

export function replayFighterEffects(options?: {
  event?: Record<string, any>;
  side?: string;
  replayState?: Record<string, any>;
  replayIndex?: number;
  lang?: string;
}): ReplayFighterEffects;

export type ReplayFighterVisualState =
  | 'idle'
  | 'attack'
  | 'hit'
  | 'blocked'
  | 'stunned'
  | 'victory'
  | 'defeat';

export function replayFighterVisualState(options?: {
  event?: Record<string, any>;
  side?: string;
  replayState?: Record<string, any>;
}): ReplayFighterVisualState;

export function getReplayCombatantName(
  currentBattle: Record<string, any> | null | undefined,
  side: string,
  resolveName: (characterId: string) => string
): string;

export interface FormattedReplayEvent {
  logText: string;
  speechText: string;
  speechParts?: Array<{ text: string; kind?: string }>;
  statusText: string;
  speechSide: string | null;
}

export function formatReplayEvent(
  event: Record<string, any> | null | undefined,
  currentBattle: Record<string, any> | null | undefined,
  resolveName: (characterId: string) => string,
  resolveActionName?: ((characterId: string) => string) | null,
  lang?: string
): FormattedReplayEvent;

export { createTutorialController } from './tutorial/index.js';
export type { TutorialController } from './tutorial/index.js';
