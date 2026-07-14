export function parsePositiveLimit(argv, { flag = '--limit=', defaultLimit = 10 } = {}) {
  const arg = argv.find((value) => value.startsWith(flag));
  if (!arg) return defaultLimit;
  const value = Number(arg.slice(flag.length));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : defaultLimit;
}

export function parseMarkdownMatches(markdown, pattern, mapMatch) {
  if (!(pattern instanceof RegExp) || !pattern.global) throw new Error('pattern must be a global RegExp');
  const values = new Map();
  for (const match of markdown.matchAll(pattern)) {
    const mapped = mapMatch(match);
    if (mapped) values.set(mapped[0], mapped[1]);
  }
  return values;
}

export function selectPendingWork(items, { isPending, limit = 10 } = {}) {
  if (typeof isPending !== 'function') throw new Error('isPending is required');
  return items.filter((item) => isPending(item)).slice(0, limit);
}
