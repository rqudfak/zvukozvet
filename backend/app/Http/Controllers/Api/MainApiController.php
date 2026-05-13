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
use App\Notifications\AnnouncementDeletedByAdmin;
use App\Notifications\SendTwoFactorCode;
use App\Notifications\AnnouncementStatusUpdated;
use App\Notifications\NewGenreAdded;
use App\Notifications\NewFollowedAuthorAnnouncement;
use App\Notifications\NewReviewReceived;
use App\Notifications\NewResponseOnYourAnnouncement;
use App\Notifications\ResponseStatusUpdated;
use App\Models\User;
use App\Services\AchievementService;
use Carbon\Carbon;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
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
            'email' => ['required', 'email', 'unique:users',
                function ($attribute, $value, $fail) {
                    if (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $value)) {
                        $fail('Email содержит недопустимые символы. Разрешены: буквы, цифры и ._%+-');

                        return;
                    }

                    if (preg_match('/[._%+-]{2,}/', $value)) {
                        $fail('Email не может содержать последовательность специальных символов.');

                        return;
                    }

                    if (preg_match('/^[._%+-]|[._%+-]$/', explode('@', $value)[0])) {
                        $fail('Локальная часть email не может начинаться или заканчиваться специальными символами.');

                        return;
                    }

                    $domain = substr($value, strpos($value, '@') + 1);
                    if (strpos($domain, '.') === false) {
                        $fail('Введите корректный email адрес с точкой в домене.');
                    }
                    if (strpos($domain, '..') !== false) {
                        $fail('Домен не может содержать двойные точки.');
                    }
                },
            ],
            'password' => 'required|min:6|confirmed',
        ], [
            'name.required' => 'Это поле обязательно для ввода',
            'name.regex' => 'Можно использовать только кириллицу',

            'login.required' => 'Это поле обязательно для ввода',
            'login.alpha_num' => 'Можно использовать только латинские буквы и цифры',
            'login.min' => 'Введите не менее 4 символов',
            'login.unique' => 'Пользователь с таким логином уже существует',

            'email.required' => 'Это поле обязательно для ввода',
            'email.email' => 'Введите корректный email адрес.',
            'email.unique' => 'Пользователь с такой почтой уже существует',

            'password.required' => 'Это поле обязательно для ввода',
            'password.min' => 'Введите не менее 6 символов',
            'password.confirmed' => 'Пароли не совпадают',
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

        if ($user->isBanned()) {
            $until = $user->banned_until?->format('d.m.Y H:i');
            $reason = trim((string) $user->ban_reason);
            $reasonText = $reason !== '' ? $reason : 'причина не указана';

            return response()->json([
                'message' => 'Ваш аккаунт забанен до {$until} по причине "{$reasonText}"',
            ], 403);
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

        if ($user->two_factor_enabled) {
            $user->generateTwoFactorCode();
            $user->notify(new SendTwoFactorCode($user->two_factor_code));

            $pendingToken = Crypt::encryptString(json_encode([
                'user_id' => $user->id,
                'expires_at' => now()->addMinutes(15)->timestamp,
            ], JSON_THROW_ON_ERROR));

            return response()->json([
                'message' => 'Код подтверждения отправлен на вашу почту.',
                'two_factor_required' => true,
                'two_factor_pending_token' => $pendingToken,
            ]);
        }

        $token = $user->createToken('frontend')->plainTextToken;

        return response()->json([
            'message' => 'Вы успешно вошли в аккаунт!',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function verifyLoginTwoFactor(Request $request)
    {
        $request->validate([
            'two_factor_pending_token' => 'required|string',
            'code' => 'required|digits:6',
        ], [
            'two_factor_pending_token.required' => 'Сессия подтверждения недействительна. Войдите снова.',
            'code.required' => 'Введите код из письма.',
            'code.digits' => 'Код должен состоять из 6 цифр.',
        ]);

        $payload = $this->parseLoginTwoFactorPendingToken($request->input('two_factor_pending_token'));
        if ($payload === null) {
            return response()->json([
                'message' => 'Сессия подтверждения истекла или недействительна. Войдите снова.',
            ], 422);
        }

        $user = User::query()->find($payload['user_id']);
        if (!$user || !$user->two_factor_enabled) {
            return response()->json([
                'message' => 'Сессия подтверждения истекла или недействительна. Войдите снова.',
            ], 422);
        }

        if (!$user->validateTwoFactorCode((string) $request->input('code'))) {
            return response()->json([
                'message' => 'Неверный или истёкший код подтверждения.',
                'errors' => [
                    'code' => ['Неверный или истёкший код подтверждения.'],
                ],
            ], 422);
        }

        $user->resetTwoFactorCode();
        $token = $user->createToken('frontend')->plainTextToken;

        return response()->json([
            'message' => 'Вы успешно вошли в аккаунт!',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function resendLoginTwoFactor(Request $request)
    {
        $request->validate([
            'two_factor_pending_token' => 'required|string',
        ], [
            'two_factor_pending_token.required' => 'Сессия подтверждения недействительна. Войдите снова.',
        ]);

        $payload = $this->parseLoginTwoFactorPendingToken($request->input('two_factor_pending_token'));
        if ($payload === null) {
            return response()->json([
                'message' => 'Сессия подтверждения истекла или недействительна. Войдите снова.',
            ], 422);
        }

        $user = User::query()->find($payload['user_id']);
        if (!$user || !$user->two_factor_enabled) {
            return response()->json([
                'message' => 'Сессия подтверждения истекла или недействительна. Войдите снова.',
            ], 422);
        }

        $cacheKey = 'login_2fa_resend:' . $user->id;
        if (Cache::has($cacheKey)) {
            return response()->json([
                'message' => 'Повторная отправка кода возможна не чаще одного раза в минуту. Подождите немного.',
            ], 422);
        }

        Cache::put($cacheKey, true, 60);
        $user->generateTwoFactorCode();
        $user->notify(new SendTwoFactorCode($user->two_factor_code));

        return response()->json([
            'message' => 'Новый код подтверждения отправлен на вашу почту.',
        ]);
    }

    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email|exists:users,email',
        ], [
            'email.required' => 'Это поле обязательно для ввода',
            'email.email' => 'Введите корректный email адрес.',
            'email.exists' => 'Пользователь с такой почтой не зарегистрирован.',
        ]);

        $status = Password::sendResetLink($request->only('email'));
        if ($status !== Password::RESET_LINK_SENT) {
            $message = match ($status) {
                Password::RESET_THROTTLED => 'Повторная отправка ссылки возможна не чаще одного раза в 10 минут. Попробуйте позже.',
                default => 'Не удалось отправить ссылку. Попробуйте позже.',
            };

            return response()->json(['message' => $message], 422);
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
        ], [
            'token.required' => 'Отсутствует токен сброса пароля.',
            'email.required' => 'Это поле обязательно для ввода',
            'email.email' => 'Введите корректный email адрес.',
            'password.required' => 'Это поле обязательно для ввода',
            'password.min' => 'Введите не менее 6 символов',
            'password.confirmed' => 'Пароли не совпадают',
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
            $message = match ($status) {
                Password::INVALID_TOKEN => 'Ссылка для сброса недействительна или истекла. Запросите новую ссылку на странице восстановления пароля.',
                Password::INVALID_USER => 'Пользователь с таким email не найден.',
                Password::RESET_THROTTLED => 'Слишком много попыток. Попробуйте позже.',
                default => 'Не удалось сменить пароль.',
            };

            return response()->json(['message' => $message], 422);
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

        $allowedGenders = ['Мужской', 'Женский', 'Детский'];
        $gendersFromForm = array_values(array_filter((array) $request->input('genders', []), static fn ($v) => is_string($v) && $v !== ''));
        $gendersLegacy = $request->filled('gender') ? [$request->string('gender')->toString()] : [];
        $genders = array_values(array_unique(array_merge($gendersFromForm, $gendersLegacy)));
        $genders = array_values(array_intersect($allowedGenders, $genders));
        if ($genders !== []) {
            $query->whereIn('gender', $genders);
        }

        $allowedTimbres = Announcement::TIMBRE_VALUES;
        $timbresFromForm = array_values(array_filter((array) $request->input('timbres', []), static fn ($v) => is_string($v) && $v !== ''));
        $timbresFromForm = array_values(array_intersect($allowedTimbres, $timbresFromForm));
        if ($timbresFromForm !== []) {
            $query->where(function ($q) use ($timbresFromForm) {
                foreach ($timbresFromForm as $timbre) {
                    $q->orWhereJsonContains('timbres', $timbre);
                }
            });
        }

        if ($request->filled('search')) {
            $term = mb_strtolower($request->string('search')->toString(), 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $term . '%']);
        }

        $paginator = $query->orderBy('created_at', 'desc')->paginate(10)->withQueryString();
        $iconsByGenreName = Genre::query()
            ->whereIn('name', $paginator->getCollection()->pluck('genre')->unique()->filter()->all())
            ->pluck('icon', 'name');
        $paginator->getCollection()->transform(function (Announcement $announcement) use ($iconsByGenreName) {
            $this->hydrateAnnouncementGenreIcon($announcement, $iconsByGenreName);
            if ($announcement->timbres === null) {
                $announcement->setAttribute('timbres', ['Не указано']);
            }

            return $announcement;
        });

        return response()->json($paginator);
    }

    private function hydrateAnnouncementGenreIcon(Announcement $announcement, $iconsByGenreName = null): void
    {
        if ($iconsByGenreName !== null) {
            $icon = $iconsByGenreName->get($announcement->genre);
        } else {
            $icon = Genre::query()->where('name', $announcement->genre)->value('icon');
        }
        if ($icon) {
            $announcement->setAttribute('genre_icon', $icon);
        }
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
        $this->hydrateAnnouncementGenreIcon($announcement);
        if ($announcement->timbres === null) {
            $announcement->setAttribute('timbres', ['Не указано']);
        }

        $responses = collect();
        $userResponse = null;
        $existingReview = null;

        if ($user) {
            if ($user->id === $announcement->user_id) {
                $responses = $announcement->responses()
                    ->with('user:id,name,avatar')
                    ->where('user_id', '!=', $announcement->user_id)
                    ->orderBy('created_at', 'desc')
                    ->get();

                if ($responses->where('status', 'Принято')->isNotEmpty()) {
                    $existingReview = Review::query()
                        ->where('announcement_id', $announcement->id)
                        ->first();
                }
            } else {
                $userResponse = $announcement->responses()
                    ->with('user:id,name,avatar')
                    ->where('user_id', $user->id)
                    ->first();
            }
        }

        $acceptedResponseId = AnnouncementResponse::query()
            ->where('announcement_id', $announcement->id)
            ->where('status', 'Принято')
            ->value('id');

        return response()->json([
            'announcement' => $announcement,
            'responses' => $responses,
            'user_response' => $userResponse,
            'accepted_response_id' => $acceptedResponseId,
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

    public function userProfile(Request $request, User $user)
    {
        $user->load([
            'portfolioItems',
            'reviewsReceived.reviewer:id,name,avatar',
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
            ->withCount([
                'responses as accepted_responses_count' => function ($q) {
                    $q->where('status', 'Принято');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $myResponses = $user->responses()
            ->with([
                'announcement' => function ($query) {
                    $query->withCount([
                        'responses as accepted_responses_count' => function ($q) {
                            $q->where('status', 'Принято');
                        },
                    ]);
                },
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        $viewer = null;
        $bearerToken = $request->bearerToken();
        if (is_string($bearerToken) && $bearerToken !== '') {
            $accessToken = PersonalAccessToken::findToken($bearerToken);
            if ($accessToken && $accessToken->tokenable instanceof User) {
                $viewer = $accessToken->tokenable;
            }
        }

        $isFollowing = false;
        if ($viewer && $viewer->id !== $user->id) {
            $isFollowing = $viewer->followingUsers()->where('followed_id', $user->id)->exists();
        }

        $subscriptionsCount = $user->followingUsers()->count();
        $subscribersCount = $user->followersUsers()->count();

        $subscriptions = $user->followingUsers()
            ->select('users.id', 'users.name', 'users.avatar')
            ->orderBy('users.name')
            ->get();

        $subscribers = $user->followersUsers()
            ->select('users.id', 'users.name', 'users.avatar')
            ->orderBy('users.name')
            ->get();

        $subscriptionsAnnouncements = collect();
        if ($viewer && $viewer->id === $user->id) {
            $subscriptionsAnnouncements = Announcement::query()
                ->with('user:id,name')
                ->whereIn('user_id', $user->followingUsers()->select('users.id'))
                ->where('status', 'Одобрено')
                ->whereDoesntHave('responses', function ($q) {
                    $q->where('status', 'Принято');
                })
                ->orderBy('created_at', 'desc')
                ->get();
        }

        return response()->json([
            'user' => $user,
            'all_achievements' => $allAchievements,
            'my_announcements' => $myAnnouncements,
            'public_announcements' => $publicAnnouncements,
            'my_responses' => $myResponses,
            'is_following' => $isFollowing,
            'subscriptions_count' => $subscriptionsCount,
            'subscribers_count' => $subscribersCount,
            'subscriptions' => $subscriptions,
            'subscriptions_announcements' => $subscriptionsAnnouncements,
            'subscribers' => $subscribers,
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
            'gender' => 'required|in:Мужской,Женский,Детский',
            'duration' => 'required|in:Кратковременная роль,Долгосрочная роль',
            'description' => 'required|string',
            'fragment' => 'required|string',
            'timbres' => 'nullable|array',
            'timbres.*' => 'string|in:' . implode(',', Announcement::TIMBRE_VALUES),
        ]);

        $timbresInput = $validated['timbres'] ?? [];
        unset($validated['timbres']);
        $validated['timbres'] = Announcement::normalizeTimbres($timbresInput);

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

    public function updateAnnouncement(Request $request, Announcement $announcement)
    {
        if ($request->user()->isBanned()) {
            return response()->json([
                'message' => 'Заблокированные пользователи не могут редактировать объявления.',
            ], 403);
        }

        if ($announcement->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'У вас нет прав для редактирования этого объявления.',
            ], 403);
        }

        if ($announcement->responses()->where('status', 'Принято')->exists()) {
            return response()->json([
                'message' => 'Нельзя редактировать объявление с принятым откликом.',
            ], 403);
        }

        $messages = [
            'title.required' => 'Укажите название объявления.',
            'title.max' => 'Название не должно превышать 255 символов.',
            'type.required' => 'Выберите тип.',
            'type.in' => 'Тип должен быть «Книга» или «Видеоигра».',
            'genre.required' => 'Выберите жанр.',
            'languages.required' => 'Укажите языки.',
            'gender.required' => 'Выберите голос озвучивания.',
            'gender.in' => 'Выберите голос: Мужской, Женский или Детский.',
            'duration.required' => 'Выберите длительность роли.',
            'duration.in' => 'Выберите «Кратковременная роль» или «Долгосрочная роль».',
            'description.required' => 'Введите описание.',
            'fragment.required' => 'Введите текст для озвучивания.',
            'timbres.array' => 'Тембры должны быть переданы списком.',
            'timbres.*.in' => 'Выбран недопустимый тембр.',
        ];

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'type' => 'required|in:Книга,Видеоигра',
            'genre' => 'required|string',
            'languages' => 'required|string',
            'gender' => 'required|in:Мужской,Женский,Детский',
            'duration' => 'required|in:Кратковременная роль,Долгосрочная роль',
            'description' => 'required|string',
            'fragment' => 'required|string',
            'timbres' => 'nullable|array',
            'timbres.*' => 'string|in:' . implode(',', Announcement::TIMBRE_VALUES),
        ], $messages);

        $timbresInput = $validated['timbres'] ?? [];
        unset($validated['timbres']);
        $validated['timbres'] = Announcement::normalizeTimbres($timbresInput);

        $validated['color'] = Announcement::getColorByGenre($validated['genre']);
        $validated['genre_icon'] = Announcement::getIconByGenre($validated['genre']);
        $validated['status'] = 'Новое';

        $announcement->update($validated);
        $announcement->refresh();
        $this->hydrateAnnouncementGenreIcon($announcement);

        return response()->json([
            'message' => 'Объявление обновлено и повторно отправлено на модерацию.',
            'announcement' => $announcement,
        ]);
    }

    public function deleteAnnouncement(Request $request, Announcement $announcement)
    {
        if ($request->user()->isBanned()) {
            return response()->json([
                'message' => 'Заблокированные пользователи не могут удалять объявления.',
            ], 403);
        }

        if ($announcement->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'У вас нет прав для удаления этого объявления.',
            ], 403);
        }

        $announcement->delete();

        return response()->json([
            'message' => 'Объявление успешно удалено!',
        ]);
    }

    public function notifications(Request $request)
    {
        $paginator = $request->user()->notifications()->orderBy('created_at', 'desc')->paginate(10);

        return response()->json(array_merge(
            $paginator->toArray(),
            ['unread_total' => $request->user()->unreadNotifications()->count()],
        ));
    }

    public function notificationGo(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->firstOrFail();
        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        $url = data_get($notification->data, 'url');
        if (!is_string($url) || $url === '') {
            return response()->json(['url' => '/notifications']);
        }

        try {
            $parts = parse_url($url);
            $path = (is_array($parts) && isset($parts['path']) && is_string($parts['path'])) ? $parts['path'] : '';
            if ($path !== '' && preg_match('#/announcements/(\d+)(?:/|$|\?|#)#', $path, $matches)) {
                $announcementId = (int) $matches[1];
                if ($announcementId > 0 && !Announcement::query()->whereKey($announcementId)->exists()) {
                    return response()->json(['url' => '/notifications']);
                }
            }
        } catch (\Throwable) {
            // не меняем ссылку при любой ошибке разбора/проверки
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
            'timbre' => 'required|in:Тенор,Баритон,Бас,Дискант,Альт,Сопрано,Меццо-сопрано,Контральто,Не указано',
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
        ], [
            'password.required' => 'Введите текущий пароль.',
            'password.string' => 'Пароль указан в неверном формате.',
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
        ], [
            'password.required' => 'Введите текущий пароль.',
            'password.string' => 'Пароль указан в неверном формате.',
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

    public function adminStatistics(Request $request)
    {
        $preset = $request->query('preset', 'month');
        $allowedPresets = ['week', 'month', 'year', 'custom'];
        if (! in_array($preset, $allowedPresets, true)) {
            $preset = 'month';
        }

        $now = Carbon::now();

        if ($preset === 'custom') {
            $validated = $request->validate([
                'from' => 'required|date',
                'to' => 'required|date',
            ]);
            $from = Carbon::parse($validated['from'])->startOfDay();
            $to = Carbon::parse($validated['to'])->endOfDay();
            if ($from->greaterThan($to)) {
                return response()->json(['message' => 'Дата «с» не может быть позже «по»'], 422);
            }
        } else {
            $to = $now->copy()->endOfDay();
            $from = match ($preset) {
                'week' => $now->copy()->subDays(7)->startOfDay(),
                'month' => $now->copy()->subDays(30)->startOfDay(),
                'year' => $now->copy()->subDays(365)->startOfDay(),
                default => $now->copy()->subDays(30)->startOfDay(),
            };
        }

        $usersTotal = User::query()->count();

        $usersRegisteredInPeriod = User::query()
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $announcementsTotal = Announcement::query()
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $announcementsCompleted = Announcement::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereHas('responses', function ($q) {
                $q->where('status', 'Принято');
            })
            ->count();

        $announcementsUncompleted = Announcement::query()
            ->whereBetween('created_at', [$from, $to])
            ->whereDoesntHave('responses', function ($q) {
                $q->where('status', 'Принято');
            })
            ->count();

        $topGenres = Announcement::query()
            ->selectRaw('genre, COUNT(*) as cnt')
            ->whereBetween('created_at', [$from, $to])
            ->whereNotNull('genre')
            ->where('genre', '!=', '')
            ->groupBy('genre')
            ->orderByDesc('cnt')
            ->limit(12)
            ->get()
            ->map(fn ($row) => [
                'genre' => $row->genre,
                'count' => (int) $row->cnt,
            ]);

        return response()->json([
            'period' => [
                'preset' => $preset,
                'from' => $from->toIso8601String(),
                'to' => $to->toIso8601String(),
                'from_date' => $from->format('Y-m-d'),
                'to_date' => $to->format('Y-m-d'),
            ],
            'users_total' => $usersTotal,
            'users_registered_in_period' => $usersRegisteredInPeriod,
            'announcements_total' => $announcementsTotal,
            'announcements_completed' => $announcementsCompleted,
            'announcements_uncompleted' => $announcementsUncompleted,
            'top_genres' => $topGenres,
        ]);
    }

    public function adminAnnouncements(Request $request)
    {
        $query = Announcement::query()
            ->with('user:id,name')
            ->orderByRaw("CASE WHEN status = 'Новое' THEN 0 ELSE 1 END")
            ->orderBy('updated_at', 'desc');
        if ($request->filled('search')) {
            $term = mb_strtolower($request->string('search')->toString(), 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $term . '%']);
        }

        return response()->json([
            'items' => $query->paginate(10)->withQueryString(),
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

        return response()->json($query->paginate(10)->withQueryString());
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

        if ($announcement->status !== 'Одобрено') {
            return response()->json([
                'message' => 'Объявление снято с публикации или на модерации, отклики не принимаются.',
            ], 422);
        }

        if ($announcement->responses()->where('status', 'Принято')->exists()) {
            return response()->json([
                'message' => 'Объявление закрыто: по нему уже принят отклик, новые отклики не принимаются.',
            ], 422);
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

        $acceptedOther = AnnouncementResponse::query()
            ->where('announcement_id', $announcement->id)
            ->where('status', 'Принято')
            ->where('id', '!=', $response->id)
            ->exists();
        if ($acceptedOther) {
            return response()->json(['message' => 'Объявление закрыто, удалить отклик нельзя.'], 422);
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

        $acceptedResponseId = AnnouncementResponse::query()
            ->where('announcement_id', $announcement->id)
            ->where('status', 'Принято')
            ->value('id');
        if (
            $acceptedResponseId !== null &&
            (int) $acceptedResponseId !== (int) $response->id &&
            $data['status'] !== $response->status
        ) {
            return response()->json([
                'message' => 'По этому объявлению уже есть принятый отклик. Статусы других откликов менять нельзя.',
            ], 422);
        }

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
            if ($newStatus === 'Одобрено') {
                $followers = $announcement->user->followersUsers()->select('users.id')->get();
                foreach ($followers as $follower) {
                    $follower->notify(new NewFollowedAuthorAnnouncement($announcement, $announcement->user));
                }
            }
        }

        return response()->json(['message' => 'Статус объявления обновлён']);
    }

    public function adminDeleteAnnouncement(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'reason' => 'required|in:' . implode(',', [
                AnnouncementDeletedByAdmin::REASON_RULE_VIOLATION,
                AnnouncementDeletedByAdmin::REASON_DUPLICATE,
                AnnouncementDeletedByAdmin::REASON_CATEGORY_MISMATCH,
            ]),
        ]);

        $announcement->loadMissing('user');
        $title = $announcement->title;
        $author = $announcement->user;

        if ($author) {
            $author->notify(new AnnouncementDeletedByAdmin($title, $data['reason']));
        }

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
            'icon' => 'nullable|image|mimes:png,jpg,jpeg,webp,gif,svg|max:2048',
        ], [
            'name.required' => 'Это поле обязательно для ввода',
            'name.unique' => 'Жанр с таким названием уже существует',
            'type.required' => 'Это поле обязательно для ввода',
            'color.required' => 'Это поле обязательно для ввода',
        ]);

        if ($request->hasFile('icon')) {
            $data['icon'] = Genre::storeUploadedIcon($request->file('icon'));
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
            'icon' => 'nullable|image|mimes:png,jpg,jpeg,webp,gif,svg|max:2048',
        ], [
            'name.required' => 'Это поле обязательно для ввода',
            'name.unique' => 'Жанр с таким названием уже существует',
            'type.required' => 'Это поле обязательно для ввода',
            'color.required' => 'Это поле обязательно для ввода',
        ]);

        if ($request->hasFile('icon')) {
            Genre::deleteStoredIcon($genre->icon);
            $data['icon'] = Genre::storeUploadedIcon($request->file('icon'));
        }

        $genre->update($data);
        return response()->json(['message' => 'Жанр обновлён', 'genre' => $genre]);
    }

    public function adminDeleteGenre(Genre $genre)
    {
        Genre::deleteStoredIcon($genre->icon);
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

    public function followUser(Request $request, User $user)
    {
        if ($request->user()->id === $user->id) {
            return response()->json(['message' => 'Нельзя подписаться на самого себя.'], 422);
        }

        $request->user()->followingUsers()->syncWithoutDetaching([$user->id]);

        return response()->json(['message' => 'Вы подписались на пользователя.']);
    }

    public function unfollowUser(Request $request, User $user)
    {
        $request->user()->followingUsers()->detach($user->id);

        return response()->json(['message' => 'Подписка отменена.']);
    }

    /**
     * @return array{user_id: int, expires_at: int}|null
     */
    private function parseLoginTwoFactorPendingToken(?string $token): ?array
    {
        if (!is_string($token) || $token === '') {
            return null;
        }

        try {
            $raw = Crypt::decryptString($token);
            $data = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            return null;
        }

        if (!is_array($data) || !isset($data['user_id'], $data['expires_at'])) {
            return null;
        }

        $userId = (int) $data['user_id'];
        $expiresAt = (int) $data['expires_at'];
        if ($userId < 1 || $expiresAt < 1) {
            return null;
        }

        if (now()->getTimestamp() > $expiresAt) {
            return null;
        }

        return ['user_id' => $userId, 'expires_at' => $expiresAt];
    }
}
