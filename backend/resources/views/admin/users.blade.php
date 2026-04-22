@extends('layouts.app')
@section('title', 'Админ — Пользователи')
@section('content')
<link rel="stylesheet" href="{{ asset('css/admin.css') }}">

<div class="admin-header">
    <h2>Пользователи</h2>
    <div class="admin-tabs">
        <a href="{{ route('admin.index') }}" class="admin-tab">Главная админки</a>
        <a href="{{ route('genres.index') }}" class="admin-tab">Жанры</a>
        <a href="{{ route('admin.announcements.index') }}" class="admin-tab">Объявления</a>
        <a href="{{ route('admin.users.index') }}" class="admin-tab admin-tab-active">Пользователи</a>
    </div>
</div>

<div class="admin-search">
    <form method="GET" action="{{ route('admin.users.index') }}" class="admin-search-form">
        @csrf
        <input type="text" name="search" value="{{ request('search') }}" placeholder="Поиск по логину" class="admin-search-input">
        <button type="submit" class="btn-submit">Найти</button>
    </form>
</div>

<div class="admin-table-container">
    <table class="admin-table">
        <thead>
            <tr>
                <th>ID</th>
                <th>Логин</th>
                <th>Имя</th>
                <th>Почта</th>
                <th>Объявлений</th>
                <th>Блокировка</th>
            </tr>
        </thead>
        <tbody>
            @forelse($users as $user)
                <tr>
                    <td>{{ $user->id }}</td>
                    <td><a href="{{ route('users.show', $user) }}">{{ $user->login }}</a></td>
                    <td>{{ $user->name }}</td>
                    <td>{{ $user->email }}</td>
                    <td>{{ $user->announcements_count }}</td>
                    <td>
                        @if($user->isAdmin())
                            <span class="admin-badge">админ</span>
                        @else
                            @if($user->isBanned())
                                <span class="banned-until" title="{{ $user->ban_reason ? e($user->ban_reason) : '' }}">до {{ $user->banned_until->format('d.m.Y H:i') }}</span>
                            @else
                                <button type="button" class="btn-ban-open" data-ban-url="{{ route('admin.users.ban', $user) }}" data-login="{{ e($user->login) }}">Забанить</button>
                            @endif
                        @endif
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="6" class="text-center">Пользователей нет</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

@if($users->hasPages())
    <div class="admin-pagination">
        {{ $users->links('pagination::numbers') }}
    </div>
@endif

<div class="admin-footer">
    <a href="{{ route('announcements.index') }}" class="btn-back">← Назад на главную</a>
</div>

<!-- Модальное окно бана -->
<div id="ban-modal" class="modal" aria-hidden="true">
    <div class="modal-backdrop" data-modal-close></div>
    <div class="modal-box">
        <div class="modal-header">
            <h3>Забанить пользователя</h3>
            <button type="button" class="modal-close" data-modal-close aria-label="Закрыть">&times;</button>
        </div>
        <form id="ban-form" method="POST" action="">
            @csrf
            <div class="modal-body">
                <p class="modal-ban-login"></p>
                <div class="form-group">
                    <label for="ban_duration_days">Срок блокировки</label>
                    <select id="ban_duration_days" name="duration_days" required>
                        <option value="1">1 день</option>
                        <option value="7">7 дней</option>
                        <option value="30">30 дней</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="ban_reason">Причина блокировки</label>
                    <textarea id="ban_reason" name="ban_reason" rows="3" required maxlength="1000" placeholder="Укажите причину..."></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-cancel" data-modal-close>Отмена</button>
                <button type="submit" class="btn-submit">Забанить</button>
            </div>
        </form>
    </div>
</div>

<script nonce="{{ $cspNonce }}">
(function() {
    var modal = document.getElementById('ban-modal');
    var form = document.getElementById('ban-form');
    var loginEl = modal.querySelector('.modal-ban-login');
    if (!modal || !form) return;

    function openBan(e) {
        var btn = e.target.closest('.btn-ban-open');
        if (!btn) return;
        form.action = btn.getAttribute('data-ban-url');
        loginEl.textContent = 'Пользователь: ' + (btn.getAttribute('data-login') || '');
        modal.classList.add('modal-open');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        modal.classList.remove('modal-open');
        modal.setAttribute('aria-hidden', 'true');
    }

    document.querySelectorAll('.btn-ban-open').forEach(function(b) { b.addEventListener('click', openBan); });
    modal.querySelectorAll('[data-modal-close]').forEach(function(el) { el.addEventListener('click', closeModal); });
    modal.querySelector('.modal-box').addEventListener('click', function(e) { e.stopPropagation(); });
})();
</script>
@endsection
