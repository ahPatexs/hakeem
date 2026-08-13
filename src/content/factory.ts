import { DbContentProvider } from "./db-provider";
import { StaticContentProvider } from "./static-provider";
import type { ContentProvider } from "./provider";

let cachedProvider: ContentProvider | null = null;

export function getContentProvider(): ContentProvider {
  if (cachedProvider) return cachedProvider;
  cachedProvider = process.env.DATABASE_URL
    ? new DbContentProvider()
    : new StaticContentProvider();
  return cachedProvider;
}
