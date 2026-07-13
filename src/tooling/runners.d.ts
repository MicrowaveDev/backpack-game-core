export function parseSuiteRunnerArgs(argv: string[], config: { suites: Record<string, string[]>; defaultSuite: string; extraFlags?: string[] }): Record<string, any>;
export function findFreePort(preferredPort: number, host?: string): Promise<number>;
export function runConfiguredSuite(options: Record<string, any>): any;
