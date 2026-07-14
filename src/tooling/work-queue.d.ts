export function parsePositiveLimit(argv: string[], options?: { flag?: string; defaultLimit?: number }): number;
export function parseMarkdownMatches<T>(markdown: string, pattern: RegExp, mapMatch: (match: RegExpMatchArray) => [string, T] | null): Map<string, T>;
export function selectPendingWork<T>(items: T[], options: { isPending: (item: T) => boolean; limit?: number }): T[];
