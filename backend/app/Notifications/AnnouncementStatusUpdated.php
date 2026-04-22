<?php

namespace App\Notifications;

use App\Models\Announcement;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AnnouncementStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public Announcement $announcement,
        public string $oldStatus,
        public string $newStatus,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'announcement_status_updated',
            'message' => 'Модерация обновила статус вашего объявления "' . $this->announcement->title . '": "' . $this->oldStatus . '" → "' . $this->newStatus . '".',
            'url' => route('announcements.show', $this->announcement),
        ];
    }
}

