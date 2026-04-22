<?php

namespace App\Notifications;

use App\Models\Genre;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewGenreAdded extends Notification
{
    use Queueable;

    public function __construct(public Genre $genre) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'kind' => 'new_genre',
            'message' => 'Добавлен новый жанр: ' . $this->genre->name . ' (' . $this->genre->type . ').',
            'url' => route('announcements.index'),
        ];
    }
}

