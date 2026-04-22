<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Notifications\SendTwoFactorCode;
use Illuminate\Support\Facades\Auth;

class TwoFactorAuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');  //доступ к этим функциям есть только у аутентифицированных
    }

    // Страница настройки 2FA
    public function show()
    {
        $user = Auth::user();
        return view('auth.2fa.setup', ['user' => $user]);
    }

    // Включение 2FA
    public function enable(Request $request)
    {
        //введенный пароль совпадает с текущим паролем
        $request->validate([
            'password' => 'required|current_password',
        ]);

        $user = Auth::user();
        $user->two_factor_enabled = true;  //поле в бд
        $user->save();

        return redirect()->route('profile')
            ->with('success', 'Двухфакторная аутентификация успешно включена!');
    }

    // Отключение 2FA
    public function disable(Request $request)
    {
        $request->validate([
            'password' => 'required|current_password',
        ]);

        $user = Auth::user();
        $user->two_factor_enabled = false;
        $user->two_factor_code = null;
        $user->two_factor_expires_at = null;
        $user->save();

        return redirect()->route('profile')
            ->with('success', 'Двухфакторная аутентификация отключена');
    }
}
