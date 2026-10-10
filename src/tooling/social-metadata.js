import { escapeHtml } from './image.js';

export const METADATA_START = '<!-- social-metadata:start -->';
export const METADATA_END = '<!-- social-metadata:end -->';

function publicRoot(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('publicUrl must be an HTTP(S) URL without credentials, query or fragment');
  }
  return url.href.replace(/\/?$/, '/');
}

export function buildSocialMetadata({ publicUrl, title, siteName, description, imagePath,
  imageAlt, imageWidth = 1200, imageHeight = 630, imageType = 'image/jpeg',
  locale = 'en_US', themeColor, robots = 'index, follow' }) {
  const canonical = publicRoot(publicUrl);
  const image = new URL(imagePath, canonical).href;
  if (!['https:', 'http:'].includes(new URL(image).protocol)) throw new Error('Image must use HTTP(S)');
  const tag = (key, value, property = false) => `<meta ${property ? 'property' : 'name'}="${key}" content="${escapeHtml(value)}" />`;
  return [
    `<title>${escapeHtml(title)}</title>`,
    tag('description', description), tag('application-name', siteName),
    tag('apple-mobile-web-app-title', siteName), tag('robots', robots),
    ...(themeColor ? [tag('theme-color', themeColor)] : []),
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ...Object.entries({ 'og:type': 'website', 'og:url': canonical, 'og:site_name': siteName,
      'og:title': title, 'og:description': description, 'og:locale': locale,
      'og:image': image, 'og:image:type': imageType, 'og:image:width': imageWidth,
      'og:image:height': imageHeight, 'og:image:alt': imageAlt }).map(([key, value]) => tag(key, value, true)),
    ...Object.entries({ 'twitter:card': 'summary_large_image', 'twitter:title': title,
      'twitter:description': description, 'twitter:image': image, 'twitter:image:alt': imageAlt })
      .map(([key, value]) => tag(key, value))
  ].join('\n    ');
}

export function injectSocialMetadata(html, config) {
  const start = html.indexOf(METADATA_START);
  const end = html.indexOf(METADATA_END, start);
  if (start < 0 || end < start) throw new Error('HTML social metadata markers are required');
  return html.slice(0, start + METADATA_START.length) + '\n    ' + buildSocialMetadata(config)
    + '\n    ' + html.slice(end);
}

export function buildCrawlerDocuments(publicUrl) {
  const root = publicRoot(publicUrl);
  return {
    robots: `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${new URL('sitemap.xml', root).href}\n`,
    sitemap: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeHtml(root)}</loc></url></urlset>\n`
  };
}
