function cookieValue(cookieHeader, name) {
  const prefix = `${name}=`;
  for (const part of String(cookieHeader || '').split(';')) {
    const value = part.trim();
    if (value.startsWith(prefix)) return decodeURIComponent(value.slice(prefix.length));
  }
  return '';
}

export function validateGoogleIdentityRedirectRequest({ cookieHeader, body } = {}) {
  const cookieToken = cookieValue(cookieHeader, 'g_csrf_token');
  const bodyToken = String(body?.g_csrf_token || '');
  const credential = String(body?.credential || '');
  if (!cookieToken || !bodyToken || cookieToken !== bodyToken) {
    const error = new Error('Invalid Google sign-in CSRF token');
    error.status = 403;
    throw error;
  }
  if (!credential) {
    const error = new Error('Google did not return a credential');
    error.status = 400;
    throw error;
  }
  return credential;
}

function scriptValue(value) {
  return JSON.stringify(String(value || '')).replaceAll('<', '\\u003c');
}

function htmlValue(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function createBrowserSessionRedirectHtml({
  appName,
  sessionToken,
  storageKey,
  redirectPath = '/',
  nonce = ''
} = {}) {
  const destination = String(redirectPath || '/');
  if (!destination.startsWith('/') || destination.startsWith('//')) {
    throw new TypeError('Browser session redirect path must be same-origin');
  }
  const safeAppName = htmlValue(appName || 'the app');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeAppName} login complete</title></head><body><main><p>Authentication confirmed. Returning to ${safeAppName}...</p><p><a href="${htmlValue(destination)}">Continue</a></p></main><script nonce="${htmlValue(nonce)}">localStorage.setItem(${scriptValue(storageKey)},${scriptValue(sessionToken)});location.replace(${scriptValue(destination)});</script></body></html>`;
}
