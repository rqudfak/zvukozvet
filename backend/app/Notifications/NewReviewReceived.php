<?php

namespace App\Notifications;

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewReviewReceived extends Notification
{
    use Queueable;

    public function __construct(
        public User $reviewer,
        public Announcement $announcement,
        public int $rating,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'new_review',
            'message' => 'Новый отзыв от ' . $this->reviewer->name . ' (оценка: ' . $this->rating . '/5) по объявлению "' . $this->announcement->title . '".',
            'url' => route('users.show', $notifiable) . '?tab=reviews',
        ];
    }
}

