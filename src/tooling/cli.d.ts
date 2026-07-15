export interface ToolingCliIo {
  cwd?: string;
  stdout?: { write(value: string): unknown };
  stderr?: { write(value: string): unknown };
}
export function runToolingCli(argv: string[], io?: ToolingCliIo): number;
export const TOOLING_CLI_HELP: string;
