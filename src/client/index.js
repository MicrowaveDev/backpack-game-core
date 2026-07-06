export class BackpackGameClientError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'BackpackGameClientError';
    this.status = options.status ?? 0;
    this.statusText = options.statusText ?? '';
    this.payload = options.payload ?? null;
    this.url = options.url ?? '';
  }
}

function payloadField(payload, key) {
  if (!key || !payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  return payload[key];
}

function payloadMessage(value) {
  if (typeof value === 'string' && value.trim()) return value;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
  if (typeof value.message === 'string' && value.message.trim()) return value.message;
  if (typeof value.code === 'string' && value.code.trim()) return value.code;
  return '';
}

function payloadErrorMessage(payload, {
  errorKey = 'error',
  fallback = 'Backpack request failed'
} = {}) {
  const errorMessage = payloadMessage(payloadField(payload, errorKey));
  if (errorMessage) return errorMessage;
  return payloadMessage(payloadField(payload, 'message')) || fallback;
}

function trimSlashes(value, side = 'both') {
  let result = String(value || '');
  if (side === 'left' || side === 'both') result = result.replace(/^\/+/, '');
  if (side === 'right' || side === 'both') result = result.replace(/\/+$/, '');
  return result;
}

export function joinBackpackClientPath(baseUrl = '', path = '') {
  const base = trimSlashes(baseUrl, 'right');
  const suffix = trimSlashes(path, 'left');
  if (!base) return suffix ? `/${suffix}` : '/';
  if (!suffix) return base;
  return `${base}/${suffix}`;
}

export function backpackClientQueryString(query = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry !== undefined && entry !== null && entry !== '') {
          params.append(key, String(entry));
        }
      }
      continue;
    }
    params.append(key, String(value));
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
}

function defaultFetchImpl() {
  if (typeof fetch !== 'function') {
    throw new BackpackGameClientError('No fetch implementation was provided.');
  }
  return fetch.bind(globalThis);
}

function isPlainBody(body) {
  return body !== undefined
    && body !== null
    && typeof body === 'object'
    && !(typeof FormData !== 'undefined' && body instanceof FormData)
    && !(typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams)
    && !(typeof Blob !== 'undefined' && body instanceof Blob)
    && !(typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer);
}

function contentType(headers) {
  if (!headers) return '';
  if (typeof Headers !== 'undefined' && headers instanceof Headers) return headers.get('content-type') || '';
  const found = Object.entries(headers).find(([key]) => key.toLowerCase() === 'content-type');
  return found ? String(found[1]) : '';
}

async function parseResponsePayload(response) {
  if (response.status === 204) return null;
  const type = response.headers?.get?.('content-type') || '';
  if (type.includes('application/json')) return response.json();
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function interpolateBackpackClientPath(path, params = {}) {
  return String(path || '').replace(/:([A-Za-z0-9_]+)/g, (match, key) => {
    if (params[key] === undefined || params[key] === null) return match;
    return encodeURIComponent(String(params[key]));
  });
}

export function resolveBackpackClientRoute(routes = {}, name, params = {}) {
  const route = routes?.[name];
  if (typeof route === 'function') return route(params);
  if (typeof route === 'string') return interpolateBackpackClientPath(route, params);
  throw new BackpackGameClientError(`Backpack client route is not configured: ${name}`);
}

export class BackpackGameClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || '';
    this.fetchImpl = options.fetchImpl || options.fetch || null;
    this.headers = options.headers || {};
    this.getAuthHeaders = options.getAuthHeaders || null;
    this.credentials = options.credentials;
    this.routes = options.routes || {};
    this.unwrapDataEnvelope = Boolean(options.unwrapDataEnvelope);
    this.envelopeSuccessKey = options.envelopeSuccessKey || 'success';
    this.envelopeDataKey = options.envelopeDataKey || 'data';
    this.envelopeErrorKey = options.envelopeErrorKey || 'error';
  }

  async authHeaders() {
    if (!this.getAuthHeaders) return {};
    return this.getAuthHeaders();
  }

  async request(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const query = backpackClientQueryString(options.query);
    const url = `${joinBackpackClientPath(this.baseUrl, path)}${query}`;
    const authHeaders = await this.authHeaders();
    const headers = {
      ...this.headers,
      ...authHeaders,
      ...(options.headers || {})
    };
    let body = options.body;

    if (isPlainBody(body)) {
      if (!contentType(headers)) headers['content-type'] = 'application/json';
      body = JSON.stringify(body);
    }

    const fetchImpl = this.fetchImpl || defaultFetchImpl();
    const response = await fetchImpl(url, {
      method,
      headers,
      body,
      signal: options.signal,
      credentials: options.credentials ?? this.credentials
    });
    const payload = await parseResponsePayload(response);

    if (!response.ok) {
      const message = payloadErrorMessage(payload, {
        errorKey: this.envelopeErrorKey,
        fallback: `Backpack request failed with ${response.status}`
      });
      throw new BackpackGameClientError(message, {
        status: response.status,
        statusText: response.statusText,
        payload,
        url
      });
    }

    return this.resolvePayloadEnvelope(payload, response, url, options);
  }

  resolvePayloadEnvelope(payload, response = {}, url = '', options = {}) {
    const unwrap = options.unwrapDataEnvelope ?? this.unwrapDataEnvelope;
    if (!unwrap || !payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

    const successKey = options.envelopeSuccessKey || this.envelopeSuccessKey;
    if (!Object.prototype.hasOwnProperty.call(payload, successKey)) return payload;

    if (payloadField(payload, successKey) === false) {
      const errorKey = options.envelopeErrorKey || this.envelopeErrorKey;
      const message = payloadErrorMessage(payload, { errorKey });
      throw new BackpackGameClientError(message, {
        status: response.status ?? 200,
        statusText: response.statusText ?? '',
        payload,
        url
      });
    }

    const dataKey = options.envelopeDataKey || this.envelopeDataKey;
    return payloadField(payload, dataKey);
  }

  get(path, options = {}) {
    return this.request(path, { ...options, method: 'GET' });
  }

  post(path, body, options = {}) {
    return this.request(path, { ...options, method: 'POST', body });
  }

  routePath(name, params = {}) {
    return resolveBackpackClientRoute(this.routes, name, params);
  }

  getRoute(name, params = {}, options = {}) {
    return this.get(this.routePath(name, params), options);
  }

  postRoute(name, params = {}, body = {}, options = {}) {
    return this.post(this.routePath(name, params), body, options);
  }
}

export function createBackpackGameClient(options = {}) {
  return new BackpackGameClient(options);
}
