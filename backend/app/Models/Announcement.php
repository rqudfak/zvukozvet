<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class Announcement extends Model
{
    use HasFactory;

    /** Порядок значений для отображения и нормализации. */
    public const TIMBRE_VALUES = [
        'Тенор',
        'Баритон',
        'Бас',
        'Дискант',
        'Альт',
        'Сопрано',
        'Меццо-сопрано',
        'Контральто',
        'Не указано',
    ];

    protected $fillable = [
        'user_id',
        'title',
        'type',
        'genre',
        'genre_icon',
        'color',
        'languages',
        'gender',
        'timbres',
        'duration',
        'description',
        'status',
        'fragment',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'timbres' => 'array',
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

    /**
     * @param  array<int, mixed>|null  $raw
     * @return array<int, string>
     */
    public static function normalizeTimbres(?array $raw): array
    {
        $raw = $raw ?? [];
        $allowed = self::TIMBRE_VALUES;
        $picked = [];
        foreach ($raw as $value) {
            if (!is_string($value)) {
                continue;
            }
            $trimmed = trim($value);
            if ($trimmed === '' || !in_array($trimmed, $allowed, true)) {
                continue;
            }
            $picked[] = $trimmed;
        }
        $picked = array_values(array_unique($picked));
        if ($picked === []) {
            return ['Не указано'];
        }
        if (in_array('Не указано', $picked, true) && count($picked) > 1) {
            throw ValidationException::withMessages([
                'timbres' => ['Нельзя выбирать «Не указано» вместе с другими тембрами.'],
            ]);
        }
        if (in_array('Не указано', $picked, true)) {
            return ['Не указано'];
        }

        return array_values(array_intersect($allowed, $picked));
    }

    /**
     * @return array<int, string>
     */
    public function timbresForDisplay(): array
    {
        $value = $this->timbres;
        if (!is_array($value) || $value === []) {
            return ['Не указано'];
        }

        return $value;
    }
}
