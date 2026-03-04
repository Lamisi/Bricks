import "server-only";
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import type { Json } from "@/types/database";

const EXTENSIONS = [StarterKit, TiptapImage, Table, TableRow, TableHeader, TableCell];

/**
 * Converts Tiptap JSON stored in document_versions.rich_text_json to an
 * HTML string. Server-side only — never expose raw HTML to the client bundle.
 */
export function tiptapJsonToHtml(json: Json): string {
  try {
    return generateHTML(
      json as Parameters<typeof generateHTML>[0],
      EXTENSIONS,
    );
  } catch {
    return "<p>Could not render document content.</p>";
  }
}
