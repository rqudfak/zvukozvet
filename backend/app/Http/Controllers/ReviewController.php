<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementResponse;
use App\Models\Review;
use App\Notifications\NewReviewReceived;
use App\Services\AchievementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReviewController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'announcement_id' => 'required|exists:announcements,id',
            'message' => 'required|string|max:2000',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $announcement = Announcement::findOrFail($data['announcement_id']);

        if ($announcement->user_id !== Auth::id()) {
            abort(403, 'Только автор объявления может оставить отзыв');
        }

        $acceptedResponse = AnnouncementResponse::where('announcement_id', $announcement->id)
            ->where('status', 'Принято')
            ->first();

        if (!$acceptedResponse) {
            return back()->withErrors(['message' => 'Нет принятого отклика по этому объявлению']);
        }

        $reviewedUserId = $acceptedResponse->user_id;

        $exists = Review::where('announcement_id', $announcement->id)->exists();
        if ($exists) {
            return back()->withErrors(['message' => 'По этому объявлению уже оставлен отзыв. Удалите старый, чтобы написать новый.']);
        }

        $review = Review::create([
            'reviewer_id' => Auth::id(),
            'reviewed_user_id' => $reviewedUserId,
            'announcement_id' => $announcement->id,
            'message' => $data['message'],
            'rating' => $data['rating'],
        ]);

        // Уведомление: новый отзыв (переход в профиль на вкладку "Отзывы")
        $reviewedUser = $acceptedResponse->user;
        if ($reviewedUser) {
            $reviewedUser->notify(new NewReviewReceived(Auth::user(), $announcement, (int) $review->rating));
        }

        // Достижения: первый оставленный отзыв / первый полученный отзыв
        $reviewer = Auth::user();
        if ($reviewer && $reviewer->reviewsGiven()->count() === 1) {
            app(AchievementService::class)->award($reviewer, 'first_review_given');
        }

        if ($reviewedUser && $reviewedUser->reviewsReceived()->count() === 1) {
            app(AchievementService::class)->award($reviewedUser, 'first_review_received');
        }

        return back()->with('success', 'Отзыв добавлен');
    }

    public function destroy(Review $review)
    {
        if ($review->reviewer_id !== Auth::id()) {
            abort(403, 'Можно удалить только свой отзыв');
        }

        $review->delete();
        return back()->with('success', 'Отзыв удалён');
    }
}
