<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\User;
use App\Notifications\AnnouncementStatusUpdated;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AdminController extends Controller
{
    public const ANNOUNCEMENT_STATUSES = ['Новое', 'Одобрено', 'Отклонено'];

    public function __construct()
    {
        $this->middleware('auth');
        $this->middleware(function ($request, $next) {
            if (!Auth::user()->isAdmin()) {
                abort(403, 'Доступ запрещен');
            }
            return $next($request);
        });
    }

    public function index()
    {
        return view('admin.index');
    }

    public function announcementsIndex(Request $request)
    {
        $query = Announcement::with('user')
            ->orderBy('updated_at', 'desc');

        if ($request->filled('search')) {
            $term = mb_strtolower($request->search, 'UTF-8');
            $query->whereRaw('LOWER(title) LIKE ?', ['%' . $term . '%']);  //поиск по шаблону в любой части слова
        }

        $announcements = $query->paginate(20)->withQueryString();

        return view('admin.announcements', compact('announcements'));
    }

    public function usersIndex(Request $request)
    {
        $query = User::withCount('announcements')
            ->orderBy('id');

        // поиск без учета регистра
        if ($request->filled('search')) {
            $term = mb_strtolower($request->search, 'UTF-8');
            $query->whereRaw('LOWER(login) LIKE ?', ['%' . $term . '%']); //поиск по шаблону в любой части слова
        }

        $users = $query->paginate(20)->withQueryString();

        return view('admin.users', compact('users'));
    }

    public function banUser(Request $request, User $user)
    {
        $request->validate([
            'duration_days' => 'required|in:1,7,30',
            'ban_reason' => 'required|string|max:1000',
        ], [
            'duration_days.required' => 'Выберите срок блокировки',
            'duration_days.in' => 'Допустимые значения: 1, 7 или 30 дней',
            'ban_reason.required' => 'Укажите причину блокировки',
            'ban_reason.max' => 'Причина не более 1000 символов',
        ]);

        $bannedUntil = now()->addDays((int) $request->duration_days);

        $user->update([
            'banned_until' => $bannedUntil,
            'ban_reason' => $request->ban_reason,
        ]);

        return redirect()->route('admin.users.index')
            ->with('success', 'Пользователь ' . $user->login . ' заблокирован до ' . $bannedUntil->format('d.m.Y H:i'));
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();

        return redirect()->route('admin.announcements.index')
            ->with('success', 'Объявление успешно удалено!');
    }

    public function updateStatus(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'status' => 'required|in:' . implode(',', self::ANNOUNCEMENT_STATUSES),
        ]);

        $oldStatus = $announcement->status;
        $newStatus = $data['status'];

        if ($oldStatus === $newStatus) {
            return redirect()->route('admin.announcements.index')->with('success', 'Статус объявления обновлён!');
        }

        $announcement->status = $newStatus;
        $announcement->save();

        // Уведомление автору объявления: изменился статус (модерация)
        $announcement->loadMissing('user');
        if ($announcement->user) {
            $announcement->user->notify(new AnnouncementStatusUpdated($announcement, $oldStatus, $newStatus));
        }

        return redirect()->route('admin.announcements.index')->with('success', 'Статус объявления обновлён!');
    }
}
