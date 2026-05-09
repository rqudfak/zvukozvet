<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Models\AnnouncementResponse;
use App\Notifications\NewResponseOnYourAnnouncement;
use App\Notifications\ResponseStatusUpdated;
use App\Services\AchievementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class AnnouncementResponseController extends Controller
{
    public function store(Request $request, Announcement $announcement)
    {
        if (Auth::user()->isBanned()) {
            return back()->withErrors(['audio' => 'Заблокированные пользователи не могут оставлять отклики.']);
        }

        $data = $request->validate([
            'message' => 'nullable|string|max:2000',
            'audio' => 'required|file|mimes:mp3,wav,ogg,m4a|max:20480',
        ], [
            'audio.required' => 'Необходимо прикрепить аудиофайл',
        ]);

        // Проверка на существующий отклик пользователя
        $exists = AnnouncementResponse::where('announcement_id', $announcement->id)
            ->where('user_id', Auth::id())
            ->exists();

        if ($exists) {
            return back()->withErrors(['audio' => 'У вас уже есть отклик на это объявление. Удалите его, чтобы отправить новый.']);
        }

        $path = $request->file('audio')->store('responses', 'public');

        AnnouncementResponse::create([
            'announcement_id' => $announcement->id,
            'user_id' => Auth::id(),
            'message' => $data['message'] ?? null,
            'audio_path' => $path,
            'status' => 'Не проверено',
        ]);

        // Уведомление автору объявления: новый отклик
        if ($announcement->user_id !== Auth::id()) {
            $announcement->user->notify(new NewResponseOnYourAnnouncement($announcement, Auth::user()));
        }

        // Достижение: первый отклик
        $user = Auth::user();
        if ($user && $user->responses()->count() === 1) {
            app(AchievementService::class)->award($user, 'first_response');
        }

        return back()->with('success', 'Отклик отправлен');
    }

    public function destroy(Announcement $announcement, AnnouncementResponse $response)
    {
        if ($response->user_id !== Auth::id()) {
            abort(403, 'Вы не можете удалить этот отклик');
        }

        if ($response->announcement_id !== $announcement->id) {
            abort(404);
        }
        if ($response->status === 'Принято') {
            return back()->withErrors(['audio' => 'Принятый отклик нельзя удалить.']);
        }

        if ($response->audio_path) {
            Storage::disk('public')->delete($response->audio_path);
        }

        $response->delete();

        return back()->with('success', 'Отклик удалён');
    }

    public function updateStatus(Request $request, Announcement $announcement, AnnouncementResponse $response)
    {
        if ($announcement->user_id !== Auth::id()) {
            abort(403, 'Только автор объявления может менять статус откликов');
        }

        if ($response->announcement_id !== $announcement->id) {
            abort(404);
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
            return back()->withErrors([
                'status' => 'По этому объявлению уже есть принятый отклик. Статусы других откликов менять нельзя.',
            ]);
        }

        $wasAccepted = $response->status === 'Принято';
        $oldStatus = $response->status;
        $response->status = $data['status'];
        $response->save();

        // Уведомление пользователю: изменился статус его отклика
        if ($response->user_id) {
            $response->user->notify(new ResponseStatusUpdated($announcement, $response, $oldStatus, $response->status));
        }

        // Достижения при принятии отклика
        if (!$wasAccepted && $response->status === 'Принято') {
            app(AchievementService::class)->award($response->user, 'response_accepted');
            app(AchievementService::class)->award(Auth::user(), 'accepted_someone');
        }

        return back()->with('success', 'Статус отклика обновлён');
    }
}

