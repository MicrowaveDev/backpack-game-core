export interface ScriptDocumentationResult {
  errors: string[];
  commandCount: number;
  familyCount: number;
  directoryCount: number;
  aliasCounts: Record<string, number>;
}
export function validateScriptDocumentation(options: {
  packageJsonPath: string;
  manifestPath: string;
  readmePath: string;
  scriptsRoot?: string;
  aliasBudgets?: Record<string, number>;
}): ScriptDocumentationResult;
export function formatScriptDocumentationResult(result: ScriptDocumentationResult): string;
