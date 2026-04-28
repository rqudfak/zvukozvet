<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\AdminController;
use App\Http\Controllers\Controller;
use App\Models\Achievement;
use App\Models\Announcement;
use App\Models\AnnouncementResponse;
use App\Models\Genre;
use App\Models\PortfolioItem;
use App\Models\Review;
use App\Notifications\AnnouncementStatusUpdated;
use App\Notifications\NewGenreAdded;
use App\Notifications\NewReviewReceived;
use App\Notifications\NewResponseOnYourAnnouncement;
use App\Notifications\ResponseStatusUpdated;
use App\Models\User;
use App\Services\AchievementService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\PersonalAccessToken;

class MainApiController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|regex:/^[\p{Cyrillic} ]+$/u',
            'login' => 'required|alpha_num|min:4|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6|confirmed',
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'login' => $validated['login'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('frontend')->plainTextToken;

        return response()->json([
            'message' => 'Вы успешно зарегистрировались!',
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required',
            'password' => 'required',
        ]);

        $user = User::query()->where('login', $credentials['login'])->first();
        if (!$user) {
            return response()->json(['message' => 'Неправильный логин или пароль'], 422);
        }

        if ($user->isLocked()) {
            $minutes = ceil($user->getLockoutRemainingMinutes());
            return response()->json([
                'message' => "Слишком много неудачных попыток входа. Аккаунт заблокирован на {$minutes} минут.",
            ], 423);
        }

        if (!Hash::check((string) $credentials['password'], $user->password)) {
            $user->incrementLoginAttempts();
            if ($user->isLocked()) {
                $minutes = ceil($user->getLockoutRemainingMinutes());
                return response()->json([
                    'message' => "Слишком много неудачных попыток входа. Аккаунт заблокирован на {$minutes} минут.",
                ], 423);
            }

            return response()->json(['message' => 'Неправильный логин или пароль'], 422);
        }

        $user->resetLoginAttempts();
        $token = $user->createToken('frontend')->plainTextToken;

        return response()->json([
            'message' => 'Вы успешно вошли в аккаунт!',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ]);

        $status = Password::sendResetLink($request->only('email'));
        if ($status !== Password::RESET_LINK_SENT) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json([
            'message' => 'Мы отправили ссылку для сброса пароля на вашу почту.',
        ]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            return response()->json(['message' => __($status)], 422);
        }

        return response()->json(['message' => 'Пароль успешно изменён.']);
    }

    public function announcements(Request $request)
    {
        $query = Announcement::query()
            ->with('user:id,name')
            ->where('status', 'Одобрено')
            ->whereDoesntHave('responses', function ($q) {
                $q->where('status', 'Принято');
            });

        $types = $request->input('types', []);
        $genres = $request->input('genres', []);

        if (!empty($genres) && is_array($genres)) {
            $typesFromGenres = Genre::query()->whereIn('name', $genres)->pluck('type')->toArray();
            $types = array_values(array_unique(array_merge((array) $types, $typesFromGenres)));
            $query->whereIn('genre', $genres);
        }

        if (!empty($types) && is_array($types)) {
            $query->whereIn('type', $types);
        }

        if ($request->filled('gender')) {
            $query->where('gender', $request->string('gender'));
        }

        if ($request->filled('search')) {
            $term = mb_strtolower($request->string('search')->toString(), 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $term . '%']);
        }

        return response()->json(
            $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString()
        );
    }

    public function announcement(Request $request, Announcement $announcement)
    {
        $user = null;
        $bearerToken = $request->bearerToken();
        if (is_string($bearerToken) && $bearerToken !== '') {
            $accessToken = PersonalAccessToken::findToken($bearerToken);
            if ($accessToken && $accessToken->tokenable instanceof User) {
                $user = $accessToken->tokenable;
            }
        }

        if ($announcement->status !== 'Одобрено') {
            if (!$user || ($user->id !== $announcement->user_id && !$user->isAdmin())) {
                abort(404);
            }
        }

        $announcement->load('user:id,name');

        $responses = collect();
        $userResponse = null;
        $acceptedResponse = null;
        $existingReview = null;

        if ($user) {
            if ($user->id === $announcement->user_id) {
                $responses = $announcement->responses()
                    ->with('user:id,name')
                    ->where('user_id', '!=', $announcement->user_id)
                    ->orderBy('created_at', 'desc')
                    ->get();

                $acceptedResponse = $responses->where('status', 'Принято')->first();
                if ($acceptedResponse) {
                    $existingReview = Review::query()
                        ->where('announcement_id', $announcement->id)
                        ->first();
                }
            } else {
                $userResponse = $announcement->responses()
                    ->with('user:id,name')
                    ->where('user_id', $user->id)
                    ->first();
            }
        }

        return response()->json([
            'announcement' => $announcement,
            'responses' => $responses,
            'user_response' => $userResponse,
            'accepted_response_id' => $acceptedResponse?->id,
            'existing_review' => $existingReview,
            'response_statuses' => AnnouncementResponse::STATUSES,
        ]);
    }

    public function genres()
    {
        return response()->json([
            'all' => Genre::query()->orderBy('type')->orderBy('name')->get(),
            'books' => Genre::query()->where('type', 'Книга')->orderBy('name')->get(),
            'games' => Genre::query()->where('type', 'Видеоигра')->orderBy('name')->get(),
        ]);
    }

    public function userProfile(User $user)
    {
        $user->load([
            'portfolioItems',
            'reviewsReceived.reviewer:id,name',
            'achievements',
        ]);

        $allAchievements = Achievement::query()->orderBy('id')->get();
        $myAnnouncements = $user->announcements()
            ->withCount([
                'responses as accepted_responses_count' => function ($q) {
                    $q->where('status', 'Принято');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $publicAnnouncements = $user->announcements()
            ->where('status', 'Одобрено')
            ->orderBy('created_at', 'desc')
            ->get();

        $myResponses = $user->responses()
            ->with([
                'announcement:id,title,status,created_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'user' => $user,
            'all_achievements' => $allAchievements,
            'my_announcements' => $myAnnouncements,
            'public_announcements' => $publicAnnouncements,
            'my_responses' => $myResponses,
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function createAnnouncement(Request $request)
    {
        if ($request->user()->isBanned()) {
            return response()->json([
                'message' => 'Заблокированные пользователи не могут создавать объявления.',
            ], 403);
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:Книга,Видеоигра',
            'genre' => 'required|string',
            'languages' => 'required|string',
            'gender' => 'required|in:Мужской,Женский',
            'duration' => 'required|in:Кратковременная роль,Долгосрочная роль',
            'description' => 'required|string',
            'fragment' => 'required|string',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['color'] = Announcement::getColorByGenre($validated['genre']);
        $validated['genre_icon'] = Announcement::getIconByGenre($validated['genre']);
        $validated['status'] = 'Новое';

        $announcement = Announcement::query()->create($validated);

        if ($request->user()->announcements()->count() === 1) {
            app(AchievementService::class)->award($request->user(), 'first_announcement');
        }

        return response()->json([
            'message' => 'Объявление отправлено на модерацию!',
            'announcement' => $announcement,
        ], 201);
    }

    public function notifications(Request $request)
    {
        return response()->json(
            $request->user()->notifications()->orderBy('created_at', 'desc')->paginate(20)
        );
    }

    public function notificationGo(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        $url = data_get($notification->data, 'url');
        if (!is_string($url) || $url === '') {
            $url = '/notifications';
        }

        return response()->json(['url' => $url]);
    }

    public function notificationsReadAll(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'Все уведомления отмечены как прочитанные']);
    }

    public function updateUser(Request $request, User $user)
    {
        if ($request->user()->id !== $user->id) {
            return response()->json(['message' => 'Редактировать можно только свой профиль'], 403);
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

        return response()->json([
            'message' => 'Профиль обновлён',
            'user' => $user->fresh(),
        ]);
    }

    public function updateMyProfile(Request $request)
    {
        return $this->updateUser($request, $request->user());
    }

    public function enableTwoFactor(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check((string) $request->input('password'), $request->user()->password)) {
            return response()->json(['message' => 'Неверный пароль'], 422);
        }

        $user = $request->user();
        $user->two_factor_enabled = true;
        $user->save();

        return response()->json(['message' => 'Двухфакторная аутентификация успешно включена!']);
    }

    public function disableTwoFactor(Request $request)
    {
        $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check((string) $request->input('password'), $request->user()->password)) {
            return response()->json(['message' => 'Неверный пароль'], 422);
        }

        $user = $request->user();
        $user->two_factor_enabled = false;
        $user->two_factor_code = null;
        $user->two_factor_expires_at = null;
        $user->save();

        return response()->json(['message' => 'Двухфакторная аутентификация отключена']);
    }

    public function storePortfolio(Request $request, User $user)
    {
        if ($request->user()->id !== $user->id) {
            return response()->json(['message' => 'Можно добавлять записи только в свой профиль'], 403);
        }

        $data = $request->validate([
            'description' => 'nullable|string|max:2000',
            'audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:20480',
        ], [
            'audio.required' => 'Необходимо прикрепить аудиофайл',
        ]);

        $path = $request->file('audio')->store('portfolio', 'public');

        $item = PortfolioItem::query()->create([
            'user_id' => $user->id,
            'audio_path' => $path,
            'description' => $data['description'] ?? null,
        ]);

        if ($request->user()->portfolioItems()->count() === 1) {
            app(AchievementService::class)->award($request->user(), 'first_portfolio_item');
        }

        return response()->json([
            'message' => 'Запись добавлена в портфолио',
            'item' => $item,
        ], 201);
    }

    public function deletePortfolio(Request $request, User $user, PortfolioItem $portfolio_item)
    {
        if ($request->user()->id !== $user->id || $portfolio_item->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Нельзя удалить эту запись'], 403);
        }

        Storage::disk('public')->delete($portfolio_item->audio_path);
        $portfolio_item->delete();

        return response()->json(['message' => 'Запись удалена']);
    }

    public function adminAnnouncements(Request $request)
    {
        $query = Announcement::query()->with('user:id,name')->orderBy('updated_at', 'desc');
        if ($request->filled('search')) {
            $term = mb_strtolower($request->string('search')->toString(), 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $term . '%']);
        }

        return response()->json([
            'items' => $query->paginate(20)->withQueryString(),
            'statuses' => AdminController::ANNOUNCEMENT_STATUSES,
        ]);
    }

    public function adminUsers(Request $request)
    {
        $query = User::query()->withCount('announcements')->orderBy('id');
        if ($request->filled('search')) {
            $term = mb_strtolower($request->string('search')->toString(), 'UTF-8');
            $query->whereRaw('LOWER(login) LIKE ?', ['%' . $term . '%']);
        }

        return response()->json($query->paginate(20)->withQueryString());
    }

    public function adminGenres()
    {
        return response()->json([
            'books' => Genre::query()->where('type', 'Книга')->orderBy('name')->get(),
            'games' => Genre::query()->where('type', 'Видеоигра')->orderBy('name')->get(),
        ]);
    }

    public function storeResponse(Request $request, Announcement $announcement)
    {
        if ($request->user()->isBanned()) {
            return response()->json(['message' => 'Заблокированные пользователи не могут оставлять отклики.'], 403);
        }
        if ($announcement->user_id === $request->user()->id) {
            return response()->json(['message' => 'Автор объявления не может откликаться на своё объявление.'], 422);
        }

        $data = $request->validate([
            'message' => 'nullable|string|max:2000',
            'audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:20480',
        ]);

        $exists = AnnouncementResponse::query()
            ->where('announcement_id', $announcement->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($exists) {
            return response()->json(['message' => 'У вас уже есть отклик на это объявление.'], 422);
        }

        $path = $request->file('audio')->store('responses', 'public');
        $response = AnnouncementResponse::query()->create([
            'announcement_id' => $announcement->id,
            'user_id' => $request->user()->id,
            'message' => $data['message'] ?? null,
            'audio_path' => $path,
            'status' => 'Не проверено',
        ]);

        if ($announcement->user_id !== $request->user()->id) {
            $announcement->user->notify(new NewResponseOnYourAnnouncement($announcement, $request->user()));
        }

        if ($request->user()->responses()->count() === 1) {
            app(AchievementService::class)->award($request->user(), 'first_response');
        }

        return response()->json(['message' => 'Отклик отправлен', 'response' => $response], 201);
    }

    public function deleteResponse(Request $request, Announcement $announcement, AnnouncementResponse $response)
    {
        if ($response->announcement_id !== $announcement->id) {
            abort(404);
        }
        if ($response->user_id !== $request->user()->id) {
            abort(403);
        }
        if ($response->status === 'Принято') {
            return response()->json(['message' => 'Принятый отклик нельзя удалить.'], 422);
        }

        if ($response->audio_path) {
            Storage::disk('public')->delete($response->audio_path);
        }
        $response->delete();

        return response()->json(['message' => 'Отклик удалён']);
    }

    public function updateResponseStatus(Request $request, Announcement $announcement, AnnouncementResponse $response)
    {
        if ($response->announcement_id !== $announcement->id) {
            abort(404);
        }
        if ($announcement->user_id !== $request->user()->id) {
            abort(403);
        }

        $data = $request->validate([
            'status' => 'required|in:' . implode(',', AnnouncementResponse::STATUSES),
        ]);

        $wasAccepted = $response->status === 'Принято';
        $oldStatus = $response->status;
        $response->status = $data['status'];
        $response->save();

        if ($response->user_id) {
            $response->user->notify(new ResponseStatusUpdated($announcement, $response, $oldStatus, $response->status));
        }

        if (!$wasAccepted && $response->status === 'Принято') {
            app(AchievementService::class)->award($response->user, 'response_accepted');
            app(AchievementService::class)->award($request->user(), 'accepted_someone');
        }

        return response()->json(['message' => 'Статус отклика обновлён']);
    }

    public function adminUpdateAnnouncementStatus(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'status' => 'required|in:' . implode(',', AdminController::ANNOUNCEMENT_STATUSES),
        ]);

        $oldStatus = $announcement->status;
        $newStatus = $data['status'];
        $announcement->status = $newStatus;
        $announcement->save();

        $announcement->loadMissing('user');
        if ($oldStatus !== $newStatus && $announcement->user) {
            $announcement->user->notify(new AnnouncementStatusUpdated($announcement, $oldStatus, $newStatus));
        }

        return response()->json(['message' => 'Статус объявления обновлён']);
    }

    public function adminDeleteAnnouncement(Announcement $announcement)
    {
        $announcement->delete();
        return response()->json(['message' => 'Объявление удалено']);
    }

    public function adminBanUser(Request $request, User $user)
    {
        $data = $request->validate([
            'duration_days' => 'required|in:1,7,30',
            'ban_reason' => 'required|string|max:1000',
        ]);

        $bannedUntil = now()->addDays((int) $data['duration_days']);
        $user->update([
            'banned_until' => $bannedUntil,
            'ban_reason' => $data['ban_reason'],
        ]);

        return response()->json(['message' => 'Пользователь заблокирован']);
    }

    public function adminCreateGenre(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:genres,name',
            'type' => 'required|in:Книга,Видеоигра',
            'color' => 'required|string|max:20',
            'icon' => 'nullable|image|mimes:png,jpg,jpeg,webp,gif|max:2048',
        ]);

        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->move(public_path('images/genres'), $filename);
            $data['icon'] = $filename;
        }

        $genre = Genre::query()->create($data);
        User::query()->select(['id'])->chunkById(200, function ($users) use ($genre) {
            foreach ($users as $currentUser) {
                $currentUser->notify(new NewGenreAdded($genre));
            }
        });

        return response()->json(['message' => 'Жанр добавлен', 'genre' => $genre], 201);
    }

    public function adminUpdateGenre(Request $request, Genre $genre)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255|unique:genres,name,' . $genre->id,
            'type' => 'required|in:Книга,Видеоигра',
            'color' => 'required|string|max:20',
            'icon' => 'nullable|image|mimes:png,jpg,jpeg,webp,gif|max:2048',
        ]);

        if ($request->hasFile('icon')) {
            $file = $request->file('icon');
            $filename = time() . '_' . $file->getClientOriginalName();
            $file->move(public_path('images/genres'), $filename);
            $data['icon'] = $filename;
        }

        $genre->update($data);
        return response()->json(['message' => 'Жанр обновлён', 'genre' => $genre]);
    }

    public function adminDeleteGenre(Genre $genre)
    {
        $genre->delete();
        return response()->json(['message' => 'Жанр удалён']);
    }

    public function storeReview(Request $request)
    {
        $data = $request->validate([
            'announcement_id' => 'required|exists:announcements,id',
            'message' => 'required|string|max:2000',
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $announcement = Announcement::query()->findOrFail($data['announcement_id']);
        if ($announcement->user_id !== $request->user()->id) {
            abort(403, 'Только автор объявления может оставить отзыв');
        }

        $acceptedResponse = AnnouncementResponse::query()
            ->where('announcement_id', $announcement->id)
            ->where('status', 'Принято')
            ->first();

        if (!$acceptedResponse) {
            return response()->json(['message' => 'Нет принятого отклика по этому объявлению'], 422);
        }

        $exists = Review::query()->where('announcement_id', $announcement->id)->exists();
        if ($exists) {
            return response()->json(['message' => 'По этому объявлению уже оставлен отзыв.'], 422);
        }

        $review = Review::query()->create([
            'reviewer_id' => $request->user()->id,
            'reviewed_user_id' => $acceptedResponse->user_id,
            'announcement_id' => $announcement->id,
            'message' => $data['message'],
            'rating' => (int) $data['rating'],
        ]);

        $reviewedUser = $acceptedResponse->user;
        if ($reviewedUser) {
            $reviewedUser->notify(new NewReviewReceived($request->user(), $announcement, (int) $review->rating));
        }

        if ($request->user()->reviewsGiven()->count() === 1) {
            app(AchievementService::class)->award($request->user(), 'first_review_given');
        }
        if ($reviewedUser && $reviewedUser->reviewsReceived()->count() === 1) {
            app(AchievementService::class)->award($reviewedUser, 'first_review_received');
        }

        return response()->json(['message' => 'Отзыв добавлен', 'review' => $review], 201);
    }

    public function deleteReview(Request $request, Review $review)
    {
        if ($review->reviewer_id !== $request->user()->id) {
            abort(403, 'Можно удалить только свой отзыв');
        }

        $review->delete();
        return response()->json(['message' => 'Отзыв удалён']);
    }
}
