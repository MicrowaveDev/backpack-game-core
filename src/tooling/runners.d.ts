export function parseSuiteRunnerArgs(argv: string[], config: { suites: Record<string, string[]>; defaultSuite: string; extraFlags?: string[] }): Record<string, any>;
export function findFreePort(preferredPort: number, host?: string): Promise<number>;
export function runConfiguredSuite(options: Record<string, any>): any;
export function runChildProcess(command: string, args?: string[], options?: Record<string, any>): Promise<{ command: string; args: string[]; code: number; signal: string | null }>;
export interface ChildProcessSyncResult {
  status: number | null;
  signal: string | null;
  stdout?: string | Buffer | null;
  stderr?: string | Buffer | null;
  error?: Error;
  [key: string]: unknown;
}
export function runChildProcessSync(command: string, args?: string[], options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: any; encoding?: BufferEncoding; shell?: boolean; allowFailure?: boolean; spawnProcess?: (command: string, args: string[], options: Record<string, any>) => ChildProcessSyncResult }): ChildProcessSyncResult;
