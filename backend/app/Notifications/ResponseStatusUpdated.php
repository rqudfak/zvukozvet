<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\AnnouncementResponse;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ResponseStatusUpdated extends Notification
{
    use Queueable;

    public function __construct(
        public Announcement $announcement,
        public AnnouncementResponse $response,
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
            'kind' => 'response_status_updated',
            'message' => 'Статус вашего отклика обновлён: "' . $this->oldStatus . '" → "' . $this->newStatus . '" (объявление: ' . $this->announcement->title . ')',
            'url' => route('announcements.show', $this->announcement),
        ];
    }
}

