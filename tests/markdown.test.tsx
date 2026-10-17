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
});
