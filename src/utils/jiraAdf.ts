/**
 * Utilities for Atlassian Document Format (ADF) used by Jira Cloud REST API v3.
 * Converts OSIM's Jira markup (used in internal comment editor) to ADF for posting.
 */

type AdfTextNode = {
  marks?: Array<{ attrs?: Record<string, any>; type: string }>;
  text: string;
  type: 'text';
};

type AdfMentionNode = {
  attrs: { accessLevel: string; id: string; text: string };
  type: 'mention';
};

type AdfInlineNode = AdfMentionNode | AdfTextNode;

type AdfParagraphNode = {
  content: AdfInlineNode[];
  type: 'paragraph';
};

type AdfCodeBlockNode = {
  attrs: { language: string };
  content: [AdfTextNode];
  type: 'codeBlock';
};

type AdfBlockquoteNode = {
  content: AdfParagraphNode[];
  type: 'blockquote';
};

type AdfBlockNode = AdfBlockquoteNode | AdfCodeBlockNode | AdfParagraphNode;

export type AdfDoc = {
  content: AdfBlockNode[];
  type: 'doc';
  version: 1;
};

function parseLinksAndMentions(text: string): AdfInlineNode[] {
  const mentionOrLink = new RegExp(
    String.raw`\[~accountid:(?<accountId>[^\]]+)\]` +
    String.raw`|\[(?<linkText>[^|\]]+)\|(?<linkHref>https?://[^\]]+)\]` +
    String.raw`|\[(?<smartHref>https?://[^\]|]+)\|smart-link\]`,
    'g',
  );
  const nodes: AdfInlineNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(mentionOrLink)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      nodes.push({ text: text.slice(lastIndex, matchIndex), type: 'text' });
    }

    const { accountId, linkHref, linkText, smartHref } = match.groups!;
    if (accountId) {
      nodes.push({ attrs: { accessLevel: '', id: accountId, text: `@${accountId}` }, type: 'mention' });
    } else {
      const href = linkHref ?? smartHref;
      nodes.push({ marks: [{ attrs: { href }, type: 'link' }], text: linkText ?? smartHref, type: 'text' });
    }

    lastIndex = matchIndex + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push({ text: text.slice(lastIndex), type: 'text' });
  }

  return nodes;
}

function textToBlocks(text: string): AdfParagraphNode[] {
  return text
    .split(/\n/)
    .map(line => ({
      content: parseLinksAndMentions(line),
      type: 'paragraph' as const,
    }))
    .filter(p => p.content.length > 0);
}

/**
 * Converts Jira markup to ADF.
 * Handles: plain text, {noformat} code blocks, {quote} blockquotes,
 * [~accountid:UUID] mentions, [text|url] links, [url|smart-link] smart links.
 */
export function jiraMarkupToAdf(markup: string): AdfDoc {
  const content: AdfBlockNode[] = [];
  const blockPattern = /\{noformat\}([\s\S]*?)\{noformat\}|\{quote\}([\s\S]*?)\{quote\}/g;

  let lastIndex = 0;
  let match: null | RegExpExecArray;

  while ((match = blockPattern.exec(markup)) !== null) {
    if (match.index > lastIndex) {
      content.push(...textToBlocks(markup.slice(lastIndex, match.index)));
    }

    if (match[1] !== undefined) {
      content.push({
        attrs: { language: '' },
        content: [{ text: match[1], type: 'text' }],
        type: 'codeBlock',
      });
    } else if (match[2] !== undefined) {
      content.push({
        content: textToBlocks(match[2]),
        type: 'blockquote',
      });
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < markup.length) {
    content.push(...textToBlocks(markup.slice(lastIndex)));
  }

  if (content.length === 0) {
    content.push({ content: [], type: 'paragraph' });
  }

  return { content, type: 'doc', version: 1 };
}
