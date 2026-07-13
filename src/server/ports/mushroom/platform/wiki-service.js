function requiredDependency(name) {
  return () => {
    throw new Error(`createWikiServicePort requires ${name}`);
  };
}

export function createWikiServicePort(options = {}) {
  const {
    rootDir = '',
    readFile = requiredDependency('readFile'),
    readDirectory = requiredDependency('readDirectory'),
    joinPath = (...parts) => parts.join('/'),
    parseMarkdown = (value) => value,
    lexMarkdown = () => [],
    sections = [],
    gatedSection = '',
    tierThresholds = [],
    summarizeEntry = (entry) => ({
      slug: entry.slug,
      section: entry.section,
      title: entry.title,
      summary: entry.summary,
      imagePath: entry.image
    })
  } = options;

function parseFrontmatter(content) {
  if (!content.startsWith('---\n')) {
    return { meta: {}, body: content.trim() };
  }

  const end = content.indexOf('\n---\n', 4);
  if (end === -1) {
    return { meta: {}, body: content.trim() };
  }

  const rawMeta = content.slice(4, end).trim().split('\n');
  const meta = {};
  for (const line of rawMeta) {
    const [key, ...rest] = line.split(':');
    if (!key || rest.length === 0) {
      continue;
    }
    meta[key.trim()] = rest.join(':').trim();
  }

  return {
    meta,
    body: content.slice(end + 5).trim()
  };
}

// Split a markdown body on <!-- tier:N --> markers.
// Returns [{tier: number, markdown: string}].
// If no markers exist, returns a single section at tier 0.
function parseTierSections(body) {
  const tierRegex = /<!-- tier:(\d+) -->/g;
  const sections = [];
  let lastIndex = 0;
  let lastTier = null;
  let match;

  while ((match = tierRegex.exec(body)) !== null) {
    if (lastTier !== null) {
      const text = body.slice(lastIndex, match.index).trim();
      if (text) sections.push({ tier: lastTier, markdown: text });
    }
    lastTier = parseInt(match[1], 10);
    lastIndex = match.index + match[0].length;
  }

  if (lastTier !== null) {
    const text = body.slice(lastIndex).trim();
    if (text) sections.push({ tier: lastTier, markdown: text });
  }

  if (sections.length === 0) {
    return [{ tier: 0, markdown: body.trim() }];
  }

  return sections;
}

async function readPage(section, slug) {
  const filePath = joinPath(rootDir, section, slug, 'page.md');
  const content = await readFile(filePath, 'utf8');
  const parsed = parseFrontmatter(content);
  const blocks = markdownToBlocks(parsed.body);
  return {
    slug,
    section,
    ...parsed.meta,
    markdown: parsed.body,
    blocks,
    html: parseMarkdown(parsed.body)
  };
}

async function readSection(section) {
  const dirPath = joinPath(rootDir, section);
  const entries = await readDirectory(dirPath, { withFileTypes: true });
  const slugs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const pages = await Promise.all(slugs.map((slug) => readPage(section, slug)));
  return pages.sort((left, right) => Number(left.order || 999) - Number(right.order || 999));
}

async function getWikiHome() {
  const sectionEntries = await Promise.all(sections.map(readSection));
  return Object.fromEntries(sections.map((section, index) => [
    section,
    sectionEntries[index].map(summarizeEntry)
  ]));
}

async function getWikiEntry(section, slug, progressValue = Infinity) {
  const entry = await readPage(section, slug);
  const rawSections = parseTierSections(entry.markdown);
  const relatedSlugs = parseRelatedSlugs(entry.related);

  const isGatedSection = section === gatedSection;

  const sections = rawSections.map(({ tier, markdown }) => {
    const threshold = tierThresholds[tier] ?? 0;
    const locked = isGatedSection && progressValue < threshold;
    const blocks = markdownToBlocks(markdown);
    return {
      tier,
      threshold,
      locked,
      blocks: locked ? [] : blocks,
      html: locked ? null : parseMarkdown(markdown)
    };
  });

  // html = joined visible content (used by tests and legacy callers)
  const html = sections
    .filter((s) => !s.locked)
    .map((s) => s.html)
    .join('\n');

  return {
    ...entry,
    html,
    sections,
    related: relatedSlugs,
    relatedEntries: await resolveRelatedEntries(relatedSlugs)
  };
}

function parseRelatedSlugs(related = '') {
  return String(related)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function resolveRelatedEntries(slugs) {
  if (!slugs.length) {
    return [];
  }

  const sectionEntries = await Promise.all(sections.map(readSection));
  const entriesBySlug = new Map();
  for (const entry of sectionEntries.flat()) {
    entriesBySlug.set(entry.slug, summarizeEntry(entry));
  }

  return slugs
    .map((slug) => entriesBySlug.get(slug))
    .filter(Boolean);
}

function markdownToBlocks(markdown) {
  return tokensToBlocks(lexMarkdown(markdown));
}

function tokensToBlocks(tokens = []) {
  const blocks = [];

  for (const token of tokens) {
    if (token.type === 'space') {
      continue;
    }
    if (token.type === 'heading') {
      blocks.push({
        type: 'heading',
        depth: token.depth,
        text: token.text,
        inline: inlineTokens(token.tokens, token.text)
      });
    } else if (token.type === 'paragraph') {
      blocks.push({
        type: 'paragraph',
        inline: inlineTokens(token.tokens, token.text)
      });
    } else if (token.type === 'list') {
      blocks.push({
        type: 'list',
        ordered: Boolean(token.ordered),
        items: token.items.map((item) => ({
          inline: listItemInlineTokens(item)
        }))
      });
    } else if (token.type === 'blockquote') {
      blocks.push({
        type: 'blockquote',
        blocks: tokensToBlocks(token.tokens)
      });
    } else if (token.type === 'hr') {
      blocks.push({ type: 'hr' });
    } else if (token.type === 'code') {
      blocks.push({ type: 'code', text: token.text, lang: token.lang || '' });
    }
  }

  return blocks;
}

function listItemInlineTokens(item) {
  const tokens = item.tokens || [];
  if (tokens.length === 1 && (tokens[0].type === 'paragraph' || tokens[0].type === 'text')) {
    return inlineTokens(tokens[0].tokens, tokens[0].text);
  }
  const firstInlineToken = tokens.find((token) => token.type === 'paragraph' || token.type === 'text');
  if (firstInlineToken) {
    return inlineTokens(firstInlineToken.tokens, firstInlineToken.text);
  }
  return inlineTokens([], item.text);
}

function inlineTokens(tokens = [], fallback = '') {
  if (!tokens || tokens.length === 0) {
    return fallback ? [{ type: 'text', text: fallback }] : [];
  }

  return tokens.flatMap((token) => {
    if (token.type === 'text') {
      return token.tokens ? inlineTokens(token.tokens, token.text) : [{ type: 'text', text: token.text }];
    }
    if (token.type === 'strong' || token.type === 'em' || token.type === 'del') {
      return [{ type: token.type, children: inlineTokens(token.tokens, token.text) }];
    }
    if (token.type === 'codespan') {
      return [{ type: 'code', text: token.text }];
    }
    if (token.type === 'link') {
      return [{
        type: 'link',
        href: token.href,
        title: token.title || '',
        children: inlineTokens(token.tokens, token.text)
      }];
    }
    if (token.type === 'image') {
      return [{ type: 'image', href: token.href, text: token.text || '' }];
    }
    if (token.type === 'br') {
      return [{ type: 'br' }];
    }
    return token.raw ? [{ type: 'text', text: token.raw }] : [];
  });
}

  return {
    getWikiHome,
    getWikiEntry
  };
}
