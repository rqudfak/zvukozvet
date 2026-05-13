export const ANNOUNCEMENT_TIMBRE_OPTIONS = [
  "Тенор",
  "Баритон",
  "Бас",
  "Дискант",
  "Альт",
  "Сопрано",
  "Меццо-сопрано",
  "Контральто",
  "Не указано",
] as const;

export type AnnouncementTimbreOption = (typeof ANNOUNCEMENT_TIMBRE_OPTIONS)[number];

export function formatAnnouncementTimbresDisplay(timbres: string[] | null | undefined): string {
  if (!timbres || timbres.length === 0) return "Не указано";
  return timbres.join(", ");
}

/** Взаимоисключающее «Не указано» с остальными тембрами. */
export function toggleAnnouncementTimbreSelection(previous: string[], timbre: string): string[] {
  if (timbre === "Не указано") {
    return ["Не указано"];
  }
  const withoutUnknown = previous.filter((t) => t !== "Не указано");
  const has = withoutUnknown.includes(timbre);
  const next = has ? withoutUnknown.filter((t) => t !== timbre) : [...withoutUnknown, timbre];
  return next.length === 0 ? ["Не указано"] : next;
}
