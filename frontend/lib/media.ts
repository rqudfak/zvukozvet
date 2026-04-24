import { API_URL } from "@/lib/api";

const PUBLIC_API_BASE = API_URL.replace(/\/api\/?$/, "");

export function buildStorageUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;

  if (/^https?:\/\//i.test(rawPath)) {
    return rawPath;
  }

  const normalizedPath = rawPath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^storage\/+/, "");

  return `${PUBLIC_API_BASE}/storage/${normalizedPath}`;
}
