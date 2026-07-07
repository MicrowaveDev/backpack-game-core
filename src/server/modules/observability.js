import crypto from 'node:crypto';

function shouldDisableLogging({
  env = process.env.NODE_ENV,
  silent = process.env.LOG_SILENT
} = {}) {
  return env === 'test' || silent === '1' || silent === 'true';
}

function normalizePayload(payload) {
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload;
  }
  return { message: String(payload ?? '') };
}

function newRequestId() {
  return 'req_' + crypto.randomBytes(6).toString('hex');
}

export function createStructuredLogger({
  disabled = shouldDisableLogging(),
  now = () => new Date().toISOString(),
  writeInfo = (line) => process.stdout.write(line + '\n'),
  writeError = (line) => process.stderr.write(line + '\n')
} = {}) {
  function emit(level, payload) {
    if (disabled) return;
    const line = JSON.stringify({ ts: now(), level, ...normalizePayload(payload) });
    if (level === 'error') {
      writeError(line);
    } else {
      writeInfo(line);
    }
  }
  return {
    info: (payload) => emit('info', payload),
    warn: (payload) => emit('warn', payload),
    error: (payload) => emit('error', payload)
  };
}

export const log = createStructuredLogger();

export function createRequestLogger({
  logger = log,
  createRequestId = newRequestId,
  nowHrtime = () => process.hrtime.bigint(),
  routeFromRequest = (req) => req.route?.path || req.path,
  contextFromRequest = (req) => ({
    userId: req.user?.id || null,
    resourceId: req.params?.id || null
  })
} = {}) {
  return function requestLoggerMiddleware(req, res, next) {
    const requestId = req.headers['x-request-id'] || createRequestId(req);
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = nowHrtime();
    res.on('finish', () => {
      const durationMs = Number(nowHrtime() - startedAt) / 1e6;
      const outcome = res.statusCode >= 500 ? 'server_error'
        : res.statusCode >= 400 ? 'client_error'
        : 'ok';
      logger?.info?.({
        kind: 'http',
        requestId,
        method: req.method,
        route: routeFromRequest(req),
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        outcome,
        ...contextFromRequest(req)
      });
    });

    next();
  };
}

export function requestLogger(options = {}) {
  return createRequestLogger(options);
}
