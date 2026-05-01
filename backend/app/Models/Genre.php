<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class Genre extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',      // Книга или Видеоигра
        'color',
        'icon',      // путь на диске public: genres/… или старое имя файла из public/images/genres
    ];

    /** Сохранить загруженную иконку в storage/app/public/genres, вернуть значение для колонки icon (genres/…). */
    public static function storeUploadedIcon(UploadedFile $file): string
    {
        $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($file->getClientOriginalName()));
        $filename = time() . '_' . $safe;

        return $file->storeAs('genres', $filename, 'public');
    }

    /** Удалить файл иконки из public storage (только для путей genres/…). */
    public static function deleteStoredIcon(?string $icon): void
    {
        if (!$icon || !str_starts_with($icon, 'genres/')) {
            return;
        }
        Storage::disk('public')->delete($icon);
    }

    /** Публичный URL иконки (storage или старый каталог images/genres). */
    public static function publicUrlForStoredIcon(?string $icon): ?string
    {
        if (!$icon) {
            return null;
        }
        if (str_starts_with($icon, 'genres/')) {
            return Storage::disk('public')->url($icon);
        }

        return asset('images/genres/' . basename($icon));
    }
}

