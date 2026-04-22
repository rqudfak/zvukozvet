<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class CheckBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check() && Auth::user()->isBanned()) {
            $user = Auth::user();
            $until = $user->banned_until->format('d.m.Y H:i');
            $message = 'Ваш аккаунт заблокирован до ' . $until . '.';
            if ($user->ban_reason) {
                $message .= ' Причина: ' . $user->ban_reason;
            }
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors(['login' => $message]);
        }

        return $next($request);
    }
}
