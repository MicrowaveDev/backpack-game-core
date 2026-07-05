export const DEFAULT_SETTLEMENT_JSON_RECORD_KEYS = Object.freeze([
  'records',
  'data',
  'payments',
  'invoices',
  'items',
  'rows',
  'transactions'
]);

export const DEFAULT_SETTLEMENT_RECORD_SCOPES = Object.freeze([
  'data',
  'invoice',
  'payment',
  'metadata',
  'successful_payment',
  'successfulPayment'
]);

const INPUT_FORMATS = new Set(['auto', 'json', 'csv']);

export const SETTLEMENT_INPUT_FORMATS = Object.freeze([...INPUT_FORMATS]);

export function createSettlementAdapterError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

export function firstPresent(...values) {
  return values.find((value) => value != null && value !== '') ?? null;
}

function errorFrom(factory, message, statusCode) {
  return factory(message, statusCode);
}

function providerSetFrom(supportedProviders) {
  if (!supportedProviders) return null;
  if (supportedProviders instanceof Set) return supportedProviders;
  return new Set(Array.from(supportedProviders));
}

export function normalizeSettlementProvider(provider, {
  supportedProviders = null,
  errorFactory = createSettlementAdapterError
} = {}) {
  const normalized = String(provider || '').trim();
  if (!normalized) {
    throw errorFrom(errorFactory, 'Settlement provider is required', 400);
  }
  const supported = providerSetFrom(supportedProviders);
  if (supported && !supported.has(normalized)) {
    throw errorFrom(errorFactory, 'Unknown settlement provider', 400);
  }
  return normalized;
}

export function normalizeSettlementInputFormat(format = 'auto', sourceRef = '', {
  errorFactory = createSettlementAdapterError
} = {}) {
  const normalized = String(format || 'auto').trim().toLowerCase();
  if (!INPUT_FORMATS.has(normalized)) {
    throw errorFrom(errorFactory, 'Unsupported settlement import format', 400);
  }
  if (normalized !== 'auto') return normalized;
  return String(sourceRef || '').toLowerCase().endsWith('.csv') ? 'csv' : 'json';
}

export function canonicalSettlementKey(key) {
  return String(key || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function keyList(keys) {
  if (Array.isArray(keys)) return keys;
  return keys == null ? [] : [keys];
}

export function getSettlementRecordValue(record, keys) {
  if (!record || typeof record !== 'object') return null;
  for (const key of keyList(keys)) {
    if (Object.hasOwn(record, key) && record[key] != null && record[key] !== '') return record[key];
  }
  const canonical = new Map(
    Object.entries(record).map(([key, value]) => [canonicalSettlementKey(key), value])
  );
  for (const key of keyList(keys)) {
    const value = canonical.get(canonicalSettlementKey(key));
    if (value != null && value !== '') return value;
  }
  return null;
}

export function getScopedSettlementRecordValue(record, keys, {
  scopes = DEFAULT_SETTLEMENT_RECORD_SCOPES
} = {}) {
  return firstPresent(
    getSettlementRecordValue(record, keys),
    ...scopes.map((scope) => getSettlementRecordValue(record?.[scope], keys))
  );
}

export function parseSettlementCsv(text, {
  errorFactory = createSettlementAdapterError
} = {}) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (inQuotes) {
    throw errorFrom(errorFactory, 'Invalid CSV settlement import: unclosed quoted field', 400);
  }
  row.push(field);
  rows.push(row);

  const nonEmptyRows = rows.filter((cells) => (
    cells.some((cell) => String(cell || '').trim() !== '')
  ));
  if (!nonEmptyRows.length) return [];
  const headers = nonEmptyRows[0].map((header, index) => (
    String(header || `column_${index + 1}`).trim()
  ));
  return nonEmptyRows.slice(1).map((cells) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header || `column_${index + 1}`] = cells[index] == null
        ? ''
        : String(cells[index]).trim();
    });
    return record;
  });
}

export function settlementRecordsFromJson(value, {
  recordKeys = DEFAULT_SETTLEMENT_JSON_RECORD_KEYS,
  errorFactory = createSettlementAdapterError
} = {}) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') {
    throw errorFrom(
      errorFactory,
      'Settlement JSON must be an array or an object containing records',
      400
    );
  }
  for (const key of recordKeys) {
    if (Array.isArray(value[key])) return value[key];
  }
  throw errorFrom(
    errorFactory,
    'Settlement JSON must be an array or contain a configured record array',
    400
  );
}

export function parseSettlementJson(text, options = {}) {
  return settlementRecordsFromJson(JSON.parse(String(text || '')), options);
}

function resolveMappedField(record, field, helpers) {
  if (typeof field === 'function') return field(record, helpers);
  if (Array.isArray(field) || typeof field === 'string') {
    return getScopedSettlementRecordValue(record, field, helpers);
  }
  if (!field || typeof field !== 'object') return null;

  const rawValue = field.keys == null
    ? null
    : getScopedSettlementRecordValue(record, field.keys, {
      scopes: field.scopes || DEFAULT_SETTLEMENT_RECORD_SCOPES
    });
  const value = firstPresent(rawValue, field.defaultValue);
  return typeof field.transform === 'function'
    ? field.transform(value, record, helpers)
    : value;
}

export function createProviderSettlementRecordMapper({
  provider = null,
  fields = {},
  defaults = {},
  includeSourceRecord = true,
  sourceRecordKey = 'sourceRecord',
  transform = null
} = {}) {
  return (record, context = {}) => {
    const helpers = {
      ...context,
      firstPresent,
      getValue: getSettlementRecordValue,
      getScopedValue: getScopedSettlementRecordValue
    };
    const mapped = {
      ...record,
      ...defaults
    };
    if (provider != null) mapped.provider = provider;

    for (const [targetKey, field] of Object.entries(fields || {})) {
      const value = resolveMappedField(record, field, helpers);
      if (value != null && value !== '') mapped[targetKey] = value;
    }

    if (includeSourceRecord) mapped[sourceRecordKey] = record;
    return typeof transform === 'function'
      ? transform(mapped, record, helpers)
      : mapped;
  };
}

function adapterEntriesFrom(adapters = {}) {
  if (adapters instanceof Map) return adapters;
  return new Map(Object.entries(adapters || {}));
}

export function createProviderSettlementAdapterRegistry({
  supportedProviders = null,
  adapters = {},
  defaultAdapter = null,
  errorFactory = createSettlementAdapterError,
  jsonRecordKeys = DEFAULT_SETTLEMENT_JSON_RECORD_KEYS
} = {}) {
  const adapterEntries = adapterEntriesFrom(adapters);
  const normalizeProvider = (provider) => normalizeSettlementProvider(provider, {
    supportedProviders,
    errorFactory
  });
  const adapterFor = (provider) => adapterEntries.get(provider) || defaultAdapter;

  function adaptProviderSettlementRecords(provider, records = []) {
    const normalizedProvider = normalizeProvider(provider);
    if (!Array.isArray(records)) {
      throw errorFrom(errorFactory, 'Provider settlement records must be an array', 400);
    }
    const adapter = adapterFor(normalizedProvider);
    return records.map((record) => (
      typeof adapter === 'function'
        ? adapter(record, { provider: normalizedProvider })
        : {
          ...record,
          provider: normalizedProvider,
          sourceRecord: record
        }
    ));
  }

  function parseProviderSettlementInput(text, {
    provider,
    format = 'auto',
    sourceRef = '',
    recordKeys = jsonRecordKeys
  } = {}) {
    const normalizedProvider = normalizeProvider(provider);
    const inputFormat = normalizeSettlementInputFormat(format, sourceRef, { errorFactory });
    const rawRecords = inputFormat === 'csv'
      ? parseSettlementCsv(text, { errorFactory })
      : parseSettlementJson(text, { recordKeys, errorFactory });
    return {
      provider: normalizedProvider,
      format: inputFormat,
      adapter: normalizedProvider,
      rawRecordCount: rawRecords.length,
      records: adaptProviderSettlementRecords(normalizedProvider, rawRecords)
    };
  }

  return {
    normalizeProvider,
    adaptProviderSettlementRecords,
    parseProviderSettlementInput
  };
}

export function adaptProviderSettlementRecords(provider, records = [], options = {}) {
  return createProviderSettlementAdapterRegistry(options)
    .adaptProviderSettlementRecords(provider, records);
}

export function parseProviderSettlementInput(text, options = {}) {
  const {
    provider,
    format,
    sourceRef,
    recordKeys,
    ...registryOptions
  } = options;
  return createProviderSettlementAdapterRegistry(registryOptions)
    .parseProviderSettlementInput(text, { provider, format, sourceRef, recordKeys });
}
