<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewResponseOnYourAnnouncement extends Notification
{
    use Queueable;

    public function __construct(
        public Announcement $announcement,
        public User $responder,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'new_response',
            'message' => 'Новый отклик на ваше объявление "' . $this->announcement->title . '" от пользователя ' . $this->responder->name . '.',
            'url' => route('announcements.show', $this->announcement),
        ];
    }
}

