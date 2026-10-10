export const METADATA_START: string;
export const METADATA_END: string;
export interface SocialMetadataConfig {
  publicUrl: string; title: string; siteName: string; description: string;
  imagePath: string; imageAlt: string; imageWidth?: number; imageHeight?: number;
  imageType?: string; locale?: string; themeColor?: string; robots?: string;
}
export function buildSocialMetadata(config: SocialMetadataConfig): string;
export function injectSocialMetadata(html: string, config: SocialMetadataConfig): string;
export function buildCrawlerDocuments(publicUrl: string): { robots: string; sitemap: string };
