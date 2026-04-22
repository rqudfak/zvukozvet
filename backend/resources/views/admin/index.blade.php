@extends('layouts.app')
@section('title', 'Админ-панель')
@section('content')
<link rel="stylesheet" href="{{ asset('css/admin.css') }}">

<div class="admin-header">
    <h2>Админ-панель</h2>
</div>

<div class="admin-tabs">
    <a href="{{ route('genres.index') }}" class="admin-tab">Жанры</a>
    <a href="{{ route('admin.announcements.index') }}" class="admin-tab">Объявления</a>
    <a href="{{ route('admin.users.index') }}" class="admin-tab">Пользователи</a>
</div>

<div class="admin-dashboard-info">
    <p>Выберите раздел выше для управления жанрами, объявлениями или пользователями.</p>
</div>

<div class="admin-footer">
    <a href="{{ route('announcements.index') }}" class="btn-back">← Назад на главную</a>
</div>
@endsection
