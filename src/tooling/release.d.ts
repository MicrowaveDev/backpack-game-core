export function runCommand(command: string, args?: string[], options?: Record<string, any>): Promise<{ code: number; signal: string | null }>;
export function runCommandSequence(commands: Array<[string, string[]] | { command: string; args?: string[] }>, options?: Record<string, any>): Promise<Array<{ code: number; signal: string | null }>>;
