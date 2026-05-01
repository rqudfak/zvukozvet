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

/** Иконка жанра: новые файлы в storage/app/public/genres (URL /storage/genres/…), старые — public/images/genres. */
export function buildGenreIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  const normalized = icon.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith("genres/")) {
    return buildStorageUrl(normalized);
  }
  const name = normalized.includes("/") ? normalized.split("/").pop() ?? normalized : normalized;
  return `${PUBLIC_API_BASE}/images/genres/${encodeURIComponent(name)}`;
}
