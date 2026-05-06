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
        $parts = parse_url($url);
        $path = '';
        if (is_array($parts) && isset($parts['path']) && is_string($parts['path'])) {
            $path = $parts['path'];
        }

        if ($path === '') {
            return null;
        }

        // Только path: иначе id из query (например ?redirect=.../announcements/5) ломал проверку.
        if (!preg_match('#/announcements/(\d+)(?:/|$|\?|#)#', $path, $matches)) {
            return null;
        }

        return (int) $matches[1];
    }
}
