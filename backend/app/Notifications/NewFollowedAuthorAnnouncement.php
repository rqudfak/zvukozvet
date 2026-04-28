<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewFollowedAuthorAnnouncement extends Notification
{
    use Queueable;

    public function __construct(
        public Announcement $announcement,
        public User $author,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'followed_author_announcement',
            'message' => 'Автор, на которого вы подписаны (' . $this->author->name . '), опубликовал новое объявление: "' . $this->announcement->title . '".',
            'url' => route('announcements.show', $this->announcement),
        ];
    }
}
