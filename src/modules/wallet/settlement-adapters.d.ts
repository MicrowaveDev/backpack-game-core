export declare const DEFAULT_SETTLEMENT_JSON_RECORD_KEYS: readonly string[];
export declare const DEFAULT_SETTLEMENT_RECORD_SCOPES: readonly string[];
export declare const SETTLEMENT_INPUT_FORMATS: readonly string[];

export interface SettlementAdapterError extends Error {
  statusCode?: number;
}

export type SettlementErrorFactory = (message: string, statusCode?: number) => Error;
export type SettlementRecord = Record<string, unknown>;
export type SettlementRecordField =
  | string
  | string[]
  | ((record: SettlementRecord, helpers: SettlementRecordMapperHelpers) => unknown)
  | {
    keys?: string | string[];
    scopes?: readonly string[];
    defaultValue?: unknown;
    transform?: (
      value: unknown,
      record: SettlementRecord,
      helpers: SettlementRecordMapperHelpers
    ) => unknown;
  };

export interface SettlementRecordMapperHelpers {
  provider?: string;
  firstPresent: (...values: unknown[]) => unknown;
  getValue: (record: unknown, keys: string | string[]) => unknown;
  getScopedValue: (
    record: unknown,
    keys: string | string[],
    options?: { scopes?: readonly string[] }
  ) => unknown;
}

export interface SettlementRecordMapperOptions {
  provider?: string | null;
  fields?: Record<string, SettlementRecordField>;
  defaults?: SettlementRecord;
  includeSourceRecord?: boolean;
  sourceRecordKey?: string;
  transform?: (
    mapped: SettlementRecord,
    record: SettlementRecord,
    helpers: SettlementRecordMapperHelpers
  ) => SettlementRecord;
}

export type ProviderSettlementRecordAdapter = (
  record: SettlementRecord,
  context?: { provider?: string; [key: string]: unknown }
) => SettlementRecord;

export interface SettlementAdapterRegistryOptions {
  supportedProviders?: Iterable<string> | null;
  adapters?: Record<string, ProviderSettlementRecordAdapter> | Map<string, ProviderSettlementRecordAdapter>;
  defaultAdapter?: ProviderSettlementRecordAdapter | null;
  errorFactory?: SettlementErrorFactory;
  jsonRecordKeys?: readonly string[];
}

export interface SettlementParseOptions extends SettlementAdapterRegistryOptions {
  provider?: string;
  format?: 'auto' | 'json' | 'csv' | string;
  sourceRef?: string;
  recordKeys?: readonly string[];
}

export interface SettlementParseResult {
  provider: string;
  format: string;
  adapter: string;
  rawRecordCount: number;
  records: SettlementRecord[];
}

export interface ProviderSettlementAdapterRegistry {
  normalizeProvider(provider: string): string;
  adaptProviderSettlementRecords(provider: string, records?: SettlementRecord[]): SettlementRecord[];
  parseProviderSettlementInput(
    text: string,
    options?: Omit<SettlementParseOptions, keyof SettlementAdapterRegistryOptions>
  ): SettlementParseResult;
}

export declare function createSettlementAdapterError(
  message: string,
  statusCode?: number
): SettlementAdapterError;

export declare function firstPresent(...values: unknown[]): unknown;

export declare function normalizeSettlementProvider(
  provider: string,
  options?: {
    supportedProviders?: Iterable<string> | null;
    errorFactory?: SettlementErrorFactory;
  }
): string;

export declare function normalizeSettlementInputFormat(
  format?: string,
  sourceRef?: string,
  options?: { errorFactory?: SettlementErrorFactory }
): string;

export declare function canonicalSettlementKey(key: unknown): string;

export declare function getSettlementRecordValue(
  record: unknown,
  keys: string | string[]
): unknown;

export declare function getScopedSettlementRecordValue(
  record: unknown,
  keys: string | string[],
  options?: { scopes?: readonly string[] }
): unknown;

export declare function parseSettlementCsv(
  text: string,
  options?: { errorFactory?: SettlementErrorFactory }
): SettlementRecord[];

export declare function settlementRecordsFromJson(
  value: unknown,
  options?: {
    recordKeys?: readonly string[];
    errorFactory?: SettlementErrorFactory;
  }
): SettlementRecord[];

export declare function parseSettlementJson(
  text: string,
  options?: {
    recordKeys?: readonly string[];
    errorFactory?: SettlementErrorFactory;
  }
): SettlementRecord[];

export declare function createProviderSettlementRecordMapper(
  options?: SettlementRecordMapperOptions
): ProviderSettlementRecordAdapter;

export declare function createProviderSettlementAdapterRegistry(
  options?: SettlementAdapterRegistryOptions
): ProviderSettlementAdapterRegistry;

export declare function adaptProviderSettlementRecords(
  provider: string,
  records?: SettlementRecord[],
  options?: SettlementAdapterRegistryOptions
): SettlementRecord[];

export declare function parseProviderSettlementInput(
  text: string,
  options?: SettlementParseOptions
): SettlementParseResult;
