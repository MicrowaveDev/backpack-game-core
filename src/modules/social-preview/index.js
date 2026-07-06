function noop() {}

function loggerMethod(logger, methodName) {
  const method = logger?.[methodName];
  return typeof method === 'function' ? method.bind(logger) : noop;
}

function errorMessage(error) {
  return error?.message ? String(error.message) : String(error);
}

function resolveLogPath(outputPath, relativePath) {
  if (!outputPath) return null;
  return typeof relativePath === 'function' ? relativePath(outputPath) : outputPath;
}

export function createSocialPreviewCacheService({
  renderPreview,
  renderOptions = {},
  outputPath = null,
  ensureOutputDirectory = async () => {},
  copyFallback = async () => false,
  logger = null,
  relativePath = null,
  logKind = 'social_preview_cache',
  throwOnFailure = false
} = {}) {
  if (typeof renderPreview !== 'function') {
    throw new Error('Social preview cache service requires renderPreview');
  }
  if (typeof ensureOutputDirectory !== 'function') {
    throw new Error('Social preview cache service ensureOutputDirectory must be a function');
  }
  if (typeof copyFallback !== 'function') {
    throw new Error('Social preview cache service copyFallback must be a function');
  }

  const info = loggerMethod(logger, 'info');
  const warn = loggerMethod(logger, 'warn');

  async function ensureSocialPreviewCache(options = {}) {
    const resolvedRenderOptions = { ...renderOptions, ...options };
    const resolvedOutputPath = resolvedRenderOptions.out || outputPath;
    const logPath = resolveLogPath(resolvedOutputPath, relativePath);

    await ensureOutputDirectory({
      outputPath: resolvedOutputPath,
      renderOptions: resolvedRenderOptions
    });

    try {
      const result = await renderPreview(resolvedRenderOptions);
      info({
        kind: logKind,
        outcome: 'generated',
        path: logPath
      });
      return {
        ok: true,
        outcome: 'generated',
        generated: true,
        fallback: false,
        path: logPath,
        result
      };
    } catch (error) {
      let fallbackCopied = false;
      let fallbackError = null;
      try {
        fallbackCopied = Boolean(await copyFallback({
          error,
          outputPath: resolvedOutputPath,
          renderOptions: resolvedRenderOptions
        }));
      } catch (copyError) {
        fallbackError = copyError;
      }

      const finalError = fallbackError || error;
      const outcome = fallbackCopied ? 'fallback' : 'failed';
      warn({
        kind: logKind,
        outcome,
        path: logPath,
        message: errorMessage(finalError)
      });

      if (!fallbackCopied && throwOnFailure) throw finalError;

      return {
        ok: fallbackCopied,
        outcome,
        generated: false,
        fallback: fallbackCopied,
        path: logPath,
        error: finalError
      };
    }
  }

  return {
    ensureSocialPreviewCache,
    ensureCache: ensureSocialPreviewCache
  };
}
