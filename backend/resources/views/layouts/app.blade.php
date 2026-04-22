<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title','ЗвукоЦвет')</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200..1000;1,200..1000&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="{{ asset('css/layouts.css') }}">
</head>
<body>
    <header>
        <nav class="header-nav">
        <div class="center">
            <h1><a href="/">ЗвукоЦвет</a></h1>
            <ul class="header-nav-list">
                <li><a href="/">Главная</a></li>
                <li><a href="{{ auth()->check() ? route('profile') : url('/') }}">Профиль</a></li>
                <li><a href="/">О нас</a></li>
                <li><a href="/">Контакты</a></li>
            </ul>
            <ul class="header-nav-auth">
                @auth
                    @if (auth()->user()->role === 'admin')
                        <li><a href="/admin">Админка</a></li>
                    @endif

                    @php
                        $unread = auth()->user()->unreadNotifications()->count();
                        $headerNotifications = auth()->user()->notifications()
                            ->orderBy('created_at', 'desc')
                            ->limit(8)
                            ->get();
                    @endphp

                    <li class="notif">
                        <button type="button" class="notif-btn" id="notifBtn">
                            Уведомления
                            @if($unread > 0)
                                <span class="notif-badge">{{ $unread }}</span>
                            @endif
                        </button>
                        <div class="notif-dropdown" id="notifDropdown" aria-hidden="true">
                            <div class="notif-header">
                                <span class="notif-title">Уведомления</span>
                                <a class="notif-link" href="{{ route('notifications.index') }}">Все</a>
                            </div>
                            <div class="notif-list">
                                @forelse($headerNotifications as $n)
                                    @php
                                        $isUnread = $n->read_at === null;
                                        $message = data_get($n->data, 'message', 'Уведомление');
                                    @endphp
                                    <form method="POST" action="{{ route('notifications.go', $n->id) }}">
                                        @csrf
                                        <button type="submit" class="notif-item notif-item-btn {{ $isUnread ? 'unread' : '' }}">
                                            <span class="notif-item-text">{{ $message }}</span>
                                            <span class="notif-item-date">{{ $n->created_at->format('d.m H:i') }}</span>
                                        </button>
                                    </form>
                                @empty
                                    <div class="notif-empty">Уведомлений пока нет.</div>
                                @endforelse
                            </div>
                        </div>
                    </li>

                    <form method="post" action="{{ route('logout') }}">
                        @csrf
                        <button type="submit" class="btn-auth">Выйти</button>
                    </form>
                    @else
                    <li><a href="/register">Регистрация</a></li>
                    <li><a href="/login">Вход</a></li>
                @endauth
            </ul>
        </div>
        </nav>
    </header>
    
    <main>
        <div class="center">
            @if (session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif
            
            @yield('content')
        </div>
    </main>

    <footer>
        <div class="center">
            <p>2025 год. Все права защищены</p>
        </div>
    </footer>

    <script src="{{ asset('js/security.js') }}" nonce="{{ $cspNonce }}"></script>
    <script src="{{ asset('js/notification.js') }}" nonce="{{ $cspNonce }}"></script>
</body>
</html>