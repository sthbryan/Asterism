import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "@/components/Markdown";

const body = `## Summary

- Refresh the **desktop** theme.
- Register \`opencode2\` alongside \`opencode\`.

## Validation

1. Build passed.

\`\`\`
bun test
\`\`\`

> Beta only.`;

const dependabotBody = `Bumps [tauri-plugin-dialog](https://example.com/repo) from 2.8.1 to 2.8.2.
<details>
<summary>Release notes</summary>
<p><em>Sourced from <a href="https://example.com/releases">releases</a>.</em></p>
<blockquote>
<h2>dialog v2.8.2</h2>
<ul>
<li><a href="https://example.com/commit/84895756"><code>84895756</code></a> Fix <code>confirm</code> &amp; friends</li>
</ul>
<!-- raw HTML omitted -->
<pre><code>npm notice &quot;repository&quot;
&lt;h2&gt;[2.8.2]&lt;/h2&gt;
</code></pre>
</blockquote>
<p>... (truncated)</p>
</details>
<details>
<summary>Commits</summary>
<ul>
<li><a href="https://example.com/commit/6bbd44d"><code>6bbd44d</code></a> publish new versions</li>
</ul>
</details>
<br />

[//]: # (dependabot-automerge-start)
[//]: # (dependabot-automerge-end)`;

function html(text: string) {
  return renderToStaticMarkup(<Markdown text={text} />);
}

describe("pull body markdown", () => {
  test("renders headings and lists instead of raw syntax", () => {
    const out = html(body);
    expect(out).not.toContain("##");
    expect(out).toContain("<h3>Summary</h3>");
    expect(out).toContain("<h3>Validation</h3>");
    expect(out.match(/<li>/g) ?? []).toHaveLength(3);
    expect(out).toContain("<ol>");
    expect(out).toContain("<ul>");
  });

  test("keeps code, emphasis and fences out of the paragraph flow", () => {
    const out = html(body);
    expect(out).toContain("<code>opencode2</code>");
    expect(out).toContain("<strong>desktop</strong>");
    expect(out).toContain("<pre><code>bun test</code></pre>");
    expect(out).toContain("<blockquote>Beta only.</blockquote>");
  });

  test("joins wrapped lines into one paragraph", () => {
    const out = html("A focused inbox\nfor the repositories you follow.");
    expect(out).toBe(
      '<div class="app-md"><p>A focused inbox for the repositories you follow.</p></div>',
    );
  });

  test("does not render html from the body", () => {
    const out = html("<img src=x onerror=alert(1)>");
    expect(out).toContain("&lt;img");
    expect(out).not.toContain("<img");
  });

  test("renders the html blocks bots put in pull request bodies", () => {
    const out = html(dependabotBody);
    expect(out).toContain("<details><summary>Release notes</summary>");
    expect(out).toContain("<summary>Commits</summary>");
    expect(out).toContain("<h3>dialog v2.8.2</h3>");
    expect(out).not.toContain("&lt;details");
    expect(out).not.toContain("&lt;summary");
    expect(out).not.toContain("&lt;p&gt;");
    expect(out).not.toContain("raw HTML omitted");
  });

  test("renders html lists, links and code as nodes", () => {
    const out = html(dependabotBody);
    expect(out).toContain("<li>");
    expect(out).toContain('<a href="https://example.com/commit/84895756"');
    expect(out).toContain("<code>84895756</code>");
    expect(out).toContain("<code>confirm</code>");
  });

  test("decodes entities once, including inside preformatted html", () => {
    const out = html(dependabotBody);
    expect(out).toContain("&amp; friends");
    expect(out).not.toContain("&amp;amp;");
    expect(out).toContain("&lt;h2&gt;[2.8.2]&lt;/h2&gt;");
    expect(out).not.toContain("&amp;lt;");
    expect(out).toContain("npm notice &quot;repository&quot;");
    expect(out).not.toContain("&amp;quot;");
  });

  test("drops reference comments and keeps image alt text", () => {
    const out = html(
      "[//]: # (dependabot-automerge-start)\n\n![compatibility 64%](https://example.com/badge.svg)",
    );
    expect(out).not.toContain("dependabot-automerge");
    expect(out).toContain("compatibility 64%");
    expect(out).not.toContain("<img");
  });

  test("keeps a badge's alt text as the link label", () => {
    const out = html(
      "[![compatibility 64%](https://example.com/badge.svg)](https://example.com/docs)",
    );
    expect(out).toContain('href="https://example.com/docs"');
    expect(out).toContain(">compatibility 64%</a>");
    expect(out).not.toContain("![");
  });
});
