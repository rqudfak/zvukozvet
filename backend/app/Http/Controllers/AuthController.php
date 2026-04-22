<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function showRegister()
    {
        return view('auth.register');
    }

    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|regex:/^[\p{Cyrillic} ]+$/u',
            'login' => 'required|alpha_num|min:4|unique:users',
            'email' => ['required','email','unique:users',
                function ($attribute, $value, $fail) {
                    // приводим к нижнему регистру для проверки, но сохраняем оригинал
                    $email = strtolower($value);

                    // проверка на специальные символы (разрешенные в email)
                    if (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $value)) {
                        $fail('Email содержит недопустимые символы. Разрешены: буквы, цифры и ._%+-');
                        return;
                    }

                    // Проверка на последовательность специальных символов
                    if (preg_match('/[._%+-]{2,}/', $value)) {
                        $fail('Email не может содержать последовательность специальных символов.');
                        return;
                    }

                    // Проверка начала/конца специальных символов
                    if (preg_match('/^[._%+-]|[._%+-]$/', explode('@', $value)[0])) {
                        $fail('Локальная часть email не может начинаться или заканчиваться специальными символами.');
                    return;
                    }
        
                    $domain = substr($value, strpos($value, '@') + 1);
                    if (strpos($domain, '.') === false) {
                        $fail('Введите корректный email адрес с точкой в домене.');
                    }
                    // Проверка на двойные точки в домене
                    if (strpos($domain, '..') !== false) {
                        $fail('Домен не может содержать двойные точки.');
                    }
                }
            ],
            'password' => 'required|min:6|confirmed',
            'language' => 'string|regex:/^[\p{Cyrillic} ]+$/u',
        ],[
            'name.required' => 'Это поле обязательно для ввода',
            'name.regex' => 'Можно использовать только кириллицу',

            'login.required' => 'Это поле обязательно для ввода',
            'login.alpha_num' => 'Можно использовать только латинские буквы и цифры',
            'login.min' => 'Введите не менее 4 символов',
            'login.unique' => 'Пользователь с таким логином уже существует',

            'email.required' => 'Это поле обязательно для ввода',
            'email.unique' => 'Пользователь с такой почтой уже существует',

            'password.required' => 'Это поле обязательно для ввода',
            'password.min' => 'Введите не менее 6 символов',
            'password.confirmed' => 'Пароли не совпадают',
        ]);
        $user = User::create([
            'name' => $validated['name'],
            'login' => $validated['login'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);
        Auth::login($user);
        return redirect('/')->with('success', 'Вы успешно зарегистрировались!');
    }

    public function showLogin()
    {
        return view('auth.login');
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'login' => 'required',
            'password' => 'required',
        ]);

        // Находим пользователя по логину
        $user = User::where('login', $request->login)->first();

        // Проверяем, существует ли пользователь
        if ($user) {
            // Проверяем, не заблокирован ли аккаунт
            if ($user->isLocked()) {
                $minutes = $user->getLockoutRemainingMinutes();
                $minutes = ceil($minutes);

                return back()->withErrors([
                    'login' => "Слишком много неудачных попыток входа. Аккаунт заблокирован на {$minutes} " . 
                          ($minutes == 1 ? 'минуту' : 'минут') . ".",
                ])->onlyInput('login');
            }
        }

        // Временно запоминаем попытку входа
        if (Auth::validate($credentials)) {
            // Успешная валидация - сбрасываем счетчик попыток
            if ($user) {
                $user->resetLoginAttempts();
            }
        
            // Если у пользователя включена 2FA
            if ($user && $user->two_factor_enabled) {
                // Генерируем и отправляем код
                $user->generateTwoFactorCode();
                $user->notify(new \App\Notifications\SendTwoFactorCode($user->two_factor_code));

                // Запоминаем ID пользователя в сессии
                session(['2fa:user:id' => $user->id]);

                return redirect()->route('2fa.challenge')->with('success', 'Код подтверждения отправлен на вашу почту.');
            }
    
            // Если 2FA не включена, выполняем обычный вход
            if (Auth::attempt($credentials)) {
                $request->session()->regenerate();
                return redirect('/')->with('success', 'Вы успешно вошли в аккаунт!');
            }
        }

        // Неудачная попытка входа
        if ($user) {
            $user->incrementLoginAttempts();
        
            // Проверяем, не заблокирован ли аккаунт после этой попытки
            if ($user->isLocked()) {
                $minutes = $user->getLockoutRemainingMinutes();
                $minutes = ceil($minutes);
            
                return back()->withErrors([
                    'login' => "Слишком много неудачных попыток входа. Аккаунт заблокирован на {$minutes} " . ($minutes == 1 ? 'минуту' : 'минут') . ".",
                ])->onlyInput('login');
            }
        
            $attemptsLeft = User::MAX_LOGIN_ATTEMPTS - $user->login_attempts;
            if ($attemptsLeft > 0) {
                $attemptsWord = $this->getAttemptsWord($attemptsLeft);
            
                return back()->withErrors([
                    'login' => "Неправильный логин или пароль. Осталось попыток: {$attemptsLeft} {$attemptsWord}",
                ])->onlyInput('login');
            }
        }

        return back()->withErrors([
            'login' => 'Неправильный логин или пароль',
        ])->onlyInput('login');
    }

    private function getAttemptsWord($number)
    {
        $number = abs($number);
        $lastDigit = $number % 10;
        $lastTwoDigits = $number % 100;
        
        // Для чисел 11-19 всегда "попыток"
        if ($lastTwoDigits >= 11 && $lastTwoDigits <= 19) {
            return 'попыток';
        }
        // 1 попытка, 21 попытка, 31 попытка и т.д.
        if ($lastDigit == 1) {
            return 'попытка';
        }
        // 2-4 попытки, 22-24 попытки и т.д.
        if ($lastDigit >= 2 && $lastDigit <= 4) {
            return 'попытки';
        }
        // 0, 5-9, 11-19, 20, 25-29 и т.д.
        return 'попыток';
    }

    // Страница ввода кода
    public function showTwoFactorChallenge()
    {
        if (!session()->has('2fa:user:id')) {
            return redirect()->route('login');
        }
        return view('auth.2fa.challenge');
    }

    // Проверка 2FA кода
    public function verifyTwoFactor(Request $request)
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $userId = session('2fa:user:id');
    
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);
    
        // Проверяем код
        if ($user->validateTwoFactorCode($request->code)) {
            Auth::login($user);
            $user->resetTwoFactorCode(); // Очищаем использованный код
            $request->session()->regenerate();
            session()->forget('2fa:user:id');
            session(['2fa_passed' => true]);
            return redirect('/')->with('success', 'Вы успешно вошли в аккаунт!');
        }

        return back()->withErrors([
            'code' => 'Неверный или истёкший код подтверждения'
        ]);
    }

    // Повторная отправка кода
    public function resendTwoFactorCode(Request $request)
    {
        $userId = session('2fa:user:id');
    
        if (!$userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);
    
        // Генерируем новый код
        $user->generateTwoFactorCode();
        $user->notify(new \App\Notifications\SendTwoFactorCode($user->two_factor_code));  //экземпляр класса уведомления

        return back()->with('success', 'Новый код подтверждения отправлен на вашу почту.');
    }

    public function logout(Request $request)
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        return redirect('/')->with('success', 'Вы успешно вышли из аккаунта!');
    }

    public function showForgotPasswordForm()
    {
        return view('auth.forgot-password');
    }

    public function sendResetLinkEmail(Request $request)
    {
        $request->validate([
            'email' => ['required','email','exists:users,email',
                function ($attribute, $value, $fail) {
                    // приводим к нижнему регистру для проверки, но сохраняем оригинал
                    $email = strtolower($value);

                    // проверка на специальные символы (разрешенные в email)
                    if (!preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/', $value)) {
                        $fail('Email содержит недопустимые символы. Разрешены: буквы, цифры и ._%+-');
                        return;
                    }

                    // Проверка на последовательность специальных символов
                    if (preg_match('/[._%+-]{2,}/', $value)) {
                        $fail('Email не может содержать последовательность специальных символов.');
                        return;
                    }

                    // Проверка начала/конца специальных символов
                    if (preg_match('/^[._%+-]|[._%+-]$/', explode('@', $value)[0])) {
                        $fail('Локальная часть email не может начинаться или заканчиваться специальными символами.');
                    return;
                    }
        
                    $domain = substr($value, strpos($value, '@') + 1);
                    if (strpos($domain, '.') === false) {
                        $fail('Введите корректный email адрес с точкой в домене.');
                    }
                    // Проверка на двойные точки в домене
                    if (strpos($domain, '..') !== false) {
                        $fail('Домен не может содержать двойные точки.');
                    }
                }
            ],
        ], [
            'email.required' => 'Это поле обязательно для ввода',
            'email.email' => 'Введите корректный адрес электронной почты',
            'email.exists' => 'Пользователь с такой почтой не найден',
        ]);

        // генерация уникального безопасного токена
        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('status', 'Мы отправили ссылку для сброса пароля на вашу почту.');
        }

        return back()->withErrors([
            'email' => __($status),
        ]);
    }

    public function showResetForm(string $token)
    {
        return view('auth.reset-password', ['token' => $token]);
    }

    public function resetPassword(Request $request)
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => 'required|min:6|confirmed',
        ], [
            'email.required' => 'Это поле обязательно для ввода',
            'email.email' => 'Введите корректный адрес электронной почты',
            'password.required' => 'Это поле обязательно для ввода',
            'password.min' => 'Введите не менее 6 символов',
            'password.confirmed' => 'Пароли не совпадают',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {  //callback-функция, которая выполнится ТОЛЬКО в случае успеха
                $user->forceFill([  //принудительно заполняет модель и обновляет пароль 
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                // событие для логов, уведомлений и т.д.
                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('success', 'Пароль успешно изменён, войдите в аккаунт.')
            : back()->withErrors(['email' => __($status)]);
    }
}
