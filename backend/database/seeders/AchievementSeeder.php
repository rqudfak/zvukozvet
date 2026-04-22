<?php

namespace Database\Seeders;

use App\Models\Achievement;
use Illuminate\Database\Seeder;

class AchievementSeeder extends Seeder
{
    public function run(): void
    {
        $achievements = [
            [
                'code' => 'first_announcement',
                'name' => 'Первое объявление',
                'description' => 'Создайте своё первое объявление.',
                'icon' => 'first_announcement.svg',
            ],
            [
                'code' => 'first_response',
                'name' => 'Первый отклик',
                'description' => 'Отправьте свой первый отклик с аудио.',
                'icon' => 'first_response.svg',
            ],
            [
                'code' => 'response_accepted',
                'name' => 'Отклик принят',
                'description' => 'Ваш отклик приняли в объявлении.',
                'icon' => 'response_accepted.svg',
            ],
            [
                'code' => 'accepted_someone',
                'name' => 'Выбрали актёра',
                'description' => 'Примите отклик в своём объявлении.',
                'icon' => 'accepted_someone.svg',
            ],
            [
                'code' => 'first_portfolio_item',
                'name' => 'Первое портфолио',
                'description' => 'Добавьте первую запись в портфолио.',
                'icon' => 'first_portfolio.svg',
            ],
            [
                'code' => 'first_review_given',
                'name' => 'Первый отзыв',
                'description' => 'Оставьте первый отзыв после принятого отклика.',
                'icon' => 'first_review.svg',
            ],
            [
                'code' => 'first_review_received',
                'name' => 'Вас оценили',
                'description' => 'Получите свой первый отзыв.',
                'icon' => 'first_review_received.svg',
            ],
            [
                'code' => 'first_month',
                'name' => 'Месяц на сайте',
                'description' => 'Пользователь находится на сайте уже месяц',
                'icon' => 'first_review_received.svg',
            ],
            [
                'code' => 'five_reviews',
                'name' => 'Пять отзывов',
                'description' => 'Получено 5 отзывов от авторов объявлений',
                'icon' => 'first_review_received.svg',
            ],
            [
                'code' => 'portfolio_three',
                'name' => 'Три записи в портфолио',
                'description' => 'Добавлено 3 аудиозаписи в портфолио',
                'icon' => 'first_review_received.svg',
            ],
            [
                'code' => 'star_rating',
                'name' => 'Отличная оценка',
                'description' => 'Получен отзыв с рейтингом 5 звёзд',
                'icon' => 'first_review_received.svg',
            ],
        ];

        foreach ($achievements as $a) {
            Achievement::updateOrCreate(
                ['code' => $a['code']],
                [
                    'name' => $a['name'],
                    'description' => $a['description'] ?? null,
                    'icon' => $a['icon'] ?? null,
                ]
            );
        }
    }
}
