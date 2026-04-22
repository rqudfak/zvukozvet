@extends('layouts.app')
@section('title', 'Админ — Объявления')
@section('content')
<link rel="stylesheet" href="{{ asset('css/admin.css') }}">

<div class="admin-header">
    <h2>Объявления</h2>
    <div class="admin-tabs">
        <a href="{{ route('admin.index') }}" class="admin-tab">Главная админки</a>
        <a href="{{ route('genres.index') }}" class="admin-tab">Жанры</a>
        <a href="{{ route('admin.announcements.index') }}" class="admin-tab admin-tab-active">Объявления</a>
        <a href="{{ route('admin.users.index') }}" class="admin-tab">Пользователи</a>
    </div>
</div>

<div class="admin-search">
    <form method="GET" action="{{ route('admin.announcements.index') }}" class="admin-search-form">
        @csrf
        <input type="text" name="search" value="{{ request('search') }}" placeholder="Поиск по названию" class="admin-search-input">
        <button type="submit" class="btn-submit">Найти</button>
    </form>
</div>

<div class="admin-table-container">
    <table class="admin-table">
        <thead>
            <tr>
                <th>Название</th>
                <th>Тип</th>
                <th>Жанр</th>
                <th>Дата создания</th>
                <th>Статус</th>
                <th>Автор</th>
                <th>Действия</th>
            </tr>
        </thead>
        <tbody>
            @forelse($announcements as $announcement)
                <tr>
                    <td>
                        <a href="{{ route('announcements.show', $announcement) }}">{{ $announcement->title }}</a>
                    </td>
                    <td>{{ $announcement->type }}</td>
                    <td>{{ $announcement->genre }}</td>
                    <td>{{ $announcement->created_at->format('d.m.Y H:i') }}</td>
                    <td>
                        <form action="{{ route('admin.announcements.updateStatus', $announcement) }}" method="POST" style="display:inline;">
                            @csrf
                            @method('PATCH')
                            <select name="status" data-auto-submit>
                                @foreach(\App\Http\Controllers\AdminController::ANNOUNCEMENT_STATUSES as $status)
                                    <option value="{{ $status }}" {{ $announcement->status === $status ? 'selected' : '' }}>{{ $status }}</option>
                                @endforeach
                            </select>
                        </form>
                    </td>
                    <td>
                        <a href="{{ route('users.show', $announcement->user) }}">{{ $announcement->user->name }}</a>
                    </td>
                    <td>
                        <form action="{{ route('admin.destroy', $announcement) }}" method="POST" style="display: inline;">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="btn-delete" data-confirm="Удалить объявление?">Удалить</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center">Объявлений нет</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

@if($announcements->hasPages())
    <div class="admin-pagination">
        {{ $announcements->links('pagination::numbers') }}
    </div>
@endif

<div class="admin-footer">
    <a href="{{ route('announcements.index') }}" class="btn-back">← Назад на главную</a>
</div>
@endsection
