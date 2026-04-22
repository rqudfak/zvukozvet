<?php

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function show(User $user)
    {
        // синхронизируем достижения по уже существующей активности
        app(AchievementService::class)->sync($user);

        $user->load(['portfolioItems', 'reviewsReceived.reviewer', 'reviewsReceived.announcement', 'achievements']);
        $canEdit = Auth::check() && Auth::id() === $user->id;

        $allAchievements = Achievement::query()->orderBy('id')->get();
        $userAchievementIds = $user->achievements->pluck('id')->all();
        $totalAchievements = $allAchievements->count();
        $earnedAchievements = $user->achievements->count();
        $achievementsProgressPercent = $totalAchievements > 0
            ? (int) round(min(100, ($earnedAchievements / $totalAchievements) * 100))
            : 0;

        $myAnnouncements = collect();
        if ($canEdit) {
            $myAnnouncements = $user->announcements()
                ->withCount([
                    'responses as accepted_responses_count' => function ($q) {
                        $q->where('status', 'Принято');
                    },
                ])
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return view('users.show', compact(
            'user',
            'canEdit',
            'allAchievements',
            'userAchievementIds',
            'totalAchievements',
            'earnedAchievements',
            'achievementsProgressPercent',
            'myAnnouncements'
        ));
    }

    public function edit(User $user)
    {
        if ($user->id !== Auth::id()) {
            abort(403, 'Редактировать можно только свой профиль');
        }

        return view('users.edit', compact('user'));
    }

    public function update(Request $request, User $user)
    {
        if ($user->id !== Auth::id()) {
            abort(403, 'Редактировать можно только свой профиль');
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'gender' => 'required|in:Мужской,Женский,Не указано',
            'language' => 'required|string|max:255',
            'timbre' => 'required|in:Тенор,Баритон,Бас,Сопрано,Меццо-сопрано,Контральто,Не указано',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
        ]);

        if ($request->hasFile('avatar')) {
            if ($user->avatar && $user->avatar !== 'defult.png') {
                Storage::disk('public')->delete('avatars/' . $user->avatar);
            }
            $file = $request->file('avatar');
            $filename = $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
            $file->storeAs('avatars', $filename, 'public');
            $data['avatar'] = $filename;
        } else {
            unset($data['avatar']);
        }

        $user->update($data);

        return redirect()->route('users.show', $user)->with('success', 'Профиль обновлён');
    }
}

