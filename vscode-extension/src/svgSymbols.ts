import { DOMParser } from '@xmldom/xmldom';
import type { Element } from '@xmldom/xmldom';

/** Offsets are UTF-16 offsets into the current text, matching TextDocument.positionAt. */
export interface SvgSymbol {
  readonly name: string;
  readonly start: number;
  readonly end: number;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly children: readonly SvgSymbol[];
}

interface OpenTag {
  tag: string;
  start: number;
  end: number;
  selectionEnd: number;
  children: OpenTag[];
}

function after(source: string, delimiter: string, from: number): number {
  const found = source.indexOf(delimiter, from);
  if (found < 0) throw new Error(`Unterminated ${delimiter}`);
  return found + delimiter.length;
}

/** Finds a tag's > outside attribute quotes, including multiline attributes. */
function tagEnd(source: string, from: number): number {
  let quote: string | undefined;
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = undefined;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i + 1;
    }
  }
  throw new Error('Unterminated tag');
}

function scan(source: string): OpenTag[] {
  const roots: OpenTag[] = [];
  const stack: OpenTag[] = [];
  let cursor = 0;
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor);
    if (start < 0) break;
    if (source.startsWith('<!--', start)) {
      cursor = after(source, '-->', start + 4);
      continue;
    }
    if (source.startsWith('<![CDATA[', start)) {
      cursor = after(source, ']]>', start + 9);
      continue;
    }
    if (source.startsWith('<?', start)) {
      cursor = after(source, '?>', start + 2);
      continue;
    }
    if (source.startsWith('<!', start)) throw new Error('Unsupported declaration');

    const end = tagEnd(source, start + 1);
    const tag = source.slice(start, end);
    if (tag.slice(1, -1).includes('<')) throw new Error('Invalid < within tag');
    if (tag.startsWith('</')) {
      const match = /^<\/([A-Za-z_][\w.:-]*)\s*>$/.exec(tag);
      const current = stack.pop();
      if (!match || current?.tag !== match[1]) throw new Error('Mismatched closing tag');
      current!.end = end;
    } else {
      const match = /^<([A-Za-z_][\w.:-]*)/.exec(tag);
      if (!match) throw new Error('Invalid opening tag');
      const node: OpenTag = {
        tag: match[1]!,
        start,
        end,
        selectionEnd: start + 1 + match[1]!.length,
        children: [],
      };
      const parent = stack[stack.length - 1];
      if (parent) parent.children.push(node);
      else roots.push(node);
      if (!/\/\s*>$/.test(tag)) stack.push(node);
    }
    cursor = end;
  }
  if (stack.length) throw new Error('Unclosed element');
  return roots;
}

function attach(element: Element, tag: OpenTag): SvgSymbol {
  if (element.tagName !== tag.tag) throw new Error('XML structure changed while parsing');
  const children: Element[] = [];
  for (let child = element.firstChild; child; child = child.nextSibling) {
    if (child.nodeType === 1) children.push(child as Element);
  }
  if (children.length !== tag.children.length) throw new Error('XML structure mismatch');
  const id = element.getAttribute('id');
  return {
    name: `${element.localName || element.tagName}${id ? '#' + id : ''}`,
    start: tag.start,
    end: tag.end,
    selectionStart: tag.start + 1,
    selectionEnd: tag.selectionEnd,
    children: children.map((child, index) => attach(child, tag.children[index]!)),
  };
}

/**
 * The DOM parser validates the XML and provides actual id attributes. The small lexical
 * scanner supplies exact source ranges (the DOM does not expose closing-tag offsets).
 * Any transient error while editing yields an empty Outline instead of throwing into VS Code.
 */
export function parseSvgSymbols(source: string): readonly SvgSymbol[] {
  if (!source.trim() || /<!DOCTYPE\b|<!ENTITY\b/i.test(source)) return [];
  try {
    const xml = new DOMParser({
      onError: (_level, message) => { throw new Error(message); },
    }).parseFromString(source, 'application/xml');
    const root = xml.documentElement;
    if (!root || root.localName !== 'svg' ||
        (root.namespaceURI && root.namespaceURI !== 'http://www.w3.org/2000/svg')) return [];
    const scanned = scan(source);
    if (scanned.length !== 1) return [];
    return [attach(root, scanned[0]!)];
  } catch {
    return [];
  }
}
