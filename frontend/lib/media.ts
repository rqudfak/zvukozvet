import { API_URL } from "@/lib/api";

/** Корень Laravel public (без /api): `/images`, `/storage`. */
function resolveBackendPublicOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const api = (process.env.NEXT_PUBLIC_API_URL ?? API_URL)?.trim();
  if (!api) return "";
  const withoutApi = api.replace(/\/api(?:\/v\d+)?\/?$/i, "").replace(/\/+$/, "");
  return withoutApi || api.replace(/\/+$/, "");
}

const PUBLIC_API_BASE = resolveBackendPublicOrigin() || "http://45.9.40.4";

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

/** Иконка достижения: `backend/public/images/achievements/{icon}`. */
export function buildAchievementIconUrl(icon?: string | null): string | null {
  if (!icon?.trim()) return null;
  const filename =
    icon.trim().replace(/\\/g, "/").split("/").pop() ?? icon.trim();
  if (!filename) return null;
  const base = resolveBackendPublicOrigin() || PUBLIC_API_BASE;
  return `${base.replace(/\/+$/, "")}/images/achievements/${encodeURIComponent(filename)}`;
}

/** Иконка жанра: новые файлы в storage/app/public/genres (URL /storage/genres/…), старые — public/images/genres. */
export function buildGenreIconUrl(icon?: string | null): string | null {
  if (!icon) return null;
  
  // Извлекаем только имя файла
  const filename = icon.includes('/') ? icon.split('/').pop() : icon;
  
  // Формируем прямой URL к storage
  return `http://45.9.40.4/storage/genres/${encodeURIComponent(filename || icon)}`;
}
