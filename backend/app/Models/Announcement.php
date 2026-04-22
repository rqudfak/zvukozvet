<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Announcement extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'type',
        'genre',
        'genre_icon',
        'color',
        'languages',
        'gender',
        'duration',
        'description',
        'status',
        'fragment'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // цвета к жанрам
    public static function getColorByGenre($genre)
    {
        // Сначала пытаемся найти цвет в таблице жанров
        $genreModel = Genre::where('name', $genre)->first();
        if ($genreModel) {
            return $genreModel->color;
        }        
    }

    // иконки к жанрам
    public static function getIconByGenre($genre)
    {
        // Сначала пытаемся найти иконку в таблице жанров
        $genreModel = Genre::where('name', $genre)->first();
        if ($genreModel && $genreModel->icon) {
            return $genreModel->icon;
        }

        
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function responses()
    {
        return $this->hasMany(AnnouncementResponse::class);
    }
}
