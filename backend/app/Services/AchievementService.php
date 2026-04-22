<?php

namespace App\Services;

use App\Models\Achievement;
use App\Models\AnnouncementResponse;
use App\Models\User;

class AchievementService
{
    /**
     * Sync achievements for already existing user activity.
     * Полезно, если достижения добавили позже, чем пользователи начали действовать.
     */
    public function sync(User $user): void
    {
        // время регистрации
        $createdAt = $user->created_at;

        // есть хотя бы одно объявление
        if ($user->announcements()->exists()) {
            $this->award($user, 'first_announcement');
        }

        // есть хотя бы один отклик
        if ($user->responses()->exists()) {
            $this->award($user, 'first_response');
        }

        // есть запись в портфолио
        if ($user->portfolioItems()->exists()) {
            $this->award($user, 'first_portfolio_item');
        }

        // оставлял отзывы
        if ($user->reviewsGiven()->exists()) {
            $this->award($user, 'first_review_given');
        }

        // получал отзывы
        if ($user->reviewsReceived()->exists()) {
            $this->award($user, 'first_review_received');
        }

        // есть принятый отклик пользователя
        $hasAcceptedMine = AnnouncementResponse::query()
            ->where('user_id', $user->id)
            ->where('status', 'Принято')
            ->exists();
        if ($hasAcceptedMine) {
            $this->award($user, 'response_accepted');
        }

        // пользователь принимал чужой отклик в своих объявлениях
        $iAcceptedSomeone = AnnouncementResponse::query()
            ->where('status', 'Принято')
            ->whereHas('announcement', function ($q) use ($user) {
                $q->where('user_id', $user->id);
            })
            ->exists();
        if ($iAcceptedSomeone) {
            $this->award($user, 'accepted_someone');
        }

        // месяц на сайте
        if ($createdAt && $createdAt->lte(now()->subMonth())) {
            $this->award($user, 'first_month');
        }

        // пять полученных отзывов
        $receivedCount = $user->reviewsReceived()->count();
        if ($receivedCount >= 5) {
            $this->award($user, 'five_reviews');
        }

        // три записи в портфолио
        $portfolioCount = $user->portfolioItems()->count();
        if ($portfolioCount >= 3) {
            $this->award($user, 'portfolio_three');
        }

        // отзыв с рейтингом 5 звёзд
        $hasFiveStar = $user->reviewsReceived()->where('rating', 5)->exists();
        if ($hasFiveStar) {
            $this->award($user, 'star_rating');
        }
    }

    /**
     * Award achievement by code to user (idempotent).
     */
    public function award(User $user, string $code): bool
    {
        $achievement = Achievement::query()->where('code', $code)->first();
        if (!$achievement) {
            return false;
        }

        $alreadyHas = $user->achievements()
            ->where('achievements.id', $achievement->id)
            ->exists();

        if ($alreadyHas) {
            return false;
        }

        $user->achievements()->attach($achievement->id, [
            'awarded_at' => now(),
        ]);

        // поддерживаем "legacy" поля в users (если где-то используются)
        $earned = $user->achievements()->count();
        $total = Achievement::query()->count();
        $progress = $total > 0 ? (int) round(min(100, ($earned / $total) * 100)) : 0;

        $user->forceFill([
            'achievements_count' => $earned,
            'achievements_progress' => $progress,
        ])->save();

        return true;
    }
}

