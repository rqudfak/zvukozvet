<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Genre;

class GenreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $genres = [
            ['name' => 'Детектив', 'type' => 'Книга', 'color' => '#C4C3E3', 'icon' => null],
            ['name' => 'Драма', 'type' => 'Книга', 'color' => '#F1642E', 'icon' => null],
            ['name' => 'Комедия', 'type' => 'Книга', 'color' => '#FFC44B', 'icon' => null],
            ['name' => 'Повесть', 'type' => 'Книга', 'color' => '#A3B565', 'icon' => null],
            ['name' => 'Рассказ', 'type' => 'Книга', 'color' => '#A3B565', 'icon' => null],
            ['name' => 'Роман', 'type' => 'Книга', 'color' => '#FFC44B', 'icon' => null],
            ['name' => 'Сказка', 'type' => 'Книга', 'color' => '#FFC44B', 'icon' => null],
            ['name' => 'Стихотворение', 'type' => 'Книга', 'color' => '#C4C3E3', 'icon' => null],
            ['name' => 'Трагедия', 'type' => 'Книга', 'color' => '#C4C3E3', 'icon' => null],
            ['name' => 'Триллер', 'type' => 'Книга', 'color' => '#F1642E', 'icon' => null],
            ['name' => 'Казуальные', 'type' => 'Видеоигра', 'color' => '#F1642E', 'icon' => null],
            ['name' => 'Киберпанк', 'type' => 'Видеоигра', 'color' => '#C4C3E3', 'icon' => null],
            ['name' => 'Наука', 'type' => 'Видеоигра', 'color' => '#A3B565', 'icon' => null],
            ['name' => 'Приключения', 'type' => 'Видеоигра', 'color' => '#A3B565', 'icon' => null],
            ['name' => 'Стратегия', 'type' => 'Видеоигра', 'color' => '#C4C3E3', 'icon' => null],
            ['name' => 'Фэнтези', 'type' => 'Видеоигра', 'color' => '#FFC44B', 'icon' => null],
            ['name' => 'Хоррор', 'type' => 'Видеоигра', 'color' => '#F1642E', 'icon' => null],
            ['name' => 'Экшен', 'type' => 'Видеоигра', 'color' => '#FFC44B', 'icon' => null],
        ];
        foreach ($genres as $genre) {
            Genre::updateOrCreate(
                ['name' => $genre['name']],
                [
                    'type' => $genre['type'],
                    'color' => $genre['color'],
                    'icon' => $genre['icon'],
                ]
            );
        }
    }
}
