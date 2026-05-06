<?php

namespace App\Http\Controllers;

use App\Support\NotificationTargetUrl;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function index()
    {
        $user = auth()->user();

        $notifications = $user->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return view('notifications.index', compact('notifications'));
    }

    public function go(string $id)
    {
        $user = auth()->user();

        $notification = $user->notifications()->where('id', $id)->firstOrFail();
        if (!$notification->read_at) {
            $notification->markAsRead();
        }

        $url = data_get($notification->data, 'url', route('notifications.index'));
        if (!is_string($url) || $url === '') {
            return redirect()->route('notifications.index');
        }

        $url = NotificationTargetUrl::resolve($url);
        if ($url === '/notifications') {
            return redirect()->route('notifications.index');
        }

        if (str_starts_with($url, '/')) {
            return redirect($url);
        }

        $targetHost = parse_url($url, PHP_URL_HOST);
        $targetScheme = parse_url($url, PHP_URL_SCHEME);

        if (
            is_string($targetHost) &&
            is_string($targetScheme) &&
            $targetHost === request()->getHost() &&
            in_array($targetScheme, ['http', 'https'], true)
        ) {
            return redirect($url);
        }

        return redirect()->route('notifications.index');
    }

    public function markAllRead()
    {
        $user = auth()->user();
        $user->unreadNotifications->markAsRead();

        return back()->with('success', 'Уведомления отмечены как прочитанные');
    }
}

