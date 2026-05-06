<?php

namespace App\Support;

use App\Models\Announcement;

/**
 * Целевая ссылка из уведомления: если объявление удалено, ведём на список уведомлений.
 */
final class NotificationTargetUrl
{
    public static function resolve(?string $url): string
    {
        if (!is_string($url) || $url === '') {
            return '/notifications';
        }

        $announcementId = self::extractAnnouncementId($url);
        if ($announcementId !== null && !Announcement::query()->whereKey($announcementId)->exists()) {
            return '/notifications';
        }

        return $url;
    }

    private static function extractAnnouncementId(string $url): ?int
    {
        if (!preg_match('#/announcements/(\d+)(?:/|$|\?|#)#', $url, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }
}
