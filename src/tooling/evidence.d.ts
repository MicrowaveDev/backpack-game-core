export interface FileEvidence {
  id?: string;
  path: string;
  size: number;
  sha256: string;
}

export function sha256(value: string | Buffer): string;
export function atomicWriteFile(filePath: string, value: string | Buffer): void;
export function fileEvidence(filePath: string, options?: { root?: string; id?: string; optional?: boolean }): FileEvidence | null;
export function buildEvidenceManifest(options?: Record<string, any>): Record<string, any>;
export function writeEvidenceBundle(options: Record<string, any>): Record<string, any>;
export function verifyEvidenceManifest(manifest: Record<string, any>, options?: { hashField?: string }): {
  valid: boolean;
  expected: string | null;
  actual: string | null;
};
