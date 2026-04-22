<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnnouncementResponse extends Model
{
    use HasFactory;

    protected $fillable = [
        'announcement_id',
        'user_id',
        'message',
        'audio_path',
        'status',
    ];

    public const STATUSES = [
        'Не проверено',
        'На рассмотрении',
        'Принято',
        'Отклонено',
    ];

    public function announcement()
    {
        return $this->belongsTo(Announcement::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

