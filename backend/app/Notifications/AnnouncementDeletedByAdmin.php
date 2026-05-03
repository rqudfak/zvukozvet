<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AnnouncementDeletedByAdmin extends Notification
{
    use Queueable;

    public const REASON_RULE_VIOLATION = 'rule_violation';

    public const REASON_DUPLICATE = 'duplicate';

    public const REASON_CATEGORY_MISMATCH = 'category_mismatch';

    /** @return array<string, string> */
    public static function reasonLabels(): array
    {
        return [
            self::REASON_RULE_VIOLATION => 'Нарушение правил публикации',
            self::REASON_DUPLICATE => 'Дублирование объявлений',
            self::REASON_CATEGORY_MISMATCH => 'Несоответствие категории',
        ];
    }

    public function __construct(
        public string $announcementTitle,
        public string $reason,
    ) {
        if (!array_key_exists($reason, self::reasonLabels())) {
            throw new \InvalidArgumentException('Unknown deletion reason: ' . $reason);
        }
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = self::reasonLabels()[$this->reason];

        return [
            'kind' => 'announcement_deleted_by_admin',
            'message' => 'Ваше объявление «' . $this->announcementTitle . '» удалено администратором. Причина: ' . $label . '.',
            'url' => '',
        ];
    }
}
