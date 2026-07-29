/**
 * DbContentProvider — Prisma-backed implementation.
 * Module 0 ships StaticContentProvider for zero-config local runs.
 * Enable by setting CONTENT_PROVIDER=db and DATABASE_URL, then implement query methods.
 */
import type { ContentProvider } from "./provider";
import { StaticContentProvider } from "./static-provider";

export class DbContentProvider extends StaticContentProvider implements ContentProvider {
  // Placeholder: extends static until Neon is provisioned; swap method bodies to Prisma queries.
}
