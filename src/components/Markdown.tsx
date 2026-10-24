import { openUrl } from "@tauri-apps/plugin-opener";
import { type ReactNode, useMemo } from "react";

/**
 * Pull request bodies arrive as markdown. This renders the subset GitHub
 * authors actually use — headings, lists, quotes, fences, emphasis, and the
 * raw HTML blocks bots emit (`details`, `summary`, `pre`) — as React nodes, so
 * nothing is injected as HTML.
 */
type Block =
  | { kind: "p"; text: string }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; lines: string[] }
  | { kind: "rule" }
  | { kind: "details"; summary: string; blocks: Block[] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(?:\s*\1){2,}\s*$/;

const HTML_DETAILS = /^\s*<details\b/i;
const HTML_PRE = /^\s*<pre\b/i;
const HTML_HEADING = /^\s*<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>\s*$/i;
const HTML_PARAGRAPH = /^\s*<p\b/i;
const HTML_LIST = /^\s*<(ul|ol)\b/i;
const HTML_QUOTE = /^\s*<blockquote\b/i;
const HTML_RULE = /^\s*<hr\b[^>]*\/?>\s*$/i;
const HTML_BREAK = /^\s*<br\b[^>]*\/?>\s*$/i;

const HTML_BLOCK = /^\s*<(?:details|pre|p|ul|ol|blockquote|h[1-6]|hr|br)\b/i;
/** `[//]: # (marker)` is a link definition; GitHub renders it as nothing. */
const REFERENCE_COMMENT = /^\s*\[[^\]]*\]:\s*#/;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
};

function decodeEntities(text: string): string {
  return text.replace(
    /&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi,
    (match, code: string) => {
      if (code.startsWith("#")) {
        const hex = code.toLowerCase().startsWith("#x");
        const value = Number.parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
        if (Number.isFinite(value) && value > 0 && value <= 0x10ffff) {
          return String.fromCodePoint(value);
        }
        return match;
      }
      return NAMED_ENTITIES[code.toLowerCase()] ?? match;
    },
  );
}

/** HTML that GitHub renders inline, rewritten to the markdown parsed below. */
function htmlInline(text: string): string {
  const rewritten = text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(
      /<code\b[^>]*>([\s\S]*?)<\/code>/gi,
      (_match, code: string) => `\`${code}\``,
    )
    .replace(
      /<a\b[^>]*?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_match, href: string, label: string) => `[${label}](${href})`,
    )
    .replace(
      /<\/?(?:em|strong|b|i|u|s|del|ins|sup|sub|mark|small)\b[^>]*>/gi,
      "",
    );
  /* Anything left over — img, kbd, table cells — keeps its text, not its tag. */
  return decodeEntities(rewritten.replace(/<\/?[a-z][^>]*>/gi, ""));
}

/** Collects lines from `start` up to and including the line that closes `close`. */
function collect(
  current: string,
  lines: string[],
  start: number,
  close: RegExp,
): { body: string[]; next: number } {
  const body: string[] = [];
  let text = current;
  let index = start;

  while (index < lines.length) {
    const at = text.search(close);
    index += 1;

    if (at >= 0) {
      body.push(text.slice(0, at));
      break;
    }

    body.push(text);
    text = lines[index] ?? "";
  }

  return { body, next: index };
}

function takeDetails(
  lines: string[],
  start: number,
): { inner: string[]; next: number } {
  const inner: string[] = [];
  let depth = 0;
  let index = start;

  while (index < lines.length) {
    const current = lines[index];
    depth += (current.match(/<details\b/gi) ?? []).length;
    depth -= (current.match(/<\/details\s*>/gi) ?? []).length;
    index += 1;

    if (depth < 0) break;
    inner.push(current);
  }

  return { inner, next: index };
}

function takeSummary(inner: string[]): { summary: string; rest: string[] } {
  const at = inner.findIndex((line) => /<summary\b/i.test(line));
  if (at < 0) return { summary: "", rest: inner };

  const collected: string[] = [];
  let end = at;

  while (end < inner.length) {
    collected.push(inner[end]);
    const closed = /<\/summary\s*>/i.test(inner[end]);
    end += 1;
    if (closed) break;
  }

  const summary = htmlInline(
    collected
      .join(" ")
      .replace(/^[\s\S]*?<summary\b[^>]*>/i, "")
      .replace(/<\/summary\s*>[\s\S]*$/i, "")
      .trim(),
  );

  return { summary, rest: [...inner.slice(0, at), ...inner.slice(end)] };
}

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  /* Bots leave HTML markers such as `<!-- raw HTML omitted -->`; GitHub hides them. */
  const lines = text.replace(/<!--[\s\S]*?-->/g, "").split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    if (line.trimStart().startsWith("```")) {
      const body: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !lines[index].trimStart().startsWith("```")
      ) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({ kind: "code", lines: body });
      continue;
    }

    if (REFERENCE_COMMENT.test(line)) {
      index += 1;
      continue;
    }

    if (HTML_DETAILS.test(line)) {
      const details = takeDetails(lines, index + 1);
      const { summary, rest } = takeSummary(details.inner);
      blocks.push({ kind: "details", summary, blocks: parse(rest.join("\n")) });
      index = details.next;
      continue;
    }

    if (HTML_PRE.test(line)) {
      const collected = collect(
        line.replace(/^\s*<pre\b[^>]*>/i, ""),
        lines,
        index,
        /<\/pre\s*>/i,
      );
      index = collected.next;
      const code = collected.body
        .join("\n")
        .replace(/^\s*<code\b[^>]*>/i, "")
        .replace(/<\/code\s*>\s*$/i, "");
      blocks.push({ kind: "code", lines: decodeEntities(code).split("\n") });
      continue;
    }

    const htmlHeading = HTML_HEADING.exec(line);
    if (htmlHeading) {
      blocks.push({
        kind: "heading",
        level: Number(htmlHeading[1]),
        text: htmlInline(htmlHeading[2].trim()),
      });
      index += 1;
      continue;
    }

    if (HTML_PARAGRAPH.test(line)) {
      const collected = collect(
        line.replace(/^\s*<p\b[^>]*>/i, ""),
        lines,
        index,
        /<\/p\s*>/i,
      );
      index = collected.next;
      const paragraph = collected.body.join(" ").trim();
      if (paragraph !== "") {
        blocks.push({ kind: "p", text: htmlInline(paragraph) });
      }
      continue;
    }

    if (HTML_LIST.test(line)) {
      const ordered = /^\s*<ol\b/i.test(line);
      const tag = ordered ? "ol" : "ul";
      const collected = collect(
        line.replace(new RegExp(`^\\s*<${tag}\\b[^>]*>`, "i"), ""),
        lines,
        index,
        new RegExp(`</${tag}\\s*>`, "i"),
      );
      index = collected.next;
      const items = collected.body
        .join(" ")
        .split(/<\/li\s*>/i)
        .map((item) => item.replace(/^[\s\S]*?<li\b[^>]*>/i, "").trim())
        .filter((item) => item !== "");
      if (items.length > 0) {
        blocks.push({ kind: "list", ordered, items: items.map(htmlInline) });
      }
      continue;
    }

    if (HTML_QUOTE.test(line)) {
      const collected = collect(
        line.replace(/^\s*<blockquote\b[^>]*>/i, ""),
        lines,
        index,
        /<\/blockquote\s*>/i,
      );
      index = collected.next;
      blocks.push(...parse(collected.body.join("\n")));
      continue;
    }

    if (HTML_RULE.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (HTML_BREAK.test(line)) {
      index += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        text: heading[2].trim(),
      });
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (BULLET.test(line) || NUMBERED.test(line)) {
      const ordered = NUMBERED.test(line);
      const pattern = ordered ? NUMBERED : BULLET;
      const items: string[] = [];
      while (index < lines.length) {
        const item = pattern.exec(lines[index]);
        if (!item) break;
        items.push(item[1].trim());
        index += 1;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    if (QUOTE.test(line)) {
      const quoted: string[] = [];
      while (index < lines.length) {
        const quote = QUOTE.exec(lines[index]);
        if (!quote) break;
        quoted.push(quote[1].trim());
        index += 1;
      }
      blocks.push({ kind: "quote", text: quoted.join(" ") });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() !== "") {
      const next = lines[index];
      if (
        HEADING.test(next) ||
        BULLET.test(next) ||
        NUMBERED.test(next) ||
        QUOTE.test(next) ||
        RULE.test(next) ||
        HTML_BLOCK.test(next) ||
        REFERENCE_COMMENT.test(next) ||
        next.trimStart().startsWith("```")
      ) {
        break;
      }
      paragraph.push(next.trim());
      index += 1;
    }
    if (paragraph.length > 0) {
      blocks.push({ kind: "p", text: paragraph.join(" ") });
    } else {
      index += 1;
    }
  }

  return blocks;
}

const INLINE =
  /(\[!\[[^\]]*\]\([^)\s]+\)\]\([^)\s]+\))|(!\[[^\]]*\]\([^)\s]+\))|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;

function openLink(url: string) {
  void openUrl(url).catch(() => undefined);
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > cursor) nodes.push(text.slice(cursor, at));

    if (token.startsWith("[![")) {
      /* A badge: the label is an image, so the alt text links to the reference. */
      const badge = /^\[!\[([^\]]*)\]\([^)\s]+\)\]\(([^)\s]+)\)$/.exec(token);
      if (badge) {
        nodes.push(
          <a
            key={key++}
            href={badge[2]}
            rel="noreferrer"
            onClick={(event) => {
              event.preventDefault();
              openLink(badge[2]);
            }}
          >
            {badge[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("![")) {
      /* An image is not loaded from the body; its alt text stands in. */
      const alt = /^!\[([^\]]*)\]/.exec(token)?.[1] ?? "";
      if (alt !== "") nodes.push(alt);
    } else if (token.startsWith("`")) {
      nodes.push(<code key={key++}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={key++}>{inline(token.slice(2, -2))}</strong>);
    } else if (token.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(token);
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            rel="noreferrer"
            onClick={(event) => {
              event.preventDefault();
              openLink(link[2]);
            }}
          >
            {inline(link[1])}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else {
      nodes.push(<em key={key++}>{inline(token.slice(1, -1))}</em>);
    }

    cursor = at + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function render(block: Block, key: number): ReactNode {
  switch (block.kind) {
    case "heading": {
      /* The page title is the h1, so body headings start at h2. */
      const level = Math.min(block.level + 1, 6);
      const Tag = `h${level}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return <Tag key={key}>{inline(block.text)}</Tag>;
    }
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag key={key}>
          {block.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </Tag>
      );
    }
    case "quote":
      return <blockquote key={key}>{inline(block.text)}</blockquote>;
    case "code":
      return (
        <pre key={key}>
          <code>{block.lines.join("\n")}</code>
        </pre>
      );
    case "rule":
      return <hr key={key} />;
    case "details":
      return (
        <details key={key}>
          <summary>{inline(block.summary)}</summary>
          {block.blocks.map(render)}
        </details>
      );
    default:
      return <p key={key}>{inline(block.text)}</p>;
  }
}

export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parse(text), [text]);
  return <div className="app-md">{blocks.map(render)}</div>;
}
