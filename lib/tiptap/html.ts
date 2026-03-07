import "server-only";
import type { Json } from "@/types/database";

// ---------------------------------------------------------------------------
// Lightweight Tiptap JSON → HTML serializer — no DOM required.
// Tiptap v3's generateHTML calls elementFromString (window.DOMParser) during
// extension schema initialisation, crashing in the Next.js server environment.
// This pure-JS implementation handles all node and mark types used by the app.
// ---------------------------------------------------------------------------

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderMarks(text: string, marks: TiptapMark[]): string {
  return marks.reduce((inner, mark) => {
    switch (mark.type) {
      case "bold": return `<strong>${inner}</strong>`;
      case "italic": return `<em>${inner}</em>`;
      case "code": return `<code>${inner}</code>`;
      case "strike": return `<s>${inner}</s>`;
      case "underline": return `<u>${inner}</u>`;
      case "link": {
        const href = escapeHtml(String(mark.attrs?.href ?? ""));
        const target = mark.attrs?.target ? ` target="${escapeHtml(String(mark.attrs.target))}"` : "";
        return `<a href="${href}"${target}>${inner}</a>`;
      }
      default: return inner;
    }
  }, escapeHtml(text));
}

function renderNode(node: TiptapNode): string {
  if (node.type === "text") {
    const text = node.text ?? "";
    return node.marks?.length ? renderMarks(text, node.marks) : escapeHtml(text);
  }

  const children = (node.content ?? []).map(renderNode).join("");

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `<h${level}>${children}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock": {
      const lang = node.attrs?.language ? ` class="language-${escapeHtml(String(node.attrs.language))}"` : "";
      return `<pre><code${lang}>${children}</code></pre>`;
    }
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const src = escapeHtml(String(node.attrs?.src ?? ""));
      const alt = escapeHtml(String(node.attrs?.alt ?? ""));
      const title = node.attrs?.title ? ` title="${escapeHtml(String(node.attrs.title))}"` : "";
      return `<img src="${src}" alt="${alt}"${title}>`;
    }
    case "table":
      return `<table>${children}</table>`;
    case "tableRow":
      return `<tr>${children}</tr>`;
    case "tableHeader":
      return `<th>${children}</th>`;
    case "tableCell":
      return `<td>${children}</td>`;
    default:
      return children;
  }
}

/**
 * Converts Tiptap JSON stored in document_versions.rich_text_json to an
 * HTML string. Server-side only — never expose raw HTML to the client bundle.
 */
export function tiptapJsonToHtml(json: Json): string {
  try {
    return renderNode(json as unknown as TiptapNode);
  } catch {
    return "<p>Could not render document content.</p>";
  }
}
