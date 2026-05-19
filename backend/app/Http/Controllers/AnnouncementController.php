<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementResponse;
use App\Models\Genre;
use App\Models\Review;
use App\Services\AchievementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AnnouncementController extends Controller
{
    public function __construct()  // выполнится при создании объекта
    {
        $this->middleware('auth')->except(['index', 'show']);
    }

    public function index(Request $request)
    {
        $query = Announcement::with('user')
            ->where('status', 'Одобрено')
            // если есть принятый отклик — скрываем с главной
            ->whereDoesntHave('responses', function ($q) {
                $q->where('status', 'Принято');
            });
        
        // типы: при выборе жанра автоматически учитывается тип
        $typeFilter = $request->input('types', []);
        if (is_array($typeFilter) && $typeFilter === []) {
            $typeFilter = [];
        }
        if ($request->has('genres') && is_array($request->genres) && count($request->genres) > 0) {
            $typesFromGenres = Genre::whereIn('name', $request->genres)->distinct()->pluck('type')->toArray();
            $typeFilter = array_values(array_unique(array_merge($typeFilter, $typesFromGenres)));
        }
        if (count($typeFilter) > 0) {
            $query->whereIn('type', $typeFilter);
        }

        // фильтр по жанру (множественный выбор)
        if ($request->has('genres') && is_array($request->genres) && count($request->genres) > 0) {
            $query->whereIn('genre', $request->genres);
        }
        
        // фильтр по полу (одиночный выбор)
        if ($request->has('gender') && $request->gender) {
            $query->where('gender', $request->gender);
        }
        
        // Поиск по названию (без учета регистра)
        if ($request->has('search') && $request->search) {
            $searchTerm = mb_strtolower($request->search, 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $searchTerm . '%']); //поиск по шаблону в любой части слова
        }
        
        // сначала новые (по дате создания)
        $announcements = $query
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(10)
            ->appends($request->query());
        
        // Получаем все жанры для фильтра
        $allGenres = Genre::orderBy('type')->orderBy('name')->get();
        
        return view('welcome', compact('announcements', 'allGenres'));
    }

    public function create()
    {
        if (Auth::user()->isBanned()) {
            abort(403, 'Заблокированные пользователи не могут создавать объявления.');
        }

        $bookGenres = Genre::where('type', 'Книга')->orderBy('name')->get();
        $gameGenres = Genre::where('type', 'Видеоигра')->orderBy('name')->get();

        return view('announcements.create', compact('bookGenres', 'gameGenres'));
    }

    public function store(Request $request)
    {
        if (Auth::user()->isBanned()) {
            abort(403, 'Заблокированные пользователи не могут создавать объявления.');
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

        $validated['user_id'] = Auth::id();
        $validated['color'] = Announcement::getColorByGenre($validated['genre']);
        $validated['genre_icon'] = Announcement::getIconByGenre($validated['genre']);
        $validated['status'] = 'Новое';
        

        $announcement = Announcement::create($validated);

        // Достижение: первое созданное объявление
        $user = Auth::user();
        if ($user && $user->announcements()->count() === 1) {
            app(AchievementService::class)->award($user, 'first_announcement');
        }

        return redirect('/')->with('success', 'Объявление отправлено на модерацию!');
    }

    public function show(Announcement $announcement)
    {
        $announcement->load('user');

        // Если объявление не одобрено, просматривать могут только автор и админ
        if ($announcement->status !== 'Одобрено') {
            if (!Auth::check()) {
                abort(404);
            }
            if (Auth::id() !== $announcement->user_id && !Auth::user()->isAdmin()) {
                abort(404);
            }
        }

        $responses = collect();
        $userResponse = null;

        $acceptedResponse = null;
        $existingReview = null;

        if (Auth::check()) {
            if (Auth::id() === $announcement->user_id) {
                // автор объявления видит все отклики других пользователей
                $responses = $announcement->responses()
                    ->with('user')
                    ->where('user_id', '!=', $announcement->user_id)
                    ->orderBy('created_at', 'desc')
                    ->get();
                $acceptedResponse = $responses->where('status', 'Принято')->first();
                if ($acceptedResponse) {
                    $existingReview = Review::where('announcement_id', $announcement->id)->first();
                }
            } else {
                // обычный пользователь видит только свой отклик (если он есть)
                $userResponse = $announcement->responses()
                    ->where('user_id', Auth::id())
                    ->first();
            }
        }

        return view('announcements.show', compact('announcement', 'responses', 'userResponse', 'acceptedResponse', 'existingReview'));
    }

    public function edit(Announcement $announcement)
    {
        if ($announcement->user_id !== Auth::id()) {
            abort(403, 'У вас нет прав для редактирования этого объявления');
        }
        if ($announcement->responses()->where('status', 'Принято')->exists()) {
            abort(403, 'Нельзя редактировать объявление с принятым откликом.');
        }
        if (Auth::user()->isBanned()) {
            abort(403, 'Заблокированные пользователи не могут редактировать объявления.');
        }

        $bookGenres = Genre::where('type', 'Книга')->orderBy('name')->get();
        $gameGenres = Genre::where('type', 'Видеоигра')->orderBy('name')->get();

        return view('announcements.edit', compact('announcement', 'bookGenres', 'gameGenres'));
    }

    public function update(Request $request, Announcement $announcement)
    {
        if ($announcement->user_id !== Auth::id()) {
            abort(403, 'У вас нет прав для редактирования этого объявления');
        }
        if ($announcement->responses()->where('status', 'Принято')->exists()) {
            abort(403, 'Нельзя редактировать объявление с принятым откликом.');
        }
        if (Auth::user()->isBanned()) {
            abort(403, 'Заблокированные пользователи не могут редактировать объявления.');
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

        $validated['color'] = Announcement::getColorByGenre($validated['genre']);
        $validated['genre_icon'] = Announcement::getIconByGenre($validated['genre']);
        // После редактирования объявление снова отправляется на модерацию
        $validated['status'] = 'Новое';

        $announcement->update($validated);

        return redirect()->route('announcements.show', $announcement)
            ->with('success', 'Объявление обновлено и повторно отправлено на модерацию.');
    }

    public function destroy(Announcement $announcement)
    {
        // Проверка прав: только автор может удалить
        if ($announcement->user_id !== Auth::id()) {
            abort(403, 'У вас нет прав для удаления этого объявления');
        }

        $announcement->delete();

        return redirect('/')->with('success', 'Объявление успешно удалено!');
    }
}
