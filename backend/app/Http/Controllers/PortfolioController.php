<?php

namespace App\Http\Controllers;

use App\Models\PortfolioItem;
use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class PortfolioController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function store(Request $request, User $user)
    {
        if ($user->id !== Auth::id()) {
            abort(403, 'Можно добавлять записи только в свой профиль');
        }

        $data = $request->validate([
            'description' => 'nullable|string|max:2000',
            'audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:20480',
        ], [
            'audio.required' => 'Необходимо прикрепить аудиофайл',
        ]);

        $path = $request->file('audio')->store('portfolio', 'public');

        PortfolioItem::create([
            'user_id' => $user->id,
            'audio_path' => $path,
            'description' => $data['description'] ?? null,
        ]);

        // Достижение: первое портфолио
        $authUser = Auth::user();
        if ($authUser && $authUser->portfolioItems()->count() === 1) {
            app(AchievementService::class)->award($authUser, 'first_portfolio_item');
        }

        return back()->with('success', 'Запись добавлена в портфолио');
    }

    public function destroy(User $user, PortfolioItem $portfolio_item)
    {
        if ($user->id !== Auth::id() || $portfolio_item->user_id !== Auth::id()) {
            abort(403, 'Нельзя удалить эту запись');
        }

        Storage::disk('public')->delete($portfolio_item->audio_path);
        $portfolio_item->delete();

        return back()->with('success', 'Запись удалена');
    }
}
