export function parseSuiteRunnerArgs(argv: string[], config: { suites: Record<string, string[]>; defaultSuite: string; extraFlags?: string[] }): Record<string, any>;
export function findFreePort(preferredPort: number, host?: string): Promise<number>;
export function runConfiguredSuite(options: Record<string, any>): any;
export function runChildProcess(command: string, args?: string[], options?: Record<string, any>): Promise<{ command: string; args: string[]; code: number; signal: string | null }>;
export function runChildProcessSync(command: string, args?: string[], options?: Record<string, any>): Record<string, any>;
