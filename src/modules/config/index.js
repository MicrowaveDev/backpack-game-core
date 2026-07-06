function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringIssues(issues) {
  return asArray(issues).map((issue) => String(issue || '').trim()).filter(Boolean);
}

function summaryEntry(field, config) {
  if (typeof field === 'string') {
    return [field, config?.[field]];
  }
  if (!field || typeof field !== 'object') return null;
  const key = String(field.label || field.key || '').trim();
  if (!key) return null;
  const value = 'value' in field ? field.value : config?.[field.key];
  return [key, typeof field.format === 'function' ? field.format(value, config) : value];
}

function formatValue(value) {
  if (value == null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

export function shapeRuntimeConfigValidationResult({
  issues = [],
  config = {},
  summaryFields = []
} = {}) {
  const normalizedIssues = stringIssues(issues);
  const summary = {};
  for (const field of asArray(summaryFields)) {
    const entry = summaryEntry(field, config);
    if (!entry) continue;
    const [key, value] = entry;
    summary[key] = value;
  }
  return {
    ok: normalizedIssues.length === 0,
    issues: normalizedIssues,
    summary
  };
}

export function formatRuntimeConfigValidationLines(validation = {}, {
  readyMessage = 'Runtime config is ready.',
  notReadyMessage = 'Runtime config is not ready:',
  includeSummary = true
} = {}) {
  const issues = stringIssues(validation.issues);
  if (issues.length) return [notReadyMessage, ...issues.map((issue) => `- ${issue}`)];
  const lines = [readyMessage];
  if (includeSummary !== false) {
    for (const [key, value] of Object.entries(validation.summary || {})) {
      lines.push(`${key}=${formatValue(value)}`);
    }
  }
  return lines;
}

export function assertRuntimeConfigValidation(validation = {}, {
  message = 'Invalid runtime config'
} = {}) {
  const issues = stringIssues(validation.issues);
  if (issues.length) {
    const error = new Error(`${message}:\n- ${issues.join('\n- ')}`);
    error.issues = issues;
    throw error;
  }
  return validation;
}
