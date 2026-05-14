export type AchievementCategoryKey =
  | "announcements"
  | "responses"
  | "portfolio"
  | "reviews"
  | "activity"
  | "other";

export const ACHIEVEMENT_CATEGORY_ORDER: {
  key: AchievementCategoryKey;
  title: string;
}[] = [
  { key: "announcements", title: "Объявления" },
  { key: "portfolio", title: "Портфолио" },
  { key: "reviews", title: "Отзывы" },
  { key: "responses", title: "Отклики" },
  { key: "activity", title: "Активность на сайте" },
  { key: "other", title: "Прочее" },
];

const CODE_TO_CATEGORY: Record<string, AchievementCategoryKey> = {
  first_announcement: "announcements",
  accepted_someone: "announcements",
  first_response: "responses",
  response_accepted: "responses",
  first_portfolio_item: "portfolio",
  portfolio_three: "portfolio",
  first_review_given: "reviews",
  first_review_received: "reviews",
  five_reviews: "reviews",
  star_rating: "reviews",
  first_month: "activity",
};

export function achievementCategoryKeyForCode(
  code: string | null | undefined,
): AchievementCategoryKey {
  if (!code) return "other";
  return CODE_TO_CATEGORY[code] ?? "other";
}

export function groupAchievementsByCategory<T extends { id: number; code?: string | null }>(
  list: T[],
): { key: AchievementCategoryKey; title: string; items: T[] }[] {
  const buckets = new Map<AchievementCategoryKey, T[]>();
  for (const { key } of ACHIEVEMENT_CATEGORY_ORDER) {
    buckets.set(key, []);
  }
  for (const item of list) {
    const k = achievementCategoryKeyForCode(item.code);
    buckets.get(k)!.push(item);
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => a.id - b.id);
  }
  return ACHIEVEMENT_CATEGORY_ORDER.map(({ key, title }) => ({
    key,
    title,
    items: buckets.get(key)!,
  })).filter((section) => section.items.length > 0);
}
