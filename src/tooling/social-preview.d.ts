export const LAYOUTS: readonly string[];
export const STYLES: readonly string[];
export interface SocialPreviewOptions {
  base: string; out: string; title: string; subtitle: string; eyebrow?: string;
  layout: string; style: string; launchBrowser: () => Promise<any>;
}
export interface SocialPreviewConfig extends Omit<SocialPreviewOptions, 'layout' | 'style'> {
  styleAliases?: Record<string, string>; repoRoot: string; productionOut: string; layout?: string; style?: string;
}
export function buildSocialPreviewHtml(options: Omit<SocialPreviewOptions, 'out' | 'launchBrowser' | 'layout' | 'style'> & { layout?: string; style?: string }): string;
export function renderSocialPreview(options: SocialPreviewOptions): Promise<void>;
export function runSocialPreview(argv: string[], config: SocialPreviewConfig): Promise<void>;
