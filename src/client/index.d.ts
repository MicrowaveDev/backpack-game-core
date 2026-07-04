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
